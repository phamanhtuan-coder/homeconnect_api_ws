const { logs, devices, users, spaces } = require('../models');
const { Op, Sequelize } = require('sequelize');
// Tạo log mới
exports.createLog = async (req, res) => {
    try {
        const { DeviceID, Action, Details } = req.body;

        // Kiểm tra thiết bị có tồn tại không và lấy SpaceID từ thiết bị
        const device = await devices.findOne({
            where: { DeviceID },
            attributes: ['DeviceID', 'SpaceID']  // Chỉ lấy DeviceID và SpaceID
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Tạo log mới với SpaceID từ thiết bị
        const log = await logs.create({
            DeviceID,
            SpaceID: device.SpaceID,
            UserID: req.user.id,
            Action,
            Details
        }, {
            fields: ['DeviceID', 'SpaceID', 'UserID', 'Action', 'Details', 'Timestamp']  // Chỉ thêm các cột có sẵn
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
                    as: 'user'
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
                    as: 'user'
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

/**
 * Lấy tất cả log theo UserID (Get Logs by UserID)
 */
exports.getLogsByUser = async (req, res) => {
    try {
        const userId = req.user.id;

        // Tìm tất cả logs của người dùng
        const userLogs = await logs.findAll({
            where: { UserID: userId },
            include: [
                {
                    model: devices,
                    as: 'Device',
                    attributes: ['DeviceID', 'Name']
                },
                {
                    model: spaces,
                    as: 'Space',
                    attributes: ['SpaceID', 'Name']
                },
                {
                    model: users,
                    as: 'user',  // Sửa từ 'User' thành 'user'
                    attributes: ['UserID', 'Name']
                }
            ],
            order: [['Timestamp', 'DESC']]  // Sắp xếp log theo thời gian mới nhất
        });

        if (userLogs.length === 0) {
            return res.status(404).json({ message: 'No logs found for this user' });
        }

        res.status(200).json(userLogs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



// Lấy log gần nhất của thiết bị
exports.getLatestLogByDevice = async (req, res) => {
    try {
        const latestLog = await logs.findOne({
            where: { DeviceID: req.params.deviceId },
            order: [['Timestamp', 'DESC']]
        });
        res.status(200).json(latestLog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const { Op, Sequelize } = require('sequelize');

// Lấy log cập nhật thuộc tính gần nhất
exports.getLatestUpdateAttributesLog = async (req, res) => {
    try {
        const { deviceId } = req.params;

        const latestLog = await logs.findOne({
            where: {
                DeviceID: deviceId,
                [Op.and]: [
                    Sequelize.literal("JSON_EXTRACT(Action, '$.fromServer') = true"),
                    Sequelize.literal("JSON_EXTRACT(Action, '$.command.action') = 'updateAttributes'")
                ]
            },
            order: [['Timestamp', 'DESC']]
        });

        if (!latestLog) {
            return res.status(404).json({ message: 'Không tìm thấy log cập nhật thuộc tính.' });
        }

        res.status(200).json(latestLog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy log trạng thái bật/tắt gần nhất
exports.getLatestToggleLog = async (req, res) => {
    try {
        const { deviceId } = req.params;

        const latestLog = await logs.findOne({
            where: {
                DeviceID: deviceId,
                [Op.and]: [
                    Sequelize.literal("JSON_EXTRACT(Action, '$.fromServer') = true"),
                    Sequelize.literal("JSON_EXTRACT(Action, '$.command.action') = 'toggle'")
                ]
            },
            order: [['Timestamp', 'DESC']]
        });

        if (!latestLog) {
            return res.status(404).json({ message: 'Không tìm thấy log bật/tắt thiết bị.' });
        }

        res.status(200).json(latestLog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy log cảm biến (sensor) gần nhất của thiết bị
exports.getLatestSensorLog = async (req, res) => {
    try {
        const { deviceId } = req.params;

        const latestSensorLog = await logs.findOne({
            where: {
                DeviceID: deviceId,
                [Op.and]: [
                    Sequelize.literal("JSON_EXTRACT(Action, '$.fromDevice') = true"),
                    Sequelize.literal("JSON_EXTRACT(Action, '$.type') = 'smokeSensor'")
                ]
            },
            order: [['Timestamp', 'DESC']]
        });

        if (!latestSensorLog) {
            return res.status(404).json({ message: 'Không tìm thấy log cảm biến cho thiết bị này.' });
        }

        res.status(200).json(latestSensorLog);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
