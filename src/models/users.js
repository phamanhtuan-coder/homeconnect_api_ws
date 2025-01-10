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
        unique: true
      },
      EmailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      VerificationCode: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      VerificationExpiry: {
        type: DataTypes.DATE,
        allowNull: true
      },
      PasswordHash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      ProfileImage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      Phone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      Address: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      DateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, {
      sequelize,
      tableName: 'users',
      timestamps: false  // Loại bỏ timestamps để tránh updatedAt tự sinh
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


  };

  return Users;
};
