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
            attributes: { exclude: ['PasswordHash','VerificationCode','VerificationExpiry'] }
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
            attributes: { exclude: ['PasswordHash', 'VerificationCode','VerificationExpiry'] }  // Không lấy hash mật khẩu
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
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Lọc các trường có thể cập nhật từ req.body (Loại bỏ updatedAt)
        const updateData = {
            Name: req.body.Name,
            Email: req.body.Email,
            Phone: req.body.Phone,
            Address: req.body.Address,
            DateOfBirth: req.body.DateOfBirth
        };

        // Cập nhật người dùng (Không gửi updatedAt vào)
        await user.update(updateData, {
            fields: ['Name', 'Email', 'Phone', 'Address', 'DateOfBirth']  // Chỉ cập nhật các trường cần thiết
        });

        res.status(200).json({
            message: 'User updated successfully',
            user
        });
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
            attributes: { exclude: ['PasswordHash', 'VerificationCode','VerificationExpiry'] }  // Không lấy hash mật khẩu
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // JOIN bảng sharedpermissions với devices để lấy thiết bị mà người dùng sở hữu
        const sharedByUser = await sharedpermissions.findAll({
            include: [
                {
                    model: devices,
                    as: 'Device',
                    where: { UserID: user.UserID },  // Lọc thiết bị thuộc sở hữu của người dùng
                    attributes: ['DeviceID', 'Name', 'TypeID']
                }
            ],
            attributes: { exclude: ['updatedAt'] }  // Bỏ thông tin không cần thiết
        });

        res.status(200).json(sharedByUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy tất cả thiết bị mà người dùng có quyền truy cập (gồm sở hữu và được chia sẻ)
 */
exports.getAllDevicesUserCanAccess = async (req, res) => {
    try {
        const userId = req.user.id;  // Hoặc req.params.id tuỳ cách bạn đang truyền user ID

        // 1. Lấy danh sách các thiết bị người dùng sở hữu
        const ownedDevices = await devices.findAll({
            where: { UserID: userId },
            include: [
                { model: devicetypes, as: 'DeviceType' },
                { model: spaces, as: 'Space' },
                { model: houses, as: 'House' }
            ]
        });

        // 2. Lấy danh sách các thiết bị người dùng được chia sẻ
        //    Để đồng bộ thông tin device (vd: include DeviceType, Space...),
        //    ta bổ sung thêm các quan hệ cần thiết trong phần `include`.
        const sharedPermissions = await sharedpermissions.findAll({
            where: { SharedWithUserID: userId },
            include: [{
                model: devices,
                as: 'Device',
                // Lồng các include nếu muốn lấy đủ thông tin giống ownedDevices
                include: [
                    { model: devicetypes, as: 'DeviceType' },
                    { model: spaces, as: 'Space' },
                    { model: houses, as: 'House' }
                ],
                // Lọc bớt cột nếu cần thiết
                attributes: ['DeviceID', 'Name', 'TypeID', 'UserID']
            }],
            // Lọc bớt cột của sharedpermissions nếu cần
            attributes: { exclude: ['updatedAt', 'OwnerUserID'] }
        });

        // 3. Chuẩn hoá mảng thiết bị được chia sẻ
        //    Vì phần sharedPermissions trả về mỗi bản ghi là 1 sharedpermission + 1 Device
        //    nên ta cần map để lấy riêng danh sách thiết bị.
        const sharedDevices = sharedPermissions.map(sp => sp.Device);

        // 4. Gộp hai mảng
        const allDevices = [...ownedDevices, ...sharedDevices];

        // 5. Trả về cho client
        return res.status(200).json(allDevices);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy thiết bị được chia sẻ với người dùng (Get Devices Shared With User)
 */
exports.getSharedWithDevices = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id, {
            attributes: { exclude: ['PasswordHash'] }  // Không lấy hash mật khẩu
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const sharedWithUser = await sharedpermissions.findAll({
            where: { SharedWithUserID: user.UserID },
            include: {
                model: devices,
                as: 'Device',
                attributes: ['DeviceID', 'Name', 'TypeID']
            },
            attributes: { exclude: [ 'updatedAt','OwnerUserID'] }  // updatedAt
        });
        res.status(200).json(sharedWithUser);
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
    const userId = req.params.id;  // Lấy từ URL params

    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    try {
        const user = await users.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.PasswordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Old password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ PasswordHash: hashedPassword });

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
