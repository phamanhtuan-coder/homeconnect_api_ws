const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('synctracking', {
    SyncID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    UserID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'UserID'
      }
    },
    DeviceName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    DeviceID: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    IPAddress: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    LastSyncedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    SyncStatus: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'synctracking',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "SyncID" },
        ]
      },
      {
        name: "UserID",
        using: "BTREE",
        fields: [
          { name: "UserID" },
        ]
      },
    ]
  });
};
