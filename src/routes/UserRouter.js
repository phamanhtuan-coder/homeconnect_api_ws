const express = require('express');
const {
    getAllUsers,
    getUserById,
    updateUserById,
    deleteUserById,
    getUserSharedDevices,
    getSharedWithDevices,
    resetPassword,
    changePassword
} = require('../controllers/UserController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Lấy tất cả người dùng (yêu cầu auth)
router.get('/', authenticate, getAllUsers);

// Lấy thông tin người dùng theo ID
router.get('/:id', authenticate, getUserById);

// Cập nhật thông tin người dùng
router.put('/:id', authenticate, updateUserById);

// Xóa người dùng
router.delete('/:id', authenticate, deleteUserById);

// Lấy thiết bị mà người dùng đã chia sẻ
router.get('/:id/shared', authenticate, getUserSharedDevices);

// Lấy thiết bị được chia sẻ với người dùng
router.get('/:id/shared-with', authenticate, getSharedWithDevices);


// Khôi phục mật khẩu
router.post('/reset-password', resetPassword);

// Đổi mật khẩu
router.put('/:id/change-password', authenticate, changePassword);

module.exports = router;
