const express = require('express');
const {
    createDevice,
    linkDevice,
    getAllDevicesByUser,
    getDeviceById,
    updateDeviceById,
    deleteDeviceById,
    toggleDevice,
    updateDeviceAttributes,
    unlinkDevice,
    updateDeviceSpace,
    removeDeviceFromSpace,
    updateDeviceWifi
} = require('../controllers/DeviceController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tạo thiết bị mới
router.post('/', authenticate, createDevice);

// Liên kết thiết bị có sẵn
router.post('/link', authenticate, linkDevice);

// Bật/tắt thiết bị
router.post('/:id/toggle', authenticate, toggleDevice);

// Điều chỉnh độ sáng/màu sắc
router.post('/:id/attributes', authenticate, updateDeviceAttributes);

// Lấy tất cả thiết bị của user hiện tại
router.get('/', authenticate, getAllDevicesByUser);

// Lấy thông tin thiết bị cụ thể
router.get('/:id', authenticate, getDeviceById);

// Gỡ liên kết thiết bị
router.post('/:id/unlink', authenticate, unlinkDevice);

// Cập nhật phòng cho thiết bị
router.put('/:id/update-space', authenticate, updateDeviceSpace);

// Xóa thiết bị ra khỏi phòng (vẫn giữ UserID)
router.post('/:id/remove-space', authenticate, removeDeviceFromSpace);

// Cập nhật thông tin Wifi của thiết bị
router.put('/:id/update-wifi', authenticate, updateDeviceWifi);


module.exports = router;
