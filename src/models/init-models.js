var DataTypes = require("sequelize").DataTypes;
var _actions = require("./actions");
var _alerts = require("./alerts");
var _alerttypes = require("./alerttypes");
var _attributes = require("./attributes");
var _devices = require("./devices");
var _devicetypes = require("./devicetypes");
var _houses = require("./houses");
var _logs = require("./logs");
var _sharedpermissions = require("./sharedpermissions");
var _spaces = require("./spaces");
var _statistics = require("./statistics");
var _statisticstypes = require("./statisticstypes");
var _synctracking = require("./synctracking");
var _users = require("./users");

function initModels(sequelize) {
  var actions = _actions(sequelize, DataTypes);
  var alerts = _alerts(sequelize, DataTypes);
  var alerttypes = _alerttypes(sequelize, DataTypes);
  var attributes = _attributes(sequelize, DataTypes);
  var devices = _devices(sequelize, DataTypes);
  var devicetypes = _devicetypes(sequelize, DataTypes);
  var houses = _houses(sequelize, DataTypes);
  var logs = _logs(sequelize, DataTypes);
  var sharedpermissions = _sharedpermissions(sequelize, DataTypes);
  var spaces = _spaces(sequelize, DataTypes);
  var statistics = _statistics(sequelize, DataTypes);
  var statisticstypes = _statisticstypes(sequelize, DataTypes);
  var synctracking = _synctracking(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  alerts.belongsTo(alerttypes, { as: "AlertType", foreignKey: "AlertTypeID"});
  alerttypes.hasMany(alerts, { as: "alerts", foreignKey: "AlertTypeID"});
  alerts.belongsTo(devices, { as: "Device", foreignKey: "DeviceID"});
  devices.hasMany(alerts, { as: "alerts", foreignKey: "DeviceID"});
  logs.belongsTo(devices, { as: "Device", foreignKey: "DeviceID"});
  devices.hasMany(logs, { as: "logs", foreignKey: "DeviceID"});
  sharedpermissions.belongsTo(devices, { as: "Device", foreignKey: "DeviceID"});
  devices.hasMany(sharedpermissions, { as: "sharedpermissions", foreignKey: "DeviceID"});
  statistics.belongsTo(devices, { as: "Device", foreignKey: "DeviceID"});
  devices.hasMany(statistics, { as: "statistics", foreignKey: "DeviceID"});
  actions.belongsTo(devicetypes, { as: "Type", foreignKey: "TypeID"});
  devicetypes.hasMany(actions, { as: "actions", foreignKey: "TypeID"});
  alerts.belongsTo(devicetypes, { as: "Type", foreignKey: "TypeID"});
  devicetypes.hasMany(alerts, { as: "alerts", foreignKey: "TypeID"});
  attributes.belongsTo(devicetypes, { as: "Type", foreignKey: "TypeID"});
  devicetypes.hasMany(attributes, { as: "attributes", foreignKey: "TypeID"});
  devices.belongsTo(devicetypes, { as: "Type", foreignKey: "TypeID"});
  devicetypes.hasMany(devices, { as: "devices", foreignKey: "TypeID"});
  spaces.belongsTo(houses, { as: "House", foreignKey: "HouseID"});
  houses.hasMany(spaces, { as: "spaces", foreignKey: "HouseID"});
  alerts.belongsTo(spaces, { as: "Space", foreignKey: "SpaceID"});
  spaces.hasMany(alerts, { as: "alerts", foreignKey: "SpaceID"});
  devices.belongsTo(spaces, { as: "Space", foreignKey: "SpaceID"});
  spaces.hasMany(devices, { as: "devices", foreignKey: "SpaceID"});
  logs.belongsTo(spaces, { as: "Space", foreignKey: "SpaceID"});
  spaces.hasMany(logs, { as: "logs", foreignKey: "SpaceID"});
  statistics.belongsTo(spaces, { as: "Space", foreignKey: "SpaceID"});
  spaces.hasMany(statistics, { as: "statistics", foreignKey: "SpaceID"});
  statistics.belongsTo(statisticstypes, { as: "StatisticsType", foreignKey: "StatisticsTypeID"});
  statisticstypes.hasMany(statistics, { as: "statistics", foreignKey: "StatisticsTypeID"});
  devices.belongsTo(users, { as: "User", foreignKey: "UserID"});
  users.hasMany(devices, { as: "devices", foreignKey: "UserID"});
  houses.belongsTo(users, { as: "User", foreignKey: "UserID"});
  users.hasMany(houses, { as: "houses", foreignKey: "UserID"});
  logs.belongsTo(users, { as: "User", foreignKey: "UserID"});
  users.hasMany(logs, { as: "logs", foreignKey: "UserID"});
  sharedpermissions.belongsTo(users, { as: "SharedWithUser", foreignKey: "SharedWithUserID"});
  users.hasMany(sharedpermissions, { as: "sharedpermissions", foreignKey: "SharedWithUserID"});
  synctracking.belongsTo(users, { as: "User", foreignKey: "UserID"});
  users.hasMany(synctracking, { as: "synctrackings", foreignKey: "UserID"});

  return {
    actions,
    alerts,
    alerttypes,
    attributes,
    devices,
    devicetypes,
    houses,
    logs,
    sharedpermissions,
    spaces,
    statistics,
    statisticstypes,
    synctracking,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
