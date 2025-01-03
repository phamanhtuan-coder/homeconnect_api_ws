const { logs, devices, users, spaces } = require('../models');

// Tạo log mới
exports.createLog = async (req, res) => {
    try {
        const { DeviceID, Action, Details } = req.body;

        // Kiểm tra thiết bị có tồn tại không
        const device = await devices.findByPk(DeviceID);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const log = await logs.create({
            DeviceID,
            UserID: req.user.id,  // Lấy từ token auth
            Action,
            Details
        });

        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy tất cả logs
exports.getAllLogs = async (req, res) => {
    try {
        const allLogs = await logs.findAll({
            include: [
                {
                    model: devices,
                    as: 'Device'
                },
                {
                    model: users,
                    as: 'User'
                },
                {
                    model: spaces,
                    as: 'Space'
                }
            ]
        });
        res.status(200).json(allLogs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy log theo ID
exports.getLogById = async (req, res) => {
    try {
        const log = await logs.findByPk(req.params.id, {
            include: [
                {
                    model: devices,
                    as: 'Device'
                },
                {
                    model: users,
                    as: 'User'
                },
                {
                    model: spaces,
                    as: 'Space'
                }
            ]
        });

        if (!log) {
            return res.status(404).json({ error: 'Log not found' });
        }

        res.status(200).json(log);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy logs theo DeviceID
exports.getLogsByDeviceId = async (req, res) => {
    try {
        const deviceLogs = await logs.findAll({
            where: {
                DeviceID: req.params.deviceId
            },
            include: [
                {
                    model: devices,
                    as: 'Device'
                },
                {
                    model: users,
                    as: 'User'
                }
            ]
        });

        res.status(200).json(deviceLogs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy logs theo SpaceID
exports.getLogsBySpaceId = async (req, res) => {
    try {
        const spaceLogs = await logs.findAll({
            where: {
                SpaceID: req.params.spaceId
            },
            include: [
                {
                    model: spaces,
                    as: 'Space'
                },
                {
                    model: devices,
                    as: 'Device'
                }
            ]
        });

        res.status(200).json(spaceLogs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa log theo ID
exports.deleteLogById = async (req, res) => {
    try {
        const log = await logs.findByPk(req.params.id);
        if (!log) {
            return res.status(404).json({ error: 'Log not found' });
        }

        await log.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
