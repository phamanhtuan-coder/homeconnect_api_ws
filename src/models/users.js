const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const Users = sequelize.define('users', {
    UserID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    Name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    Email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "Email"
    },
    EmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    },
    PasswordHash: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'users',
    timestamps: true
  });

  // Định nghĩa các association trong model
  Users.associate = (models) => {
    // Người dùng sở hữu nhiều thiết bị
    Users.hasMany(models.devices, {
      foreignKey: 'UserID',
      as: 'OwnedDevices'
    });

    // Người dùng có thể sinh ra nhiều log hoạt động
    Users.hasMany(models.logs, {
      foreignKey: 'UserID',
      as: 'Logs'
    });

    // Thiết bị mà người dùng được chia sẻ (user nhận)
    Users.hasMany(models.sharedpermissions, {
      foreignKey: 'SharedWithUserID',
      as: 'DevicesSharedWithUser'
    });

    // Thiết bị mà người dùng chia sẻ cho người khác (user chia sẻ đi)
    Users.hasMany(models.sharedpermissions, {
      foreignKey: 'OwnerUserID',  // Người chia sẻ thiết bị
      as: 'DevicesUserShared'
    });
  };

  return Users;
};
