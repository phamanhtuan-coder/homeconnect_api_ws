const { alerts, alerttypes, devices, spaces , sharedpermissions, devicetypes, houses } = require('../models');
const { Op } = require('sequelize');
// Tạo cảnh báo mới (dành cho thiết bị gửi lên qua ESP/WebSocket)
exports.createAlert = async (req, res) => {
    try {
        const { DeviceID, SpaceID, TypeID, Message, AlertTypeID } = req.body;

        // Kiểm tra thiết bị tồn tại
        const device = await devices.findByPk(DeviceID);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Kiểm tra loại cảnh báo
        const alertType = await alerttypes.findByPk(AlertTypeID);
        if (!alertType) {
            return res.status(404).json({ error: 'Alert type not found' });
        }

        // Tạo mới alert
        const alert = await alerts.create({
            DeviceID,
            SpaceID,
            TypeID,
            Message,
            Status: true,  // Mặc định kích hoạt
            AlertTypeID
        });

        res.status(201).json(alert);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Lấy tất cả cảnh báo
exports.getAllAlerts = async (req, res) => {
    try {
        const allAlerts = await alerts.findAll({
            attributes: ['AlertID', 'DeviceID', 'SpaceID', 'TypeID', 'Message', 'Timestamp', 'Status', 'AlertTypeID'],
            include: [
                {
                    model: devices,
                    as: 'Device',
                    attributes: ['Name', 'PowerStatus']  // Chỉ lấy các trường cần thiết
                },
                {
                    model: alerttypes,
                    as: 'AlertType',
                    attributes: ['AlertTypeName']  // Chỉ lấy AlertTypeName
                }
            ],
            nest: true  // Giúp dữ liệu được tổ chức dạng lồng nhau thay vì lặp lại cột
        });

        res.status(200).json(allAlerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lấy cảnh báo theo ID
exports.getAlertById = async (req, res) => {
    try {
        const alert = await alerts.findByPk(req.params.id, {
            attributes: ['AlertID', 'DeviceID', 'SpaceID', 'TypeID', 'Message', 'Timestamp', 'Status', 'AlertTypeID'],
            include: [
                {
                    model: devices,
                    as: 'Device',
                    attributes: ['Name', 'PowerStatus']  // Chỉ lấy các cột cần thiết
                },
                {
                    model: alerttypes,
                    as: 'AlertType',
                    attributes: ['AlertTypeName']
                }
            ],
            nest: true
        });

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.status(200).json(alert);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Lọc cảnh báo theo loại thiết bị
exports.getAlertsByDevice = async (req, res) => {
    try {
        const deviceAlerts = await alerts.findAll({
            attributes: ['AlertID', 'DeviceID', 'SpaceID', 'TypeID', 'Message', 'Timestamp', 'Status', 'AlertTypeID'],
            where: {
                DeviceID: req.params.deviceId
            },
            include: {
                model: alerttypes,
                as: 'AlertType',
                attributes: ['AlertTypeName']
            },
            nest: true
        });

        res.status(200).json(deviceAlerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Đánh dấu cảnh báo là đã xử lý (Tắt trạng thái cảnh báo)
exports.resolveAlert = async (req, res) => {
    try {
        const alert = await alerts.findByPk(req.params.id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        alert.Status = false;  // Đánh dấu đã xử lý
        await alert.save();

        res.status(200).json({ message: 'Alert resolved', alert });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Xóa cảnh báo
exports.deleteAlertById = async (req, res) => {
    try {
        const alert = await alerts.findByPk(req.params.id);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await alert.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy toàn bộ alerts của toàn bộ các thiết bị (sở hữu và được chia sẻ) của userId
 */
exports.getAllAlertsByUser = async (req, res) => {
    try {
        const userId = req.user.id; // Lấy userId từ JWT

        // 1. Lấy tất cả các thiết bị mà người dùng sở hữu
        const ownedDevices = await devices.findAll({
            where: { UserID: userId },
            attributes: ['DeviceID']
        });

        // 2. Lấy tất cả các thiết bị được chia sẻ với người dùng
        const sharedPermissions = await sharedpermissions.findAll({
            where: { SharedWithUserID: userId },
            include: {
                model: devices,
                as: 'Device',
                attributes: ['DeviceID']
            },
            attributes: [] // Không cần các thuộc tính của SharedPermission
        });

        // 3. Lấy danh sách DeviceID từ ownedDevices và sharedPermissions
        const ownedDeviceIds = ownedDevices.map(device => device.DeviceID);
        const sharedDeviceIds = sharedPermissions.map(sp => sp.Device.DeviceID);

        // 4. Kết hợp và loại bỏ các DeviceID trùng lặp
        const allDeviceIds = [...new Set([...ownedDeviceIds, ...sharedDeviceIds])];

        if (allDeviceIds.length === 0) {
            // Nếu người dùng không có thiết bị nào, trả về mảng rỗng
            return res.status(200).json([]);
        }

        // 5. Lấy tất cả các alerts của các thiết bị trong danh sách allDeviceIds
        const alertsList = await alerts.findAll({
            where: {
                DeviceID: {
                    [Op.in]: allDeviceIds
                }
            },
            include: [
                {
                    model: devices,
                    as: 'Device',
                    include: [
                        { model: devicetypes, as: 'DeviceType' },
                        {
                            model: spaces,
                            as: 'Space',
                            include: [
                                { model: houses, as: 'House' }
                            ]
                        }
                    ]
                }
            ],
            order: [['Timestamp', 'DESC']] // Sắp xếp alerts mới nhất trước
        });

        return res.status(200).json(alertsList);
    } catch (error) {
        console.error('Error fetching alerts:', error);
        return res.status(500).json({ error: error.message });
    }
};
