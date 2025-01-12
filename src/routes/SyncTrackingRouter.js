// syncTrackingRoutes.js
const express = require('express');
const {
    getAllSyncTracking,
    getSyncTrackingByUserId,
    getSyncTrackingById,
    createSyncTracking,
    updateSyncTracking,
    deleteSyncTracking,
    checkSyncStatus
} = require('../controllers/SyncTrackingController'); // Đường dẫn tùy cấu trúc dự án
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Các hàm trong controller:
 *  - getAllSyncTracking(req, res, next)
 *  - getSyncTrackingByUserId(req, res, next)
 *  - getSyncTrackingById(req, res, next)
 *  - createSyncTracking(req, res, next)
 *  - updateSyncTracking(req, res, next)
 *  - deleteSyncTracking(req, res, next)
 *  - checkSyncStatus(req, res, next)
 */

/**
 * 1) Lấy tất cả SyncTracking
 *    [GET] /api/sync
 */
router.get('/', authenticate, getAllSyncTracking);

/**
 * 2) Lấy danh sách SyncTracking theo UserID
 *    [GET] /api/sync/user
 *    - Trong controller lấy userId từ req.user.id (do middleware authenticate gán)
 */
router.get('/user', authenticate, getSyncTrackingByUserId);

/**
 * 3) Lấy thông tin 1 SyncTracking theo SyncID
 *    [GET] /api/sync/:id
 */
router.get('/:id', authenticate, getSyncTrackingById);

/**
 * 4) Tạo mới 1 SyncTracking
 *    [POST] /api/sync
 */
router.post('/', authenticate, createSyncTracking);

/**
 * 5) Cập nhật 1 SyncTracking theo SyncID
 *    [PUT] /api/sync/:id
 */
router.put('/:id', authenticate, updateSyncTracking);

/**
 * 6) Xoá 1 SyncTracking theo SyncID
 *    [DELETE] /api/sync/:id
 */
router.delete('/:id', authenticate, deleteSyncTracking);

/**
 * 7) Kiểm tra tình trạng đồng bộ
 *    [POST] /api/sync/check
 */
router.post('/check', authenticate, checkSyncStatus);

module.exports = router;
