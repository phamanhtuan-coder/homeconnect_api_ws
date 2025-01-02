const Sequelize = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,        // Database name
    process.env.DB_USER,        // User
    process.env.DB_PASSWORD,    // Password
    {
        host: '127.0.0.1',        // Force use of 127.0.0.1
        port: 3306,               // Default MySQL port (XAMPP)
        dialect: 'mysql',         // Use MySQL dialect
        logging: false            // Disable SQL logging (optional)
    }
);

// Test Database Connection
sequelize.authenticate()
    .then(() => {
        console.log('Database connected...');
    })
    .catch((err) => {
        console.error('Error: ', err);
    });

module.exports = sequelize;

