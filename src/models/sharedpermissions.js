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
    },
    OwnerUserID: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    // Người nhận thiết bị
    SharedPermissions.belongsTo(models.users, {
      foreignKey: 'SharedWithUserID',
      as: 'SharedWithUser'
    });

    // Người chia sẻ thiết bị
    SharedPermissions.belongsTo(models.users, {
      foreignKey: 'OwnerUserID',
      as: 'OwnerUser'
    });

    // Thiết bị liên quan đến sharedpermissions
    SharedPermissions.belongsTo(models.devices, {
      foreignKey: 'DeviceID',
      as: 'Device'
    });
  };

  return SharedPermissions;
};
