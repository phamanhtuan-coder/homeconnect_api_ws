// src/controllers/UserController.js

const { users } = require('../models'); // Import models
require('dotenv').config(); // Load environment variables
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');



//Create user
exports.createUser = async (req, res) => {
    try {
        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(req.body.PasswordHash, 10);

        const user = await users.create({
            ...req.body,
            PasswordHash: hashedPassword  // Store hashed password
        });

        res.status(201).json(user);
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            const errors = error.errors.map((e) => e.message);
            res.status(400).json({ error: 'Validation error', details: errors });
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({ error: 'Email must be unique' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};



// User login with token generation
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await users.findOne({ where: { Email: email } });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Token generation must be here, after finding the user
        const token = jwt.sign(
            { id: user.UserID, email: user.Email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const userList = await users.findAll({
            attributes: { exclude: ['PasswordHash'] }
        });
        res.status(200).json(userList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update user by ID
exports.updateUserById = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await user.update(req.body);
        res.status(200).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete user by ID
exports.deleteUserById = async (req, res) => {
    try {
        const user = await users.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await user.destroy();
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Assign role to a user
// exports.assignRoleToUser = async (req, res) => {
//     try {
//         const { userId } = req.params;
//         const { roleId } = req.body;
//
//         const user = await users.findByPk(userId);
//         if (!user) return res.status(404).json({ error: 'User not found' });
//
//         const role = await roles.findByPk(roleId);
//         if (!role) return res.status(404).json({ error: 'Role not found' });
//
//         await user.addRole(role); // Assuming association exists
//         res.status(200).json({ message: 'Role assigned successfully' });
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// };
