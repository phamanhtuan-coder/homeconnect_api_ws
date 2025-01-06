const { users, sharedpermissions, devices, logs } = require('../models');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcrypt');


/**
 * Lấy tất cả người dùng (Get All Users)
 */
exports.getAllUsers = async (req, res) => {
    try {
        const userList = await users.findAll({
            attributes: { exclude: ['PasswordHash'] }
        });
        res.status(200).json(userList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy thông tin người dùng theo ID (Get User by ID)
 */
exports.getUserById = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id, {
            attributes: { exclude: ['PasswordHash'] }  // Không lấy hash mật khẩu
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Lấy thiết bị thuộc sở hữu của người dùng
        const ownedDevices = await devices.findAll({
            where: { UserID: user.UserID },
            attributes: ['DeviceID', 'Name', 'TypeID', 'PowerStatus']
        });

        // Lấy log của người dùng
        const userLogs = await logs.findAll({
            where: { UserID: user.UserID },
            attributes: ['LogID', 'DeviceID', 'Action', 'Timestamp']
        });

        // Lấy thiết bị được chia sẻ với người dùng
        const sharedWithUser = await sharedpermissions.findAll({
            where: { SharedWithUserID: user.UserID },
            include: {
                model: devices,
                as: 'Device',
                attributes: ['DeviceID', 'Name', 'TypeID']
            },
            attributes: { exclude: [ 'updatedAt','OwnerUserID'] }  // updatedAt
        });


        // Gắn thêm dữ liệu vào user
        const userData = {
            ...user.toJSON(),
            OwnedDevices: ownedDevices,
            Logs: userLogs,
            DevicesSharedWithUser: sharedWithUser
        };

        res.status(200).json(userData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


/**
 * Cập nhật thông tin người dùng (Update User)
 */
exports.updateUserById = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await user.update(req.body);
        res.status(200).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Xóa người dùng (Delete User)
 */
exports.deleteUserById = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await user.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy thiết bị mà người dùng đã chia sẻ (Get Devices User Shared)
 */
exports.getUserSharedDevices = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id, {
            include: [
                {
                    model: sharedpermissions,
                    as: 'DevicesUserShared',
                    include: {
                        model: devices,
                        as: 'Device'
                    }
                }
            ]
        });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy thiết bị được chia sẻ với người dùng (Get Devices Shared With User)
 */
exports.getSharedWithDevices = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id, {
            include: [
                {
                    model: sharedpermissions,
                    as: 'DevicesSharedWithUser',
                    include: {
                        model: devices,
                        as: 'Device'
                    }
                }
            ]
        });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Khôi phục mật khẩu (Reset Password)
 */
exports.resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        const user = await users.findOne({ where: { Email: email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ PasswordHash: hashedPassword });

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Đổi mật khẩu (Change Password)
 */
exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;  // Người dùng hiện tại

    try {
        const user = await users.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(oldPassword, user.PasswordHash);
        if (!isMatch) return res.status(400).json({ error: 'Old password is incorrect' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ PasswordHash: hashedPassword });

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
