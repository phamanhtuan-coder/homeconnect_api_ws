const Sequelize = require('sequelize');
require('dotenv').config();

let sequelize;

// Nếu NODE_ENV=production -> dùng JawsDB
if (process.env.NODE_ENV === 'production') {
    sequelize = new Sequelize(process.env.JAWSDB_MARIA_URL, {
        dialect: 'mysql',
        logging: false
    });
} else {
    // Ngược lại, dùng local
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            dialect: 'mysql',
            logging: false
        }
    );
}

module.exports = sequelize;