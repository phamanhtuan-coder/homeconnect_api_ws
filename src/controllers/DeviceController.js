const { devices, devicetypes, spaces, houses } = require('../models');
const wsServer = require('../ws/wsServer');

/**
 * Tạo thiết bị mới (Create Device)
 */
exports.createDevice = async (req, res) => {
    try {
        const userId = req.user.id;
        const { TypeID, SpaceID, Name, Attribute, WifiSSID, WifiPassword } = req.body;

        const deviceType = await devicetypes.findByPk(TypeID);
        if (!deviceType) {
            return res.status(404).json({ error: 'Device type not found' });
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
        const { deviceId } = req.body;

        const device = await devices.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await device.update({ UserID: userId });
        res.status(200).json({ message: 'Device linked successfully', device });
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

        const device = await devices.findOne({ where: { DeviceID: id, UserID: userId } });
        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Cập nhật trạng thái nguồn
        await device.update({ PowerStatus: powerStatus });

        // Gửi lệnh qua WebSocket
        wsServer.sendToDevice(id, {
            action: 'toggle',
            powerStatus
        });

        res.status(200).json({
            message: `Device ${powerStatus ? 'ON' : 'OFF'}`,
            device
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
            where: { DeviceID: id, UserID: userId },
            include: {
                model: devicetypes,
                as: 'DeviceType'
            }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        const supportedAttributes = device.DeviceType.Attributes;

        if (supportedAttributes.brightness) {
            device.Attribute.brightness = brightness;
        }
        if (supportedAttributes.color) {
            device.Attribute.color = color;
        }

        // Cập nhật thiết bị
        await device.update({ Attribute: device.Attribute });

        // Gửi lệnh qua WebSocket
        wsServer.sendToDevice(device.DeviceID, {
            action: 'updateAttributes',
            brightness,
            color
        });

        res.status(200).json({
            message: 'Device attributes updated successfully',
            device
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
            return res.status(404).json({ error: 'Device not found or access denied' });
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
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Cập nhật UserID về null (gỡ liên kết)
        await device.update({ UserID: null });
        res.status(200).json({ message: 'Device unlinked successfully' });
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
