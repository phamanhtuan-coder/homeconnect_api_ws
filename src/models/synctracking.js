const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  return sequelize.define('synctracking', {
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
    IpAddress:{
      type: DataTypes.STRING,
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



};
