const express = require('express');
const {
    createHouse,
    getAllHousesByUser,
    getHouseById,
    updateHouseById,
    deleteHouseById
} = require('../controllers/HouseController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticate, createHouse);
router.get('/', authenticate, getAllHousesByUser);
router.get('/:id', authenticate, getHouseById);
router.put('/:id', authenticate, updateHouseById);
router.delete('/:id', authenticate, deleteHouseById);

module.exports = router;
