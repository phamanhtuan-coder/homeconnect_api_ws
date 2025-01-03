const express = require('express');
const {
    getDashboardOverview,
    getDeviceStatistics,
    getPendingAlerts
} = require('../controllers/DashboardController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tổng quan Dashboard
router.get('/overview', authenticate, getDashboardOverview);

// Thống kê thiết bị theo ngày
router.get('/statistics', authenticate, getDeviceStatistics);

// Lấy danh sách cảnh báo chưa xử lý
router.get('/pending-alerts', authenticate, getPendingAlerts);

module.exports = router;
