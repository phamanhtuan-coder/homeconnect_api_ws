const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('alerts', {
    AlertID: {
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
    SpaceID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'spaces',
        key: 'SpaceID'
      }
    },
    TypeID: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'devicetypes',
        key: 'TypeID'
      }
    },
    Message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    Timestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.fn('now')
    },
    Status: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    },
    AlertTypeID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'alerttypes',
        key: 'AlertTypeID'
      }
    }
  }, {
    sequelize,
    tableName: 'alerts',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "AlertID" },
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
        name: "SpaceID",
        using: "BTREE",
        fields: [
          { name: "SpaceID" },
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
        name: "AlertTypeID",
        using: "BTREE",
        fields: [
          { name: "AlertTypeID" },
        ]
      },
    ]
  });
};
