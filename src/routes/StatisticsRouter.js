
const express = require('express');
const { authenticate } = require('../middlewares/authMiddleware');
const {
    calculateDailyAverageSensor,
    calculateWeeklyAverageSensor,
    getWeeklyAverageSensor,
    calculateAverageSensorForRange,
    getDailyAveragesSensorForRange,
    calculateDailyPowerUsage,
    calculateWeeklyPowerUsage,
    calculateMonthlyPowerUsage,
    getDailyPowerUsageForRange,
    calculateWeeklyRoomAverageSensor,
    calculateMonthlyRoomAverageSensor,
    calculateRoomAverageSensorForRange,
    calculateWeeklyRoomPowerUsage,
    calculateMonthlyRoomPowerUsage,
    calculateRoomPowerUsageForRange,
    getDailyRoomAverageSensorForRange,
    getDailyRoomPowerUsageForRange
} = require('../controllers/StatisticsController');

const router = express.Router();


// Routes cho Sensor Data
router.post('/calculate-daily-average-sensor', authenticate,calculateDailyAverageSensor);
router.post('/calculate-weekly-average-sensor',authenticate ,calculateWeeklyAverageSensor);
router.get('/weekly-average-sensor/:deviceId', authenticate,getWeeklyAverageSensor);
router.post('/calculate-average-sensor-for-range',authenticate ,calculateAverageSensorForRange);
router.get('/daily-averages-sensor/:deviceId/:startDate/:endDate', authenticate,getDailyAveragesSensorForRange);

// Routes cho Power Usage
router.post('/calculate-daily-power-usage', authenticate,calculateDailyPowerUsage);
router.post('/calculate-weekly-power-usage',authenticate ,calculateWeeklyPowerUsage);
router.post('/calculate-monthly-power-usage',authenticate ,calculateMonthlyPowerUsage);
router.get('/daily-power-usages/:deviceId/:startDate/:endDate', authenticate,getDailyPowerUsageForRange);


// Sensor theo phòng
router.post('/calculate-weekly-room-average-sensor', authenticate, calculateWeeklyRoomAverageSensor);
router.post('/calculate-monthly-room-average-sensor', authenticate, calculateMonthlyRoomAverageSensor);
router.post('/calculate-room-average-sensor-for-range', authenticate, calculateRoomAverageSensorForRange);


// Điện năng tiêu thụ theo phòng
router.post('/calculate-weekly-room-power-usage', authenticate, calculateWeeklyRoomPowerUsage);
router.post('/calculate-monthly-room-power-usage', authenticate, calculateMonthlyRoomPowerUsage);
router.post('/calculate-room-power-usage-for-range', authenticate, calculateRoomPowerUsageForRange);


// Trả về danh sách trung bình sensor từng ngày theo khoảng ngày
router.get('/daily-room-averages-sensor/:spaceId/:startDate/:endDate', authenticate, getDailyRoomAverageSensorForRange);

// Trả về danh sách tiêu thụ điện năng từng ngày theo khoảng ngày
router.get('/daily-room-power-usage/:spaceId/:startDate/:endDate', authenticate, getDailyRoomPowerUsageForRange);


module.exports = router;
