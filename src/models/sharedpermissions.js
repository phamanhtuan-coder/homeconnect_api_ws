const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const SharedPermissions = sequelize.define('sharedpermissions', {
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
    timestamps: true
  });

  // Định nghĩa các association trong model
  SharedPermissions.associate = (models) => {
    SharedPermissions.belongsTo(models.users, {
      foreignKey: 'SharedWithUserID',
      as: 'SharedWithUser'
    });

    SharedPermissions.belongsTo(models.devices, {
      foreignKey: 'DeviceID',
      as: 'Device'
    });
  };

  return SharedPermissions;
};
