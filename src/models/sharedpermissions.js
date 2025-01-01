const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sharedpermissions', {
    PermissionID: {
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
    SharedWithUserID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'UserID'
      }
    }
  }, {
    sequelize,
    tableName: 'sharedpermissions',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "PermissionID" },
        ]
      },
      {
        name: "DeviceID",
        using: "BTREE",
        fields: [
          { name: "DeviceID" },
        ]
      },
      {
        name: "SharedWithUserID",
        using: "BTREE",
        fields: [
          { name: "SharedWithUserID" },
        ]
      },
    ]
  });
};
