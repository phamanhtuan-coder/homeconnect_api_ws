const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const Device = sequelize.define('devices', {
    DeviceID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    TypeID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    SpaceID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    },
    WifiSSID: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    WifiPassword: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'devices',
    timestamps: true
  });

  // Định nghĩa các mối quan hệ
  Device.associate = function (models) {
    Device.belongsTo(models.devicetypes, {
      foreignKey: 'TypeID',
      as: 'DeviceType'  // Liên kết tới DeviceType
    });

    Device.belongsTo(models.spaces, {
      foreignKey: 'SpaceID',
      as: 'Space'
    });


    Device.hasOne(models.synctracking, {
      foreignKey: 'DeviceID',
      as: 'SyncStatus'
    });

    Device.hasMany(models.sharedpermissions, {
      foreignKey: 'DeviceID',
      as: 'SharedUsers'
    });
  };

  return Device;
};
