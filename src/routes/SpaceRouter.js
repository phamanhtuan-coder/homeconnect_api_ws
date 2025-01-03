const express = require('express');
const {
    createSpace,
    getSpacesByHouse,
    updateSpace,
    deleteSpaceById,
    assignDeviceToSpace,
    removeDeviceFromSpace,
    getDevicesInSpace
} = require('../controllers/SpaceController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Quản lý không gian
router.post('/', authenticate, createSpace);
router.get('/:houseId', authenticate, getSpacesByHouse);
router.put('/:id', authenticate, updateSpace);
router.delete('/:id', authenticate, deleteSpaceById);

// Quản lý thiết bị trong không gian
router.post('/assign-device', authenticate, assignDeviceToSpace);
router.post('/remove-device/:id', authenticate, removeDeviceFromSpace);
router.get('/:spaceId/devices', authenticate, getDevicesInSpace);

module.exports = router;
