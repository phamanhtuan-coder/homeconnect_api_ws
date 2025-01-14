
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
    getDailyPowerUsageForRange
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

module.exports = router;
