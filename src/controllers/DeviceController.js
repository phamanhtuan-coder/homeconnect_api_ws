const { devices, devicetypes, spaces, houses, sharedpermissions } = require('../models');
const socketServer = require('../ws/socketServer');  // Updated import

/**
 * Create new device
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
 * Link existing device
 */
exports.linkDevice = async (req, res) => {
    try {
        const userId = req.user.id;
        const { deviceId, spaceId, deviceName } = req.body;

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
 * Toggle device power via Socket.IO
 */
exports.toggleDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { powerStatus } = req.body;
        const userId = req.user.id;

        // Find device by DeviceID
        const device = await devices.findOne({ where: { DeviceID: id } });

        if (!device) {
            return res.status(404).json({ error: 'Không tìm thấy thiết bị.' });
        }

        // 1. Check if user is the device owner
        let hasPermission = device.UserID === userId;
        // If system (userId === 0), skip permission check
        if(userId === 0)
            hasPermission = true;

        // 2. If not owner, check sharedpermissions
        if (!hasPermission) {
            const permissionRecord = await sharedpermissions.findOne({
                where: {
                    DeviceID: id,
                    SharedWithUserID: userId
                }
            });
            // If found -> user has permission due to sharing
            if (permissionRecord) {
                hasPermission = true;
            }
        }

        // If user has no permission => error
        if (!hasPermission) {
            return res.status(403).json({ error: 'Không có quyền điều khiển thiết bị này.' });
        }

        // ----- OK, user has permission. Update power status ----- //

        // Update PowerStatus in DB
        await device.update({ PowerStatus: powerStatus });

        // Send command via Socket.IO
        await socketServer.sendToDevice(id, { action: 'toggle', powerStatus }, userId);

        return res.status(200).json({
            message: `Thiết bị đã được ${powerStatus ? 'bật' : 'tắt'}`,
            device
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Update brightness and color attributes
 */
exports.updateDeviceAttributes = async (req, res) => {
    try {
        const { id } = req.params;
        const { brightness, color } = req.body;
        const userId = req.user.id;

        // Find device (with DeviceType to know supported attributes)
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

        // 1. Check if user is device owner
        let hasPermission = device.UserID === userId;

        // 2. If not owner, check sharedpermissions
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

        // If user has no permission => error
        if (!hasPermission) {
            return res.status(403).json({ error: 'Không có quyền điều khiển thiết bị này.' });
        }

        // ------ OK, user has permission. Process attribute update ------ //

        // Check which attributes are supported by the device type
        const supportedAttributes = device.DeviceType.Attributes;
        // e.g., { brightness: true, color: true, ... }

        // device.Attribute is JSON/Obj => read, update, then save
        const currentAttributes = device.Attribute;

        if (supportedAttributes.brightness && typeof brightness !== 'undefined') {
            currentAttributes.brightness = brightness;
        }
        if (supportedAttributes.color && typeof color !== 'undefined') {
            currentAttributes.color = color;
        }

        // Update device in DB
        await device.update({ Attribute: currentAttributes });

        // Send command via Socket.IO
        await socketServer.sendToDevice(device.DeviceID, {
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
 * Get all devices by current user
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
 * Get device info by ID
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
 * Unlink device (Remove UserID but don't delete device)
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

        // Update UserID to null (unlink)
        await device.update({ UserID: null, SpaceID: null });
        res.status(200).json({ message: 'Gỡ liên kết thiết bị thành công' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update device space
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
 * Remove device from space (Keep user link but set SpaceID to null)
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

        // Set SpaceID to null to remove from space
        await device.update({ SpaceID: null });
        res.status(200).json({ message: 'Device removed from space', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update device WiFi settings
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

        // Send update via Socket.IO if device is online
        await socketServer.sendToDevice(device.DeviceID, {
            action: 'updateWifi',
            WifiSSID,
            WifiPassword
        });

        res.status(200).json({ message: 'Device Wifi updated successfully', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};