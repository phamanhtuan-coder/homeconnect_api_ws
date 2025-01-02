const { devices, devicetypes } = require('../models');
const wsServer = require('../ws/wsServer');

// Tạo thiết bị
exports.createDevice = async (req, res) => {
    try {
        const device = await devices.create(req.body);
        res.status(201).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy tất cả thiết bị
exports.getAllDevices = async (req, res) => {
    try {
        const deviceList = await devices.findAll();
        res.status(200).json(deviceList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy thiết bị theo ID
exports.getDeviceById = async (req, res) => {
    try {
        const device = await devices.findByPk(req.params.id);
        if (!device) return res.status(404).json({ error: 'Device not found' });
        res.status(200).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Cập nhật thiết bị
exports.updateDeviceById = async (req, res) => {
    try {
        const device = await devices.findByPk(req.params.id);
        if (!device) return res.status(404).json({ error: 'Device not found' });

        await device.update(req.body);
        res.status(200).json(device);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Xóa thiết bị
exports.deleteDeviceById = async (req, res) => {
    try {
        const device = await devices.findByPk(req.params.id);
        if (!device) return res.status(404).json({ error: 'Device not found' });

        await device.destroy();
        res.status(200).json({ message: 'Device deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Bật/Tắt thiết bị qua WebSocket
exports.toggleDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { powerStatus } = req.body;

        const device = await devices.findByPk(id);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        await device.update({ PowerStatus: powerStatus });
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

// Lấy danh sách thiết bị với bộ lọc
exports.getFilteredDevices = async (req, res) => {
    try {
        const { userId, spaceId, powerStatus } = req.query;

        const whereConditions = {};

        if (userId) {
            whereConditions.UserID = userId;
        }
        if (spaceId) {
            whereConditions.SpaceID = spaceId;
        }
        if (powerStatus !== undefined) {
            whereConditions.PowerStatus = powerStatus === 'true';
        }

        const filteredDevices = await devices.findAll({
            where: whereConditions
        });

        res.status(200).json(filteredDevices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Chỉnh độ sáng và màu sắc
exports.updateDeviceAttributes = async (req, res) => {
    try {
        const { id } = req.params;
        const { brightness, color } = req.body;

        const device = await devices.findByPk(id, {
            include: {
                model: devicetypes,
                as: 'DeviceType'
            }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const supportedAttributes = device.DeviceType.Attributes;

        // Kiểm tra thiết bị có hỗ trợ brightness và color không
        if (supportedAttributes.brightness) {
            device.Attribute.brightness = brightness;
        }
        if (supportedAttributes.color) {
            device.Attribute.color = color;
        }

        // Cập nhật lại thuộc tính
        await device.update({ Attribute: device.Attribute });

        // Gửi lệnh qua WebSocket nếu thiết bị đang kết nối
        wsServer.sendToDevice(device.DeviceID, {
            action: 'updateAttributes',
            brightness: brightness,
            color: color
        });

        res.status(200).json({
            message: 'Device attributes updated successfully',
            device
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
