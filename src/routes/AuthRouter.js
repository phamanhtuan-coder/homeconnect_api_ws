const express = require('express');
const {
    register,
    login,
    getCurrentUser,
    logout,
    checkAndUpdateDeviceToken
} = require('../controllers/AuthController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Đăng ký người dùng mới
router.post('/register', register);

// Đăng nhập và lấy token
router.post('/login', login);

// Lấy thông tin người dùng hiện tại (Yêu cầu token)
router.get('/me', authenticate, getCurrentUser);

// Đăng xuất
router.post('/logout', authenticate, logout);

// Cập nhật DeviceToken
router.post( '/update-device-token',authenticate, checkAndUpdateDeviceToken);

module.exports = router;
