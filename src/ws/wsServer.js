const WebSocket = require('ws');

// Import các model
const { devices, logs, alerts } = require('../models');
// Thêm 'alerts' để tạo cảnh báo
const { handleSmokeSensorData } = require("../controllers/handleSmokeSensorData");

// Tạo một "enum" (hoặc object) để quản lý AlertTypeID, Message
// Bạn có thể tuỳ chỉnh ID & nội dung theo bảng alerttypes thực tế:
const ALERT_TYPES = {
    GAS_HIGH: 1,       // Giả sử AlertTypeID=1: cảnh báo gas
    TEMP_HIGH: 2,      // Giả sử AlertTypeID=2: cảnh báo nhiệt độ
};

const ALERT_MESSAGES = {
    GAS_HIGH: 'Nồng độ khí quá cao',
    TEMP_HIGH: 'Nhiệt độ quá cao',
};

const wss = new WebSocket.Server({ port: 4000 });

// Biến cục bộ lưu trữ kết nối WebSocket của từng deviceId
const clients = {};

wss.on('connection', (ws, req) => {
    // Lấy deviceId từ query URL
    const queryParams = req.url.split('?')[1];  // "deviceId=123"
    const deviceId = queryParams.split('=')[1];
    clients[deviceId] = ws;

    console.log(`Thiết bị ${deviceId} đã kết nối qua WebSocket`);

    // Khi thiết bị gửi message lên
    ws.on('message', async (message) => {
        try {
            // Parse JSON
            const dataFromDevice = JSON.parse(message);
            console.log(`Tin nhắn từ thiết bị ${deviceId}:`, dataFromDevice);

            // Tìm thiết bị trong DB
            const device = await devices.findOne({ where: { DeviceID: deviceId } });
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
                        Action: { fromDevice: true, type: 'smokeSensor' },
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
                    await alerts.create({
                        DeviceID: device.DeviceID,
                        SpaceID: device.SpaceID || null,
                        TypeID: device.TypeID || null, // nếu device có cột TypeID
                        AlertTypeID: ALERT_TYPES.GAS_HIGH,
                        Message: `${ALERT_MESSAGES.GAS_HIGH} (gas = ${gasValue})`,
                        // Timestamp mặc định = now (theo model)
                        Status: false // false = chưa xử lý
                    });
                    console.log(`*** ALERT: KHÍ GAS CAO ở thiết bị ${device.DeviceID}, nồng độ khí gas = ${gasValue}`);
                    alertCreated = true;
                }

                // 2) Kiểm tra nhiệt độ
                if (typeof tempValue === 'number' && tempValue > 50) {
                    await alerts.create({
                        DeviceID: device.DeviceID,
                        SpaceID: device.SpaceID || null,
                        TypeID: device.TypeID || null,
                        AlertTypeID: ALERT_TYPES.TEMP_HIGH,
                        Message: `${ALERT_MESSAGES.TEMP_HIGH} (temp = ${tempValue}°C)`,
                        Status: false
                    });
                    console.log(`*** ALERT: NHIỆT ĐỘ CAO ở thiết bị ${device.DeviceID}, nhiệt độ = ${tempValue}°C`);
                    alertCreated = true;
                }

                // Nếu muốn, bạn có thể gửi WebSocket lại cho front-end thông báo
                if (alertCreated) {
                    // Ví dụ: Thông báo cục bộ
                    // (Nếu bạn có front-end cũng kết nối WS, cần tách logic server <-> device, server <-> frontend)
                    console.log(`=> Đã tạo Alert cho thiết bị ID=${device.DeviceID}`);
                }

            } else {
                // Trường hợp khác
                await logs.create({
                    DeviceID: device.DeviceID,
                    UserID: device.UserID || null,
                    SpaceID: device.SpaceID || null,
                    Action: { fromDevice: true, type: 'other' },
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
    ws.on('close', () => {
        console.log(`Thiết bị ${deviceId} ngắt kết nối`);
        delete clients[deviceId];
    });
});

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
        console.log(`Thiết bị ${deviceId} hiện không kết nối WebSocket.`);
    }
}

module.exports = {
    wss,
    sendToDevice
};
