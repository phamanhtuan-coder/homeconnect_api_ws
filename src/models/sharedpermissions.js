const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const SharedPermission = sequelize.define('sharedpermissions', {
    PermissionID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    DeviceID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    SharedWithUserID: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    CreatedAt:{
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'sharedpermissions',
    timestamps:false
  });

  SharedPermission.associate = function (models) {
    SharedPermission.belongsTo(models.devices, {
      foreignKey: 'DeviceID',
      as: 'Device'
    });

    SharedPermission.belongsTo(models.users, {
      foreignKey: 'SharedWithUserID',
      as: 'SharedWithUser'
    });
  };

  return SharedPermission;
};
