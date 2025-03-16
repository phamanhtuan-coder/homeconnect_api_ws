const { Server } = require('socket.io');
const admin = require('../services/FirebaseAdmin');

// Import models
const { devices, logs, alerts, users } = require('../models');
const { handleSmokeSensorData } = require("../controllers/handleSmokeSensorData");

// Import EmailService
const { sendEmergencyAlertEmail } = require('../services/EmailService');
function getToggleDevice() {
    return require("../controllers/DeviceController").toggleDevice;
}

const ALERT_TYPES = {
    GAS_HIGH: 1,       // AlertTypeID=1: gas alert
    TEMP_HIGH: 2,      // AlertTypeID=2: temperature alert
};

const ALERT_MESSAGES = {
    GAS_HIGH: 'KHẨN CẤP! Nồng độ khí quá cao!',
    TEMP_HIGH: 'KHẨN CẤP! Nhiệt độ quá cao!',
};

// Store socket connections for each deviceId
const deviceClients = {};
// Store mobile clients
const mobileClients = {};

function initSocketIO(server) {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        pingTimeout: 30000,    // 30 seconds
        pingInterval: 25000    // 25 seconds
    });

    // Namespace for devices
    const deviceNamespace = io.of('/device');

    // Namespace for mobile clients
    const clientNamespace = io.of('/client');

    // Device connections
    deviceNamespace.on('connection', (socket) => {
        const deviceId = socket.handshake.query.deviceId;

        if (!deviceId) {
            console.log('Connection attempt without deviceId');
            socket.disconnect();
            return;
        }

        console.log(`Thiết bị ${deviceId} đã kết nối qua Socket.IO`);

        // Store the socket connection
        deviceClients[deviceId] = socket;

        // Emit device_connect event to client namespace
        clientNamespace.emit('device_connect', { deviceId });

        // Listen for sensor data from device
        socket.on('sensorData', async (data) => {
            try {
                console.log(`Dữ liệu từ thiết bị ${deviceId}:`, data);

                // Find device in DB
                const device = await devices.findOne({ where: { DeviceID: deviceId } });
                if (!device) {
                    console.log(`Thiết bị ${deviceId} không tồn tại trong DB. Bỏ qua ghi log.`);
                    return;
                }

                // Process smoke sensor data
                if (data.type === 'smokeSensor' || data.type === 'sensorData') {
                    if (handleSmokeSensorData) {
                        await handleSmokeSensorData(deviceId, data);
                    } else {
                        // Basic logging
                        await logs.create({
                            DeviceID: device.DeviceID,
                            UserID: device.UserID || null,
                            SpaceID: device.SpaceID || null,
                            Action: { fromDevice: true, type: 'smokeSensor' },
                            Details: data,
                            Timestamp: new Date()
                        });
                        console.log(`(Sensor) Log cho Thiết bị ${deviceId} đã được ghi vào DB.`);
                    }

                    // Check for alerts
                    const gasValue = data.gas;
                    const tempValue = data.temperature;

                    let alertCreated = false;

                    // Gas check
                    if (typeof gasValue === 'number' && gasValue > 500) {
                        const message = `${ALERT_MESSAGES.GAS_HIGH} (gas = ${gasValue})`;
                        await createAlert(device, ALERT_TYPES.GAS_HIGH, message);
                        alertCreated = true;
                    }

                    // Temperature check
                    if (typeof tempValue === 'number' && tempValue > 40) {
                        const message = `${ALERT_MESSAGES.TEMP_HIGH} (temp = ${tempValue}°C)`;
                        await createAlert(device, ALERT_TYPES.TEMP_HIGH, message);
                        alertCreated = true;
                    }

                    if (alertCreated) {
                        console.log(`=> Đã tạo Alert cho thiết bị ID=${device.DeviceID}`);
                    }

                    // Send real-time data to mobile clients that are listening
                    emitRealtimeData(deviceId, data);

                } else {
                    // Other case
                    await logs.create({
                        DeviceID: device.DeviceID,
                        UserID: device.UserID || null,
                        SpaceID: device.SpaceID || null,
                        Action: { fromDevice: true, type: 'other' },
                        Details: data,
                        Timestamp: new Date()
                    });
                    console.log(`(Khác) Log cho Device ${deviceId} đã được ghi vào DB.`);
                }
            } catch (err) {
                console.error(`Lỗi parse/ghi log cho Device ${deviceId}:`, err.message);
            }
        });

        // Listen for online status from device
        socket.on('device_online', () => {
            clientNamespace.emit('device_online', { deviceId });
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log(`Thiết bị ${deviceId} ngắt kết nối`);
            delete deviceClients[deviceId];

            // Emit disconnection event
            clientNamespace.emit('device_disconnect', { deviceId });

            try {
                const toggleDevice = getToggleDevice();
                await toggleDevice({
                    params: { id: deviceId },
                    body: { powerStatus: false },
                    user: { id: 0 }  // System performs with UserID = 0
                }, {
                    status: () => ({ json: () => {} })
                });

                console.log(`Thiết bị ${deviceId} đã được tắt do mất kết nối.`);
            } catch (error) {
                console.error(`Lỗi khi tắt thiết bị ${deviceId}:`, error.message);
            }
        });
    });

    // Mobile client connections
    clientNamespace.on('connection', (socket) => {
        console.log('Mobile client connected');

        // Store client for broadcasting
        const clientId = socket.id;
        mobileClients[clientId] = { socket, listeningDevices: new Set() };

        // Handle real-time data request
        socket.on('start_real_time_device', (data) => {
            const { deviceId } = data;
            if (deviceId) {
                console.log(`Client ${clientId} started listening to device ${deviceId}`);
                mobileClients[clientId].listeningDevices.add(deviceId);

                // If device is already connected, emit online status
                if (deviceClients[deviceId]) {
                    socket.emit('device_online', { deviceId });
                }
            }
        });

        // Handle stop listening for real-time data
        socket.on('stop_real_time_device', (data) => {
            const { deviceId } = data;
            if (deviceId && mobileClients[clientId]) {
                console.log(`Client ${clientId} stopped listening to device ${deviceId}`);
                mobileClients[clientId].listeningDevices.delete(deviceId);
            }
        });

        // Handle client disconnect
        socket.on('disconnect', () => {
            console.log(`Mobile client ${clientId} disconnected`);
            delete mobileClients[clientId];
        });
    });
}

/**
 * Function to emit real-time data to subscribed clients
 */
function emitRealtimeData(deviceId, data) {
    // Format data for clients
    const realtimeData = {
        serial: deviceId,
        data: {
            val: data
        }
    };

    // Send to all clients who are listening to this device
    Object.values(mobileClients).forEach(client => {
        if (client.listeningDevices.has(deviceId)) {
            client.socket.emit('realtime_device_value', realtimeData);
        }
    });
}

/**
 * Function to send commands to devices via Socket.IO
 */
async function sendToDevice(deviceId, command, initiatorUserId = null) {
    if (deviceClients[deviceId]) {
        deviceClients[deviceId].emit('command', command);
        console.log(`Command sent to Device ${deviceId}:`, command);

        try {
            const device = await devices.findOne({ where: { DeviceID: deviceId } });
            if (device) {
                await logs.create({
                    DeviceID: device.DeviceID,
                    UserID: initiatorUserId || device.UserID || null,
                    SpaceID: device.SpaceID || null,
                    Action: { fromServer: true, command },
                    Timestamp: new Date()
                });
                console.log(`Yêu cầu log từ Server tới thiết bị ${deviceId} đã được ghi.`);
            }
        } catch (error) {
            console.error(`Lỗi ghi log khi gửi lệnh tới Device ${deviceId}:`, error.message);
        }
    } else {
        console.log(`Thiết bị ${deviceId} hiện không kết nối Socket.IO.`);
    }
}

/**
 * Function to create alerts and send FCM notifications and emergency emails
 */
async function createAlert(device, alertType, messageContent) {
    try {
        // Create alert in database
        const alert = await alerts.create({
            DeviceID: device.DeviceID,
            SpaceID: device.SpaceID || null,
            TypeID: device.TypeID || null,
            AlertTypeID: alertType,
            Message: messageContent,
            Status: false
        });
        console.log(`*** ALERT: ${messageContent} ở thiết bị ${device.DeviceID}`);

        // Get user related to device
        const user = await users.findOne({ where: { UserID: device.UserID } });
        if (user) {
            // Send FCM notification if user has DeviceToken
            if (user.DeviceToken) {
                const message = {
                    token: user.DeviceToken,
                    notification: {
                        title: 'Cảnh báo từ thiết bị',
                        body: messageContent,
                    },
                    data: {
                        deviceId: device.DeviceID.toString(),
                        alertType: alertType.toString(),
                    },
                };

                // Send FCM notification
                const response = await admin.messaging().send(message);
                console.log(`Đã gửi thông báo FCM đến UserID=${user.UserID}:`, response);
            } else {
                console.log(`UserID=${user.UserID} không có DeviceToken.`);
            }

            // Send emergency alert email if user has Email
            if (user.Email) {
                await sendEmergencyAlertEmail(user.Email, messageContent);
            } else {
                console.log(`UserID=${user.UserID} không có địa chỉ Email.`);
            }
        } else {
            console.log(`UserID=${device.UserID} không tồn tại.`);
        }

        return alert;
    } catch (error) {
        console.error(`Lỗi khi tạo alert cho DeviceID=${device.DeviceID}:`, error);
        throw error;
    }
}

module.exports = {
    initSocketIO,
    sendToDevice
};