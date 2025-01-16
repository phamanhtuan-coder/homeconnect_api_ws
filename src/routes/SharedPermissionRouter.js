const express = require('express');
const {
    shareDevice,
    revokeShareDevice,
    getUsersSharedDevice
} = require('../controllers/SharedPermissionController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();



// Thu hồi quyền chia sẻ thiết bị
router.delete('/revoke/:permissionId', authenticate, revokeShareDevice);

// Lấy danh sách người dùng được chia sẻ thiết bị
router.get('/:deviceId/shared-users', authenticate, getUsersSharedDevice);

// Chia sẻ quyền điều khiển thiết bị
router.post('/:deviceId/share', authenticate, shareDevice);

module.exports = router;
