const { users } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Đăng ký người dùng mới
exports.register = async (req, res) => {
    try {
        // Trích xuất các trường từ body của request
        const { Name, Email, PasswordHash, Phone, Address, DateOfBirth, ProfileImage } = req.body;

        // =========================
        // 1. Kiểm Tra Dữ Liệu Đầu Vào
        // =========================

        // Kiểm tra các trường bắt buộc
        if (!Name || !Email || !PasswordHash) {
            return res.status(400).json({ error: 'Tên, Email và Mật khẩu là bắt buộc.' });
        }

        // Kiểm tra định dạng Email bằng regex đơn giản
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(Email)) {
            return res.status(400).json({ error: 'Định dạng Email không hợp lệ.' });
        }

        // Kiểm tra độ dài mật khẩu (ví dụ: ít nhất 6 ký tự)
        if (PasswordHash.length < 6) {
            return res.status(400).json({ error: 'Mật khẩu phải ít nhất 6 ký tự.' });
        }

        // Tùy chọn: Kiểm tra định dạng số điện thoại (ví dụ đơn giản)
        if (Phone && !/^\d{10,15}$/.test(Phone)) {
            return res.status(400).json({ error: 'Định dạng số điện thoại không hợp lệ.' });
        }

        // Tùy chọn: Kiểm tra định dạng DateOfBirth (YYYY-MM-DD)
        if (DateOfBirth) {
            const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!birthDateRegex.test(DateOfBirth)) {
                return res.status(400).json({ error: 'DateOfBirth phải có định dạng YYYY-MM-DD.' });
            }

            const date = new Date(DateOfBirth);
            if (isNaN(date.getTime())) {
                return res.status(400).json({ error: 'DateOfBirth không hợp lệ.' });
            }
        }

        // =========================
        // 2. Kiểm Tra Email Đã Tồn Tại
        // =========================

        const existingUser = await users.findOne({ where: { Email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email đã tồn tại.' });
        }

        // =========================
        // 3. Băm Mật Khẩu
        // =========================

        const hashedPassword = await bcrypt.hash(PasswordHash, 10);

        // =========================
        // 4. Chuẩn Bị Dữ Liệu Người Dùng Mới
        // =========================

        const newUserData = {
            Name,
            Email,
            PasswordHash: hashedPassword,
            Phone,
            Address,
        };

        // Thêm DateOfBirth nếu có
        if (DateOfBirth) {
            newUserData.DateOfBirth = DateOfBirth; // Đảm bảo định dạng 'YYYY-MM-DD'
        }

        // Thêm ProfileImage nếu có
        if (ProfileImage) {
            try {
                const base64Data = ProfileImage.replace(/^data:image\/\w+;base64,/, "");
                // Đảm bảo rằng base64Data là một chuỗi hợp lệ
                const buffer = Buffer.from(base64Data, 'base64');
                if (buffer.toString('base64') !== base64Data) {
                    return res.status(400).json({ error: 'Định dạng ProfileImage không hợp lệ.' });
                }
                newUserData.ProfileImage = base64Data; // Lưu trữ chuỗi base64 trực tiếp
            } catch (imageError) {
                return res.status(400).json({ error: 'Định dạng ProfileImage không hợp lệ.' });
            }
        }

        // =========================
        // 5. Tạo Người Dùng Mới
        // =========================

        const user = await users.create(newUserData);

        // =========================
        // 6. Chuẩn Bị Phản Hồi
        // =========================

        // Loại bỏ các trường nhạy cảm khỏi phản hồi
        const { PasswordHash: _, ProfileImage: __, ...userWithoutSensitive } = user.get({ plain: true });

        res.status(201).json({ message: 'Đăng ký người dùng thành công.', user: userWithoutSensitive });
    } catch (error) {
        console.error('Lỗi khi đăng ký người dùng:', error);
        res.status(500).json({ error: 'Lỗi hệ thống.' });
    }
};


// Đăng nhập và tạo token
exports.login = async (req, res) => {
    try {
        const { Email, PasswordHash } = req.body;

        // Tìm người dùng theo Email
        const user = await users.findOne({ where: { Email } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(PasswordHash, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Tạo token JWT
        const token = jwt.sign(
            { id: user.UserID, email: user.Email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy thông tin người dùng hiện tại dựa vào token
 * @param {Object} req - Request object từ Express
 * @param {Object} res - Response object từ Express
 */
exports.getCurrentUser = async (req, res) => {
    try {
        // Lấy UserID từ req.user (được gán khi xác thực token)
        const userId = req.user.id;

        // Tìm người dùng theo UserID, loại trừ các trường nhạy cảm
        const user = await users.findByPk(userId, {
            attributes: { exclude: ['PasswordHash', 'VerificationCode', 'VerificationExpiry'] }
        });

        // Kiểm tra nếu người dùng không tồn tại
        if (!user) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
        }

        // Chuyển đổi đối tượng Sequelize sang đối tượng plain JavaScript
        const userData = user.get({ plain: true });


        // Trả về dữ liệu người dùng
        return res.status(200).json(userData);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng hiện tại:', error);
        return res.status(500).json({ error: 'Lỗi hệ thống.' });
    }
};


// Đăng xuất người dùng (client sẽ tự xóa token)
exports.logout = (req, res) => {
    try {
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Hàm cập nhật DeviceToken vào bảng users
async function updateDeviceToken(id, deviceToken) {
    try {
        const user = await users.findOne({ where: { UserID: id } });

        if (!user) {
            return { success: false, message: 'Người dùng không tồn tại.' };
        }

        await user.update({ DeviceToken: deviceToken });

        return { success: true, message: 'Cập nhật DeviceToken thành công.' };
    } catch (error) {
        console.error('Lỗi khi cập nhật DeviceToken:', error);
        return { success: false, message: 'Lỗi khi cập nhật DeviceToken.' };
    }
}

exports.checkAndUpdateDeviceToken = async (req, res) => {
    const {deviceToken} = req.body;

    const id = req.user.id;

    if (!deviceToken) {
        return res.status(400).json({
            success: false,
            message: 'DeviceToken không được để trống.'
        });
    }

    try {
        const result = await updateDeviceToken(id, deviceToken);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        res.status(500).json({success: false, message: 'Lỗi hệ thống.'});
    }
};
