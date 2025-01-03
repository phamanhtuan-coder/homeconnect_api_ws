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
router.post('/:id/toggle', authenticate, toggleDevice);
router.get('/filter', authenticate, getFilteredDevices);
router.put('/:id/attributes', authenticate, updateDeviceAttributes);

module.exports = router;
