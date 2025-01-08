const WebSocket = require('ws');

// Import các model cần thiết
// Lưu ý: Đường dẫn import tuỳ thuộc cấu trúc dự án của bạn
const { devices, logs } = require('../models');
const {handleSmokeSensorData} = require("../controllers/handleSmokeSensorData");
// Nếu cần DeviceType, Spaces, ... thì import thêm
// const { devicetypes, spaces, users, ... } = require('../models');

const wss = new WebSocket.Server({ port: 4000 });

// Biến cục bộ lưu trữ kết nối WebSocket của từng deviceId
const clients = {};

/**
 * Sự kiện khi có kết nối từ phía thiết bị
 * Thông thường, thiết bị sẽ kết nối với URL dạng: ws://<server>:4000?deviceId=<id>
 * Ở đây ta tạm giả sử client đã kết nối với URL: ws://localhost:4000?deviceId=123
 * => req.url = "/?deviceId=123"
 */
wss.on('connection', (ws, req) => {
    // Lấy deviceId từ query URL, ví dụ: ws://server:4000?deviceId=123
    const queryParams = req.url.split('?')[1];  // "deviceId=123"
    // Hoặc dùng URLSearchParams an toàn hơn:
    // const urlParams = new URLSearchParams(queryParams);
    // const deviceId = urlParams.get('deviceId');

    const deviceId = queryParams.split('=')[1];
    clients[deviceId] = ws;

    console.log(`Device ${deviceId} connected via WebSocket`);

    // Khi thiết bị gửi message lên
    ws.on('message', async (message) => {
        try {
            // Parse JSON
            const dataFromDevice = JSON.parse(message);
            console.log(`Message from Device ${deviceId}:`, dataFromDevice);

            // Tìm thiết bị trong DB để biết có tồn tại không
            const device = await devices.findOne({ where: { DeviceID: deviceId } });
            if (!device) {
                console.log(`Device ${deviceId} không tồn tại trong DB. Bỏ qua ghi log.`);
                return;
            }

            // Kiểm tra "type" để biết đây là data của máy báo khói/sensor hay thiết bị khác
            if (dataFromDevice.type === 'smokeSensor' || dataFromDevice.type === 'sensorData') {
                // 1) Gọi hàm xử lý riêng cho máy báo khói/sensor (nếu bạn tách logic)
                //    Bên trong handleSmokeSensorData có thể tự ghi logs,
                //    hoặc bạn có thể ghi logs tại đây tùy ý.
                if (handleSmokeSensorData) {
                    await handleSmokeSensorData(deviceId, dataFromDevice);
                } else {
                    // Nếu bạn không tách hàm, ghi log trực tiếp tại đây
                    await logs.create({
                        DeviceID: device.DeviceID,
                        UserID: device.UserID || null,
                        SpaceID: device.SpaceID || null,
                        Action: { fromDevice: true, type: 'smokeSensor' },
                        Details: dataFromDevice,
                        Timestamp: new Date()
                    });
                    console.log(`(Sensor) Log cho Device ${deviceId} đã được ghi vào DB.`);
                }
            } else {
                // 2) Trường hợp khác (ví dụ: LED, ack, các loại action khác)
                //    Bạn vẫn muốn ghi log? Tuỳ logic
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
        console.log(`Device ${deviceId} disconnected`);
        delete clients[deviceId];
    });
});

/**
 * Hàm gửi lệnh tới thiết bị qua WebSocket.
 * @param {number} deviceId - Mã thiết bị
 * @param {object} command - Nội dung lệnh gửi (ví dụ { action: 'toggle', powerStatus: true })
 * @param {number} [initiatorUserId] - (tuỳ chọn) ID user đã ra lệnh (nếu cần ghi log chính xác hơn)
 */
async function sendToDevice(deviceId, command, initiatorUserId = null) {
    if (clients[deviceId]) {
        // Gửi command qua WebSocket
        clients[deviceId].send(JSON.stringify(command));
        console.log(`Command sent to Device ${deviceId}:`, command);

        try {
            // Ghi log cho lệnh này
            const device = await devices.findOne({ where: { DeviceID: deviceId } });
            if (device) {
                await logs.create({
                    DeviceID: device.DeviceID,
                    // Nếu có user ra lệnh, bạn ghi user đó vào, không thì ghi user chủ device
                    UserID: initiatorUserId || device.UserID || null,
                    SpaceID: device.SpaceID || null,
                    Action: { fromServer: true, command },
                    // có thể bọc command trong Action hoặc trong Details
                    Timestamp: new Date()
                });
                console.log(`Log command từ Server tới Device ${deviceId} đã được ghi.`);
            }
        } catch (error) {
            console.error(`Lỗi ghi log khi gửi lệnh tới Device ${deviceId}:`, error.message);
        }
    } else {
        console.log(`Device ${deviceId} hiện không kết nối WebSocket.`);
    }
}

// Export cả wss và hàm sendToDevice
module.exports = {
    wss,
    sendToDevice
};
