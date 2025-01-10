const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const House = sequelize.define('houses', {
    HouseID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    Address:{
      type: DataTypes.STRING(100),
      allowNull: false
    },
    IconName:{
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    IconColor:{
      type: DataTypes.STRING(100),
      allowNull: false
    },
    IsDeleted: {
      type: Boolean,
      default: false
    }
  }, {
    sequelize,
    tableName: 'houses',
    timestamps: true
  });

  House.associate = function (models) {
    House.hasMany(models.spaces, {
      foreignKey: 'HouseID',
      as: 'Spaces'
    });

  };

  return House;
};
