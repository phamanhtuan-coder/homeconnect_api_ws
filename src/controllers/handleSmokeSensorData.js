// smokeSensorController.js
const { devices, logs } = require('../models');

/**
 * Xử lý dữ liệu gửi từ máy báo khói (MQ2/AHT20)
 * @param {string | number} deviceId - Mã thiết bị (chuỗi hoặc số)
 * @param {object} data - Dữ liệu gửi lên từ thiết bị
 *   Ví dụ: { type: 'sensorData', gas: 230, temperature: 30.5, humidity: 70 }
 */
exports.handleSmokeSensorData = async (deviceId, data) => {
    try {
        // Tìm trong DB xem thiết bị có tồn tại hay không
        const device = await devices.findOne({ where: { DeviceID: deviceId } });
        if (!device) {
            console.log(`Thiết bị báo khói (ID=${deviceId}) không tồn tại, bỏ qua ghi log.`);
            return;
        }

        // Tạo log ghi nhận
        await logs.create({
            DeviceID: device.DeviceID,
            UserID: device.UserID || null,    // chủ thiết bị, nếu cần
            SpaceID: device.SpaceID || null, // nếu có cột SpaceID
            Action: { fromDevice: true, type: 'smokeSensor' },
            Details: data,                   // lưu toàn bộ dữ liệu cảm biến
            Timestamp: new Date()
        });

        console.log(`Đã ghi log cho thiết bị báo khói (ID=${deviceId}).`);
    } catch (error) {
        console.error(`Lỗi khi xử lý dữ liệu báo khói (ID=${deviceId}):`, error.message);
    }
};
