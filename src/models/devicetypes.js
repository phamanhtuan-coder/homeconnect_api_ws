const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const DeviceType = sequelize.define('devicetypes', {
    TypeID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    TypeName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    Attributes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    Rules: {
      type: DataTypes.JSON,
      allowNull: true
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'devicetypes',
    timestamps: true
  });

  DeviceType.associate = function (models) {
    DeviceType.hasMany(models.devices, {
      foreignKey: 'TypeID',
      as: 'Devices'
    });
  };

  return DeviceType;
};
