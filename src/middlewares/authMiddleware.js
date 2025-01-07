// src/middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to authenticate user using JWT
exports.authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;  // Ensure `id` is part of the token payload
        next();
    } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
    }
};



// Middleware to check if user has admin privileges (tam thời chưa cần)
exports.isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
};

