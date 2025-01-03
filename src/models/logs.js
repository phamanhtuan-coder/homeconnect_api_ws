const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
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
      }
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'UserID'
      }
    },
    SpaceID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'spaces',
        key: 'SpaceID'
      }
    },
    Action: {
      type: DataTypes.JSON,
      allowNull: true
    },
    Timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    Details: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'logs',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "LogID" }
        ]
      },
      {
        name: "DeviceID",
        using: "BTREE",
        fields: [
          { name: "DeviceID" }
        ]
      },
      {
        name: "UserID",
        using: "BTREE",
        fields: [
          { name: "UserID" }
        ]
      },
      {
        name: "SpaceID",
        using: "BTREE",
        fields: [
          { name: "SpaceID" }
        ]
      }
    ]
  });

  // Định nghĩa các mối quan hệ
  Log.associate = function(models) {
    Log.belongsTo(models.devices, {
      foreignKey: 'DeviceID',
      as: 'Device'
    });

    Log.belongsTo(models.users, {
      foreignKey: 'UserID',
      as: 'User'
    });

    Log.belongsTo(models.spaces, {
      foreignKey: 'SpaceID',
      as: 'Space'
    });
  };

  return Log;
};
