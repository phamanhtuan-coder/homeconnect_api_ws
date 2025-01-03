const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// Import routers
const UserRouter = require('./src/routes/UserRouter');
const DeviceRouter = require('./src/routes/DeviceRouter');
const AlertRouter = require('./src/routes/AlertRouter');
const LogRouter = require('./src/routes/LogRouter');
// const AuthRouter = require('./src/routes/AuthRouter');
// const DashboardRouter = require('./src/routes/DashboardRouter');

const app = express();

// Middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
const { authenticate } = require('./src/middlewares/authMiddleware');

// API routes
app.use('/api/users', UserRouter);
app.use('/api/devices', DeviceRouter);
app.use('/api/alerts', AlertRouter);
app.use('/api/logs', LogRouter);
// app.use('/api/auth', AuthRouter);
// app.use('/api/dashboard', DashboardRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // Send JSON response for API errors
    if (req.originalUrl.startsWith('/api')) {
        res.status(err.status || 500).json({ error: err.message });
    } else {
        // Render error page for non-API routes
        res.status(err.status || 500);
        res.render('error');
    }
});

module.exports = app;
