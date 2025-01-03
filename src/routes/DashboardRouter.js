const express = require('express');
const {
    getDashboardOverview,
    getDeviceStatistics,
    getPendingAlerts,
    getDeviceStatisticsForWeek,
    getDeviceStatisticsForDay,
    getRoomAverages,
    getHouseAverages
} = require('../controllers/DashboardController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tổng quan Dashboard
router.get('/overview', authenticate, getDashboardOverview);

// Thống kê thiết bị theo ngày
router.get('/statistics', authenticate, getDeviceStatistics);

// Lấy danh sách cảnh báo chưa xử lý
router.get('/pending-alerts', authenticate, getPendingAlerts);

// Thống kê thiết bị trong 7 ngày gần nhất
// router.get('/weekly-statistics', authenticate, getDeviceStatisticsForWeek);

// Thống kê thiết bị trong 1 ngày
router.get('/daily-statistics', authenticate, getDeviceStatisticsForDay);

// Trung bình nhiệt độ, độ ẩm và năng lượng của các phòng
router.get('/room-averages', authenticate, getRoomAverages);

// Trung bình nhiệt độ, độ ẩm và năng lượng của toàn bộ nhà
router.get('/house-averages', authenticate, getHouseAverages);

module.exports = router;
