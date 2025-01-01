const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('attributes', {
    AttributeID: {
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
    AttributeName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    DefaultValue: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    IsDynamic: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    },
    IsDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'attributes',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "AttributeID" },
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
