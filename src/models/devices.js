const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  const Device = sequelize.define('devices', {
    DeviceID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    TypeID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'devicetypes',
        key: 'TypeID'
      }
    },
    Name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    PowerStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    },
    Attribute: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'devices',
    timestamps: true
  });

  // Định nghĩa mối quan hệ với devicetypes
  Device.associate = function(models) {
    Device.belongsTo(models.devicetypes, {
      foreignKey: 'TypeID',
      as: 'DeviceType'  // Alias là DeviceType
    });
  };

  return Device;
};
