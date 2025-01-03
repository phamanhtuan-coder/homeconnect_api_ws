const express = require('express');
const {
    createAlert,
    getAllAlerts,
    getAlertById,
    getAlertsByDevice,
    resolveAlert,
    deleteAlertById
} = require('../controllers/AlertController');

const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tạo cảnh báo mới (POST)
router.post('/', authenticate, createAlert);

// Lấy tất cả cảnh báo (GET)
router.get('/', authenticate, getAllAlerts);

// Lấy cảnh báo theo ID (GET)
router.get('/:id', authenticate, getAlertById);

// Lọc cảnh báo theo thiết bị (GET)
router.get('/device/:deviceId', authenticate, getAlertsByDevice);

// Đánh dấu cảnh báo đã xử lý (PUT)
router.put('/:id/resolve', authenticate, resolveAlert);

// Xóa cảnh báo (DELETE)
router.delete('/:id', authenticate, deleteAlertById);

module.exports = router;
