const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const SyncTracking = sequelize.define('synctracking', {
    SyncID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    UserID:{
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    DeviceID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    DeviceName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    SyncStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'synctracking',
    timestamps: true
  });

  SyncTracking.associate = function (models) {
    SyncTracking.belongsTo(models.devices, {
      foreignKey: 'DeviceID',
      as: 'Device'
    });
  };

  return SyncTracking;
};
