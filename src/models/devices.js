const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('devices', {
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
    SpaceID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'spaces',
        key: 'SpaceID'
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
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "DeviceID" },
        ]
      },
      {
        name: "TypeID",
        using: "BTREE",
        fields: [
          { name: "TypeID" },
        ]
      },
      {
        name: "SpaceID",
        using: "BTREE",
        fields: [
          { name: "SpaceID" },
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
