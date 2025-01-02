const express = require('express');
const {
    createDevice,
    getAllDevices,
    getDeviceById,
    updateDeviceById,
    deleteDeviceById,
    toggleDevice,
    getFilteredDevices,
    updateDeviceAttributes
} = require('../controllers/DeviceController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticate, createDevice);
router.get('/', authenticate, getAllDevices);
router.get('/:id', authenticate, getDeviceById);
router.put('/:id', authenticate, updateDeviceById);
router.delete('/:id', authenticate, deleteDeviceById);
router.put('/:id/toggle', authenticate, toggleDevice);
// Lấy danh sách thiết bị (Tìm kiếm bằng query)
router.get('/filter', authenticate, getFilteredDevices);
// Điều chỉnh độ sáng và màu sắc (mới thêm)
router.put('/:id/attributes', authenticate, updateDeviceAttributes);

module.exports = router;
