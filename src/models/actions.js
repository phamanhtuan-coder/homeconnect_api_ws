const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('actions', {
    ActionID: {
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
    ActionName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    Parameters: {
      type: DataTypes.JSON,
      allowNull: true
    },
    Priority: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'actions',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "ActionID" },
        ]
      },
      {
        name: "TypeID",
        using: "BTREE",
        fields: [
          { name: "TypeID" },
        ]
      },
    ]
  });
};
