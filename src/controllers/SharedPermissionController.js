const { sharedpermissions, users, devices } = require('../models');

/**
 * Chia sẻ thiết bị cho người dùng khác (Share Device)
 */
exports.shareDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { sharedWithUserId } = req.body;

        // Kiểm tra xem thiết bị có tồn tại không
        const device = await devices.findByPk(deviceId);
        if (!device) return res.status(404).json({ error: 'Device not found' });

        // Kiểm tra xem user nhận chia sẻ có tồn tại không
        const user = await users.findByPk(sharedWithUserId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Tạo mới quyền chia sẻ
        const sharedPermission = await sharedpermissions.create({
            DeviceID: deviceId,
            SharedWithUserID: sharedWithUserId
        });

        res.status(201).json({ message: 'Device shared successfully', sharedPermission });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Thu hồi quyền chia sẻ thiết bị (Revoke Device Share)
 */
exports.revokeShareDevice = async (req, res) => {
    try {
        const { permissionId } = req.params;

        // Tìm quyền chia sẻ
        const sharedPermission = await sharedpermissions.findByPk(permissionId);
        if (!sharedPermission) return res.status(404).json({ error: 'Shared permission not found' });

        // Xóa quyền chia sẻ
        await sharedPermission.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy danh sách người dùng được chia sẻ thiết bị (Get Users Shared Device)
 */
exports.getUsersSharedDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;

        const sharedUsers = await sharedpermissions.findAll({
            where: { DeviceID: deviceId },
            include: {
                model: users,
                as: 'SharedWithUser',
                attributes: ['UserID', 'Name', 'Email']
            }
        });

        if (!sharedUsers.length) {
            return res.status(404).json({ error: 'No shared users for this device' });
        }

        res.status(200).json(sharedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
