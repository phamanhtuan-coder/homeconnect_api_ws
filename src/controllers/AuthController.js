const { users } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Đăng ký người dùng mới
exports.register = async (req, res) => {
    try {
        const { Name, Email, PasswordHash, Phone, Address } = req.body;

        // Kiểm tra Email đã tồn tại chưa
        const existingUser = await users.findOne({ where: { Email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash mật khẩu
        const hashedPassword = await bcrypt.hash(PasswordHash, 10);

        // Tạo người dùng mới
        const user = await users.create({
            Name,
            Email,
            PasswordHash: hashedPassword,
            Phone,
            Address
        });

        res.status(201).json({ message: 'User registered successfully', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

// Lấy thông tin người dùng hiện tại (Dựa vào token)
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await users.findByPk(req.user.id, {
            attributes: { exclude: ['PasswordHash'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
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
