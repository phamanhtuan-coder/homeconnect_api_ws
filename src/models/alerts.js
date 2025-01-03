const Sequelize = require('sequelize');
module.exports = function (sequelize, DataTypes) {
  const Alerts = sequelize.define('alerts', {
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
    timestamps: false
  });

  // Định nghĩa các association trong model
  Alerts.associate = (models) => {
    Alerts.belongsTo(models.devices, {
      foreignKey: 'DeviceID',
      as: 'Device'
    });

    Alerts.belongsTo(models.alerttypes, {
      foreignKey: 'AlertTypeID',
      as: 'AlertType'
    });

    Alerts.belongsTo(models.spaces, {
      foreignKey: 'SpaceID',
      as: 'Space'
    });
  };

  return Alerts;
};
