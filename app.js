// app.js

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// Import routers
const UserRouter = require('./src/routes/UserRouter');
const SharedPermissionRouter = require('./src/routes/SharedPermissionRouter');
const HouseRouter = require('./src/routes/HouseRouter');
const SpaceRouter = require('./src/routes/SpaceRouter');
const DeviceRouter = require('./src/routes/DeviceRouter');
const AlertRouter = require('./src/routes/AlertRouter');
const LogRouter = require('./src/routes/LogRouter');
const AuthRouter = require('./src/routes/AuthRouter');
const SyncTrackingRouter = require('./src/routes/SyncTrackingRouter');
const DashboardRouter = require('./src/routes/DashboardRouter');
const OtpRouter = require('./src/routes/OtpRouter');
const StatisticsRouter = require('./src/routes/StatisticsRouter');
const app = express();

// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
const { authenticate } = require('./src/middlewares/authMiddleware');

// API routes
app.use('/api/users', UserRouter);
app.use('/api/sharedpermissions', SharedPermissionRouter);
app.use('/api/houses', HouseRouter);
app.use('/api/spaces', SpaceRouter);
app.use('/api/devices', DeviceRouter);
app.use('/api/alerts', AlertRouter);
app.use('/api/logs', LogRouter);
app.use('/api/auth', AuthRouter);
app.use('/api/sync', SyncTrackingRouter);
app.use('/api/dashboard', DashboardRouter);
app.use('/api/otp', OtpRouter);
app.use('/api/statistics',StatisticsRouter)
app.get('/home', (req, res) => {
    res.json({ message: 'Welcome to HomeConnect API' });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // Send JSON response for all errors
    res.status(err.status || 500).json({ error: err.message });
});

module.exports = app;
