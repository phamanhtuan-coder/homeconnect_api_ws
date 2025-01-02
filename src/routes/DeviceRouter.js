const express = require('express');
const {
    createDevice,
    getAllDevices,
    getDeviceById,
    updateDeviceById,
    deleteDeviceById
} = require('../controllers/DeviceController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Create a new device
router.post('/', authenticate, createDevice);

// Get all devices
router.get('/', authenticate, getAllDevices);

// Get device by ID
router.get('/:id', authenticate, getDeviceById);

// Update device by ID
router.put('/:id', authenticate, updateDeviceById);

// Delete device by ID
router.delete('/:id', authenticate, deleteDeviceById);

module.exports = router;
