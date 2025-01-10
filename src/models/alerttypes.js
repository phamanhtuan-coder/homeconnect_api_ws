module.exports = function (sequelize, DataTypes) {
  const AlertTypes = sequelize.define('alerttypes', {
    AlertTypeID: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    AlertTypeName: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'alerttypes',
    timestamps: false
  });

  // Định nghĩa association
  AlertTypes.associate = (models) => {
    AlertTypes.hasMany(models.alerts, {
      foreignKey: 'AlertTypeID',
      as: 'Alerts'
    });
  };

  return AlertTypes;
};
