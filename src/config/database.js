// config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config(); // Để sử dụng biến môi trường từ file .env

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306, // Sử dụng cổng mặc định hoặc cổng bạn đã cấu hình
});

module.exports = sequelize;

