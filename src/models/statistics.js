const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('statistics', {
    StatID: {
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
    Type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    Value: {
      type: DataTypes.JSON,
      allowNull: true
    },
    StatisticsTypeID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'statisticstypes',
        key: 'StatisticsTypeID'
      }
    }
  }, {
    sequelize,
    tableName: 'statistics',
    timestamps: true,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "StatID" },
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
        name: "StatisticsTypeID",
        using: "BTREE",
        fields: [
          { name: "StatisticsTypeID" },
        ]
      },
    ]
  });
};
