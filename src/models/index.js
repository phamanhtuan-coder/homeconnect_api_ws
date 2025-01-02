const Sequelize = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load environment variables

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
});

// Load models dynamically
const models = {};
fs.readdirSync(__dirname)
    .filter((file) => file !== 'index.js' && file.slice(-3) === '.js')
    .forEach((file) => {
        const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        models[model.name] = model;
    });

// Add associations if any (e.g., foreign key relationships)
// Example: models.users.hasMany(models.orders);

// Export initialized Sequelize and models
module.exports = { sequelize, ...models };
