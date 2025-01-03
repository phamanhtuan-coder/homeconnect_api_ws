const express = require('express');
const {
    createOrUpdateSync,
    getUserSyncList,
    getSyncByDevice,
    updateSyncStatus,
    deleteSyncRecord
} = require('../controllers/SyncTrackingController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Quản lý đồng bộ thiết bị
router.post('/', authenticate, createOrUpdateSync);  // Tạo hoặc cập nhật
router.get('/', authenticate, getUserSyncList);  // Lấy danh sách
router.get('/:deviceId', authenticate, getSyncByDevice);  // Lấy trạng thái theo DeviceID
router.put('/:deviceId', authenticate, updateSyncStatus);  // Cập nhật trạng thái
router.delete('/:deviceId', authenticate, deleteSyncRecord);  // Xóa đồng bộ

module.exports = router;
