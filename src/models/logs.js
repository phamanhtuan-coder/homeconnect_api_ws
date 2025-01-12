const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const Log = sequelize.define('logs', {
    LogID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    DeviceID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'devices',
        key: 'DeviceID'
      },
      onDelete: 'SET NULL',  // Khi thiết bị bị xóa, log sẽ không bị xóa
      onUpdate: 'CASCADE'
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'UserID'
      },
      onDelete: 'SET NULL',  // Khi người dùng bị xóa, log sẽ không bị xóa
      onUpdate: 'CASCADE'
    },
    SpaceID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'spaces',
        key: 'SpaceID'
      },
      onDelete: 'SET NULL',  // Khi không gian bị xóa, log sẽ không bị xóa
      onUpdate: 'CASCADE'
    },
    Action: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Chi tiết hành động thực hiện trên thiết bị'
    },
    Timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    Details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Thông tin chi tiết về log hoặc dữ liệu bổ sung'
    }
  }, {
    sequelize,
    tableName: 'logs',
    timestamps: false,
    indexes: [
      {
        name: 'PRIMARY',
        unique: true,
        fields: ['LogID']
      },
      {
        name: 'DeviceIndex',
        fields: ['DeviceID']
      },
      {
        name: 'UserIndex',
        fields: ['UserID']
      },
      {
        name: 'SpaceIndex',
        fields: ['SpaceID']
      }
    ]
  });

  // Định nghĩa các mối quan hệ
  Log.associate = function (models) {
    Log.belongsTo(models.devices, {
      foreignKey: 'DeviceID',
      as: 'Device',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    Log.belongsTo(models.users, {
      foreignKey: 'UserID',
      as: 'user',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    Log.belongsTo(models.spaces, {
      foreignKey: 'SpaceID',
      as: 'Space',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  return Log;
};
