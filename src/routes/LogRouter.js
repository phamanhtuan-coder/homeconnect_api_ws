const express = require('express');
const {
    createLog,
    getAllLogs,
    getLogById,
    deleteLogById,
    getLogsByDeviceId,
    getLogsBySpaceId,
    getLogsByUser,
    getLatestLogByDevice,
    getLatestToggleLog,
    getLatestUpdateAttributesLog,
    getLatestSensorLog
} = require('../controllers/LogController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tạo log (cần xác thực)
router.post('/', authenticate, createLog);

// Lấy tất cả logs (cần xác thực)
router.get('/', authenticate, getAllLogs);

// Lọc log theo DeviceID
router.get('/device/:deviceId', authenticate, getLogsByDeviceId);

// Lọc log theo SpaceID
router.get('/space/:spaceId', authenticate, getLogsBySpaceId);

// Lấy log theo UserID
router.get('/user/:userId', authenticate, getLogsByUser) ;

//Lấy log gần nhất
router.get('/latest/:deviceId', authenticate,getLatestLogByDevice) ;

//Lấy log toggle gần nhất
router.get( '/latestToggle/:deviceId', authenticate,  getLatestToggleLog) ;

//Lấy log Update Attributes gần nhất
router.get(  '/latestUpdateAttributes/:deviceId', authenticate,  getLatestUpdateAttributesLog) ;

//Lấy log smoke sensor gần nhất
router.get(  '/latestSensor/:deviceId', authenticate,  getLatestSensorLog ) ;

// Lấy log cụ thể theo ID
router.get('/:id', authenticate, getLogById);

// Xóa log theo ID
router.delete('/:id', authenticate, deleteLogById);

module.exports = router;
