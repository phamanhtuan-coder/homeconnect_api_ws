const { devices, devicetypes, spaces, houses, synctracking } = require('../models');
const wsServer = require('../ws/wsServer');

/**
 * Tạo thiết bị mới (Create Device)
 */
exports.createDevice = async (req, res) => {
    try {
        const device = await devices.create(req.body);
        res.status(201).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy tất cả thiết bị (Get All Devices)
 */
exports.getAllDevices = async (req, res) => {
    try {
        const deviceList = await devices.findAll({
            include: [
                {
                    model: devicetypes,
                    as: 'DeviceType'
                },
                {
                    model: spaces,
                    as: 'Space'
                },
                {
                    model: houses,
                    as: 'House'
                }
            ]
        });
        res.status(200).json(deviceList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy thiết bị theo ID (Get Device by ID)
 */
exports.getDeviceById = async (req, res) => {
    try {
        const device = await devices.findByPk(req.params.id, {
            include: [
                {
                    model: devicetypes,
                    as: 'DeviceType'
                },
                {
                    model: spaces,
                    as: 'Space'
                },
                {
                    model: houses,
                    as: 'House'
                },
                {
                    model: synctracking,
                    as: 'SyncStatus'
                }
            ]
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.status(200).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cập nhật thiết bị (Update Device)
 */
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

/**
 * Xóa thiết bị (Delete Device)
 */
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

/**
 * Bật/Tắt thiết bị (Toggle Device Power)
 */
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

/**
 * Lấy thiết bị với bộ lọc (Get Filtered Devices)
 */
exports.getFilteredDevices = async (req, res) => {
    try {
        const { userId, spaceId, houseId, powerStatus } = req.query;

        const whereConditions = {};

        if (userId) {
            whereConditions.UserID = userId;
        }
        if (spaceId) {
            whereConditions.SpaceID = spaceId;
        }
        if (houseId) {
            whereConditions.HouseID = houseId;
        }
        if (powerStatus !== undefined) {
            whereConditions.PowerStatus = powerStatus === 'true';
        }

        const filteredDevices = await devices.findAll({
            where: whereConditions,
            include: [
                {
                    model: devicetypes,
                    as: 'DeviceType'
                },
                {
                    model: spaces,
                    as: 'Space'
                },
                {
                    model: houses,
                    as: 'House'
                }
            ]
        });

        res.status(200).json(filteredDevices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cập nhật độ sáng và màu sắc (Update Device Attributes)
 */
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

        if (supportedAttributes.brightness) {
            device.Attribute.brightness = brightness;
        }
        if (supportedAttributes.color) {
            device.Attribute.color = color;
        }

        await device.update({ Attribute: device.Attribute });

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
