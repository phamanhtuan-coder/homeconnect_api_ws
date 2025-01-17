const express = require('express');
const {
    createSpace,
    getSpacesByHouse,
    updateSpace,
    deleteSpaceById,
    assignDeviceToSpace,
    removeDeviceFromSpace,
    getDevicesInSpace,
    getSpaceDetail
} = require('../controllers/SpaceController');
const { authenticate } = require('../middlewares/authMiddleware');
const {createDevice} = require("../controllers/DeviceController");

const router = express.Router();

// Quản lý không gian
router.post('/', authenticate, createSpace);

// Quản lý thiết bị trong không gian
router.post('/assign-device', authenticate, assignDeviceToSpace);
router.post('/remove-device/:id', authenticate, removeDeviceFromSpace);

// Quản lý không gian

router.get('/:houseId', authenticate, getSpacesByHouse);
router.put('/:id', authenticate, updateSpace);
router.delete('/:id', authenticate, deleteSpaceById);
router.get('/:id/detail', authenticate, getSpaceDetail);


// Quản lý thiết bị trong không gian
router.get('/:spaceId/devices', authenticate, getDevicesInSpace);

module.exports = router;
