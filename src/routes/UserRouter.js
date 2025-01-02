// src/routes/UserRouter.js

const express = require('express');
const { createUser, getAllUsers, getUserById, updateUserById, deleteUserById, loginUser } = require('../controllers/UserController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Create a new user
router.post('/', createUser);

// User login (for mobile app)
router.post('/login', loginUser);

// Get all users
router.get('/', authenticate, getAllUsers);

// Get user by ID
router.get('/:id', authenticate, getUserById);

// Update user by ID
router.put('/:id', authenticate, updateUserById);

// Delete user by ID
router.delete('/:id', authenticate, deleteUserById);

// Assign role to a user
// router.post('/:userId/roles', authenticate, assignRoleToUser);

module.exports = router;
