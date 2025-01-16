const { devices, devicetypes, spaces, houses, sharedpermissions  } = require('../models');
const wsServer = require('../ws/wsServer');
const { sequelize } = require('sequelize'); // Thêm Sequelize vào đây
/**
 * Tạo thiết bị mới (Create Device)
 */
exports.createDevice = async (req, res) => {
    try {
        const userId = req.user.id;
        const { TypeID, SpaceID, Name, Attribute, WifiSSID, WifiPassword } = req.body;

        const deviceType = await devicetypes.findByPk(TypeID);
        if (!deviceType) {
            return res.status(404).json({ error: 'Thiết bị không được tìm thấy' });
        }

        const device = await devices.create({
            TypeID,
            SpaceID,
            UserID: userId,
            Name,
            PowerStatus: false,
            Attribute,
            WifiSSID,
            WifiPassword
        });

        res.status(201).json({ message: 'Device created successfully', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Liên kết thiết bị đã tồn tại (Link Device)
 */
exports.linkDevice = async (req, res) => {
    try {
        const userId = req.user.id;
        const { deviceId, spaceId, deviceName } = req.body;  // Added spaceId and deviceName to the body extraction

        const device = await devices.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({ error: 'Thiết bị không được tìm thấy' });
        }

        // Update device with UserID, SpaceID, and Name
        await device.update({
            UserID: userId,
            SpaceID: spaceId,
            Name: deviceName
        });

        res.status(200).json({ message: 'Thiết bị liên kết thành công', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


/**
 * Bật/Tắt thiết bị qua WebSocket (Toggle Device Power)
 */
exports.toggleDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { powerStatus } = req.body;
        const userId = req.user.id;

        // Tìm thiết bị theo DeviceID và userId
        // (Chưa kết luận là userId có quyền hay không, vì có thể userId không phải chủ)
        const device = await devices.findOne({ where: { DeviceID: id } });

        if (!device) {
            return res.status(404).json({ error: 'Không tìm thấy thiết bị.' });
        }

        // 1. Kiểm tra nếu user là chủ của thiết bị
        let hasPermission = device.UserID === userId;

        // 2. Nếu không phải chủ, kiểm tra sharedpermissions
        if (!hasPermission) {
            const permissionRecord = await sharedpermissions.findOne({
                where: {
                    DeviceID: id,
                    SharedWithUserID: userId
                }
            });
            // Nếu tìm thấy -> user có quyền do được chia sẻ
            if (permissionRecord) {
                hasPermission = true;
            }
        }

        // Nếu user không có quyền => báo lỗi
        if (!hasPermission) {
            return res.status(403).json({ error: 'Không có quyền điều khiển thiết bị này.' });
        }

        // ----- OK, người dùng có quyền. Cập nhật trạng thái nguồn ----- //

        // Cập nhật PowerStatus trong DB
        await device.update({ PowerStatus: powerStatus });

        // Gửi lệnh qua WebSocket
        await wsServer.sendToDevice(id, { action: 'toggle', powerStatus }, userId);

        return res.status(200).json({
            message: `Thiết bị đã được ${powerStatus ? 'bật' : 'tắt'}`,
            device
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


/**
 * Điều chỉnh độ sáng và màu sắc (Update Brightness and Color)
 */
exports.updateDeviceAttributes = async (req, res) => {
    try {
        const { id } = req.params;
        const { brightness, color } = req.body;
        const userId = req.user.id;

        const device = await devices.findOne({
            where: { DeviceID: id },
            include: {
                model: devicetypes,
                as: 'DeviceType'
            }
        });

        if (!device) {
            return res.status(404).json({ error: 'Không tìm thấy thiết bị.' });
        }

        let hasPermission = device.UserID === userId;

        if (!hasPermission) {
            const permissionRecord = await sharedpermissions.findOne({
                where: {
                    DeviceID: id,
                    SharedWithUserID: userId
                }
            });
            if (permissionRecord) {
                hasPermission = true;
            }
        }

        if (!hasPermission) {
            return res.status(403).json({ error: 'Không có quyền điều khiển thiết bị này.' });
        }

        // Chạy trực tiếp câu lệnh SQL để cập nhật Attribute
        const updateQuery = `UPDATE devices SET Attribute = '{"brightness":${brightness},"color":"${color}"}' WHERE DeviceID = ${id}`;
        await sequelize.query(updateQuery, { type: sequelize.QueryTypes.UPDATE });

        await wsServer.sendToDevice(device.DeviceID, {
            action: 'updateAttributes',
            brightness,
            color
        }, userId);

        return res.status(200).json({
            message: 'Cập nhật thuộc tính thiết bị thành công',
            device
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};







/**
 * Lấy tất cả thiết bị của người dùng hiện tại
 */
exports.getAllDevicesByUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const deviceList = await devices.findAll({
            where: { UserID: userId },
            include: [
                { model: devicetypes, as: 'DeviceType' },
                { model: spaces, as: 'Space' },
                { model: houses, as: 'House' }
            ]
        });

        res.status(200).json(deviceList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy thông tin thiết bị theo ID
 */
exports.getDeviceById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const device = await devices.findOne({
            where: { DeviceID: id, UserID: userId },
            include: [
                { model: devicetypes, as: 'DeviceType' },
                { model: spaces, as: 'Space' }
            ]
        });

        if (!device) {
            return res.status(404).json({ error: 'Thiết bị không được tìm thấy hoặc không có quyền truy cập' });
        }

        res.status(200).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


/**
 * Gỡ liên kết thiết bị (Unlink Device from User)
 * Xóa UserID của thiết bị nhưng không xóa thiết bị
 */
exports.unlinkDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const device = await devices.findOne({
            where: { DeviceID: id, UserID: userId }
        });

        if (!device) {
            return res.status(404).json({ error: 'Thiết bị không được tìm thấy hoặc không có quyền truy cập' });
        }

        // Cập nhật UserID về null (gỡ liên kết)
        await device.update({ UserID: null, SpaceID: null });
        res.status(200).json({ message: 'Gỡ liên kết thiết bị thành công' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cập nhật phòng của thiết bị (Update Device Space)
 */
exports.updateDeviceSpace = async (req, res) => {
    try {
        const { id } = req.params;
        const { spaceId } = req.body;
        const userId = req.user.id;

        const device = await devices.findOne({
            where: { DeviceID: id, UserID: userId }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        await device.update({ SpaceID: spaceId });
        res.status(200).json({ message: 'Device space updated successfully', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Xóa thiết bị khỏi phòng (Remove Device from Space)
 * Giữ liên kết với User nhưng SpaceID trở về null
 */
exports.removeDeviceFromSpace = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const device = await devices.findOne({
            where: { DeviceID: id, UserID: userId }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Đặt SpaceID thành null để xóa khỏi phòng
        await device.update({ SpaceID: null });
        res.status(200).json({ message: 'Device removed from space', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cập nhật thông tin Wifi của thiết bị (Update Wifi Settings)
 */
exports.updateDeviceWifi = async (req, res) => {
    try {
        const { id } = req.params;
        const { WifiSSID, WifiPassword } = req.body;
        const userId = req.user.id;

        const device = await devices.findOne({
            where: { DeviceID: id, UserID: userId }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        await device.update({ WifiSSID, WifiPassword });

        // Gửi cập nhật qua WebSocket nếu thiết bị đang trực tuyến
        wsServer.sendToDevice(device.DeviceID, {
            action: 'updateWifi',
            WifiSSID,
            WifiPassword
        });

        res.status(200).json({ message: 'Device Wifi updated successfully', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
