const WebSocket = require('ws');
const admin = require('../services/FirebaseAdmin');

// Import các model
const {devices, logs, alerts, users} = require('../models');
// Thêm 'alerts' để tạo cảnh báo
const {handleSmokeSensorData} = require("../controllers/handleSmokeSensorData");


// Import EmailService
const { sendEmergencyAlertEmail } = require('../services/EmailService');
const { toggleDeviceWS} = require("../controllers/DeviceController");

const ALERT_TYPES = {
    GAS_HIGH: 1,       // Giả sử AlertTypeID=1: cảnh báo gas
    TEMP_HIGH: 2,      // Giả sử AlertTypeID=2: cảnh báo nhiệt độ
};

const ALERT_MESSAGES = {
    GAS_HIGH: 'KHẨN CẤP! Nồng độ khí quá cao!',
    TEMP_HIGH: 'KHẨN CẤP! Nhiệt độ quá cao!',
};

// Biến cục bộ lưu trữ kết nối WebSocket của từng deviceId
const clients = {};

function initWebSocket(server) {
    const wss = new WebSocket.Server({server});
    wss.on('connection', (ws, req) => {
        // Lấy deviceId từ query URL
        const queryParams = req.url.split('?')[1];  // "deviceId=123"
        const deviceId = queryParams.split('=')[1];
        clients[deviceId] = ws;

        console.log(`Thiết bị ${deviceId} đã kết nối qua WebSocket`);
        // Ping client mỗi 25 giây
        const interval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
                console.log('Gửi ping đến client');
            }
        }, 25000);

        ws.on('pong', () => {
            console.log('Nhận pong từ client');
        });

        // Khi thiết bị gửi message lên
        ws.on('message', async (message) => {
            try {
                // Parse JSON
                const dataFromDevice = JSON.parse(message);
                console.log(`Tin nhắn từ thiết bị ${deviceId}:`, dataFromDevice);

                // Tìm thiết bị trong DB
                const device = await devices.findOne({where: {DeviceID: deviceId}});
                if (!device) {
                    console.log(`Thiết bị ${deviceId} không tồn tại trong DB. Bỏ qua ghi log.`);
                    return;
                }

                // Kiểm tra "type"
                if (dataFromDevice.type === 'smokeSensor' || dataFromDevice.type === 'sensorData') {
                    if (handleSmokeSensorData) {
                        await handleSmokeSensorData(deviceId, dataFromDevice);
                    } else {
                        // Ghi log cơ bản
                        await logs.create({
                            DeviceID: device.DeviceID,
                            UserID: device.UserID || null,
                            SpaceID: device.SpaceID || null,
                            Action: {fromDevice: true, type: 'smokeSensor'},
                            Details: dataFromDevice,
                            Timestamp: new Date()
                        });
                        console.log(`(Sensor) Log cho Thiết bị ${deviceId} đã được ghi vào DB.`);
                    }

                    /**
                     * ======= BỔ SUNG PHẦN KIỂM TRA KHẨN CẤP & TẠO ALERT =======
                     * Ví dụ: gas > 300 và/hoặc temperature > 50 => tạo alert
                     */
                    const gasValue = dataFromDevice.gas;
                    const tempValue = dataFromDevice.temperature;

                    // Cờ đánh dấu có tạo alert hay không
                    let alertCreated = false;

                    // 1) Kiểm tra gas
                    if (typeof gasValue === 'number' && gasValue > 300) {
                        const message = `${ALERT_MESSAGES.GAS_HIGH} (gas = ${gasValue})`;
                        await createAlert(device, ALERT_TYPES.GAS_HIGH, message);
                        alertCreated = true;
                    }

                    // 2) Kiểm tra nhiệt độ
                    if (typeof tempValue === 'number' && tempValue > 50) {
                        const message = `${ALERT_MESSAGES.TEMP_HIGH} (temp = ${tempValue}°C)`;
                        await createAlert(device, ALERT_TYPES.TEMP_HIGH, message);
                        alertCreated = true;
                    }

                    // Nếu muốn, bạn có thể gửi WebSocket lại cho front-end thông báo
                    if (alertCreated) {
                        console.log(`=> Đã tạo Alert cho thiết bị ID=${device.DeviceID}`);
                    }

                } else {
                    // Trường hợp khác
                    await logs.create({
                        DeviceID: device.DeviceID,
                        UserID: device.UserID || null,
                        SpaceID: device.SpaceID || null,
                        Action: {fromDevice: true, type: 'other'},
                        Details: dataFromDevice,
                        Timestamp: new Date()
                    });
                    console.log(`(Khác) Log cho Device ${deviceId} đã được ghi vào DB.`);
                }
            } catch (err) {
                console.error(`Lỗi parse/ghi log cho Device ${deviceId}:`, err.message);
            }
        });

        // Khi thiết bị đóng kết nối
        ws.on('close', async () => {
            console.log(`Thiết bị ${deviceId} ngắt kết nối`);
            delete clients[deviceId];

            try {

                await toggleDeviceWS({
                    params: { id: deviceId },
                    body: { powerStatus: false },
                    user: { id: 0 }  // Hệ thống thực hiện với UserID = 0
                }, {
                    status: () => ({ json: () => {} })
                });

                console.log(`Thiết bị ${deviceId} đã được tắt do mất kết nối.`);
            } catch (error) {
                console.error(`Lỗi khi tắt thiết bị ${deviceId}:`, error.message);
            }
        });


    });
}

/**
 * Hàm gửi lệnh tới thiết bị qua WebSocket.
 * @param {string | number} deviceId - Mã thiết bị (chuỗi hoặc số)
 * @param {object} command - lệnh cần thực hiện
 * @param {string | number} initiatorUserId - Mã người dùng thực hiện lệnh
 *
 */
async function sendToDevice(deviceId, command, initiatorUserId = null) {
    if (clients[deviceId]) {
        clients[deviceId].send(JSON.stringify(command));
        console.log(`Command sent to Device ${deviceId}:`, command);

        try {
            const device = await devices.findOne({where: {DeviceID: deviceId}});
            if (device) {
                await logs.create({
                    DeviceID: device.DeviceID,
                    UserID: initiatorUserId || device.UserID || null,
                    SpaceID: device.SpaceID || null,
                    Action: {fromServer: true, command},
                    Timestamp: new Date()
                });
                console.log(`Yêu cầu log từ Server tới thiết bị ${deviceId} đã được ghi.`);
            }
        } catch (error) {
            console.error(`Lỗi ghi log khi gửi lệnh tới Device ${deviceId}:`, error.message);
        }
    } else {
        console.log(`Thiết bị ${deviceId} hiện không kết nối WebSocket.`);
    }
}


/**
 * Hàm tạo cảnh báo và gửi thông báo FCM cũng như email cảnh báo khẩn cấp
 * @param {object} device - Đối tượng thiết bị
 * @param {number} alertType - Loại cảnh báo (ID)
 * @param {string} messageContent - Nội dung thông điệp cảnh báo
 */
async function createAlert(device, alertType, messageContent) {
    try {
        // Tạo cảnh báo trong cơ sở dữ liệu
        const alert = await alerts.create({
            DeviceID: device.DeviceID,
            SpaceID: device.SpaceID || null,
            TypeID: device.TypeID || null,
            AlertTypeID: alertType,
            Message: messageContent,
            Status: false
        });
        console.log(`*** ALERT: ${messageContent} ở thiết bị ${device.DeviceID}`);

        // Lấy người dùng liên quan đến thiết bị
        const user = await users.findOne({ where: { UserID: device.UserID } });
        if (user) {
            // Gửi thông báo FCM nếu người dùng có DeviceToken
            if (user.DeviceToken) {
                // Cấu trúc payload thông báo
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

                // Gửi thông báo FCM
                const response = await admin.messaging().send(message);
                console.log(`Đã gửi thông báo FCM đến UserID=${user.UserID}:`, response);
            } else {
                console.log(`UserID=${user.UserID} không có DeviceToken.`);
            }

            // Gửi email cảnh báo khẩn cấp nếu người dùng có Email
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
    initWebSocket,
    sendToDevice
};
