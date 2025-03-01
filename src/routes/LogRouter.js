const express = require('express');
const {
    createLog,
    getAllLogs,
    getLogById,
    deleteLogById,
    getLogsByDeviceId,
    getLogsBySpaceId,
    getLogsByUser
} = require('../controllers/LogController');
const { authenticate } = require('../middlewares/authMiddleware');
const {getDeviceById} = require("../controllers/DeviceController");

const router = express.Router();

// Tạo log (cần xác thực)
router.post('/', authenticate, createLog);

// Lấy tất cả logs (cần xác thực)
router.get('/', authenticate, getAllLogs);

// Lọc log theo DeviceID
router.get('/device/:deviceId', authenticate, getLogsByDeviceId);

// Lọc log theo SpaceID
router.get('/space/:spaceId', authenticate, getLogsBySpaceId);

// Lấy log cụ thể theo ID
router.get('/:id', authenticate, getLogById);

// Xóa log theo ID
router.delete('/:id', authenticate, deleteLogById);

// Lấy log theo UserID
router.get('/user/:userId', authenticate, getLogsByUser) ;

module.exports = router;
