const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const Space = sequelize.define('spaces', {
    SpaceID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    HouseID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    IsDeleted:{
      type: Boolean,
      defaultValue: false
    }

  }, {
    sequelize,
    tableName: 'spaces',
    timestamps: true
  });

  Space.associate = function (models) {
    Space.belongsTo(models.houses, {
      foreignKey: 'HouseID',
      as: 'House'
    });

    Space.hasMany(models.devices, {
      foreignKey: 'SpaceID',
      as: 'Devices'
    });
  };

  return Space;
};
