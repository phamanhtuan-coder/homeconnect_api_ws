const { logs, devices, statistics, devicetypes } = require('../models');
const { Op, Sequelize } = require('sequelize'); // Thêm Sequelize vào đây
const {calculateTotalPowerOnTime} = require("../helpers/StatisticsHelper");

// Định nghĩa các loại thống kê
const STATISTICS_TYPES = {
    DAILY_AVERAGE_SENSOR: 1,   // Trung bình sensor hàng ngày
    WEEKLY_AVERAGE_SENSOR: 2,  // Trung bình sensor hàng tuần
    RANGE_AVERAGE_SENSOR: 3,   // Trung bình sensor trong khoảng thời gian
    DAILY_POWER_USAGE: 4,      // Tiêu thụ điện hàng ngày
    WEEKLY_POWER_USAGE: 5,     // Tiêu thụ điện hàng tuần
    MONTHLY_POWER_USAGE: 6,    // Tiêu thụ điện hàng tháng
};


// powerRating (Watt)
const POWER_RATINGS = {
    'Fire Alarm': 1.65,
    'LED Light 16': 5.65,
    'LED Light 24': 8.05,
};

// Ánh xạ TypeID với powerRating (Watt)
const POWER_RATINGS_BY_TYPEID = {
    1: 1.65, // Fire Alarm
    2: 5.65, // LED Light 16
    3: 8.05, // LED Light 24
};



// Tính trung bình sensor hàng ngày cho một thiết bị

exports.calculateDailyAverageSensor = async (req, res) => {
    try {
        const { deviceId, date } = req.body;

        // Xác thực đầu vào
        if (!deviceId || !date) {
            return res.status(400).json({ message: 'DeviceID và Date là bắt buộc.' });
        }

        // Sử dụng Sequelize.where và JSON_CONTAINS cho MariaDB
        const Logs = await logs.findAll({
            where: {
                DeviceID: deviceId,
                Timestamp: {
                    [Op.between]: [
                        new Date(`${date}T00:00:00.000Z`),
                        new Date(`${date}T23:59:59.999Z`)
                    ]
                },
                [Op.and]: Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromDevice: true })),
                    1
        )
            }
        });

        if (Logs.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy logs cho thiết bị trong ngày này.' });
        }

        // Tính toán trung bình cho các thuộc tính sensor
        let totalGas = 0;
        let totalTemperature = 0;
        let totalHumidity = 0;
        let count = 0;

        Logs.forEach(log => {
            let details = log.Details;
            if (typeof details === 'string') {
                try {
                    details = JSON.parse(details);
                } catch (e) {
                    console.error(`Invalid JSON in Details for LogID ${log.LogID}:`, log.Details);
                    details = null;
                }
            }
            if (details && details.type === 'sensorData') {
                if (details.gas !== undefined) {
                    totalGas += details.gas;
                }
                if (details.temperature !== undefined) {
                    totalTemperature += details.temperature;
                }
                if (details.humidity !== undefined) {
                    totalHumidity += details.humidity;
                }
                count += 1;
            }
        });

        const averageGas = count > 0 ? totalGas / count : 0;
        const averageTemperature = count > 0 ? totalTemperature / count : 0;
        const averageHumidity = count > 0 ? totalHumidity / count : 0;

        // Lấy SpaceID từ thiết bị tại thời điểm đó
        const device = await devices.findByPk(deviceId);
        const spaceId = device ? device.SpaceID : null;

        // Lưu vào bảng thống kê
        await statistics.create({
            DeviceID: deviceId,
            SpaceID: spaceId,
            Type: 'Daily Average Sensor',
            Date: date,
            Value: {
                averageGas,
                averageTemperature,
                averageHumidity
            },
            StatisticsTypeID: STATISTICS_TYPES.DAILY_AVERAGE_SENSOR,
        });

        res.status(200).json({
            message: 'Trung bình sensor hàng ngày đã được tính và lưu thành công.',
            data: {
                averageGas,
                averageTemperature,
                averageHumidity
            }
        });
    } catch (error) {
        console.error('Error in calculateDailyAverageSensor:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán trung bình sensor hàng ngày.' });
    }
};


// Tính trung bình sensor hàng tuần dựa trên 7 ngày gần nhất trong bảng thống kê
exports.calculateWeeklyAverageSensor = async (req, res) => {
    try {
        const { deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({ message: 'DeviceID là bắt buộc.' });
        }

        // Lấy 7 ngày gần nhất từ bảng thống kê loại DAILY_AVERAGE_SENSOR
        const dailyStats = await statistics.findAll({
            where: {
                DeviceID: deviceId,
                StatisticsTypeID: STATISTICS_TYPES.DAILY_AVERAGE_SENSOR,
            },
            order: [['Date', 'DESC']],
            limit: 7,
        });

        if (dailyStats.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thống kê sensor hàng ngày cho thiết bị này.' });
        }

        // Tính trung bình 7 ngày
        let totalGas = 0;
        let totalTemperature = 0;
        let totalHumidity = 0;
        let count = 0;

        dailyStats.forEach(stat => {
            let value = stat.Value;
            if (typeof value=== 'string') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    console.error(`Invalid JSON in Value for StatID ${stat.LogID}:`, stat.Value);
                   value = null;
                }
            }
            if (value) {
                totalGas += value.averageGas || 0;
                totalTemperature += value.averageTemperature || 0;
                totalHumidity += value.averageHumidity || 0;
                count += 1;
            }
        });

        const weeklyAverageGas = count > 0 ? totalGas / count : 0;
        const weeklyAverageTemperature = count > 0 ? totalTemperature / count : 0;
        const weeklyAverageHumidity = count > 0 ? totalHumidity / count : 0;

        // Lấy ngày hiện tại để đặt cho thống kê tuần
        const currentDate = new Date().toISOString().split('T')[0];

        // Lấy SpaceID từ thiết bị tại thời điểm đó
        const device = await devices.findByPk(deviceId);
        const spaceId = device ? device.SpaceID : null;

        // Lưu vào bảng thống kê
        await statistics.create({
            DeviceID: deviceId,
            SpaceID: spaceId,
            Type: 'Weekly Average Sensor',
            Date: currentDate,
            Value: {
                weeklyAverageGas,
                weeklyAverageTemperature,
                weeklyAverageHumidity
            },
            StatisticsTypeID: STATISTICS_TYPES.WEEKLY_AVERAGE_SENSOR,
        });

        res.status(200).json({
            message: 'Trung bình sensor hàng tuần đã được tính và lưu thành công.',
            data: {
                weeklyAverageGas,
                weeklyAverageTemperature,
                weeklyAverageHumidity
            }
        });
    } catch (error) {
        console.error('Error in calculateWeeklyAverageSensor:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán trung bình sensor hàng tuần.' });
    }
};


// Trả về các thông số thống kê sensor hàng tuần gần nhất của một thiết bị
exports.getWeeklyAverageSensor = async (req, res) => {
    try {
        const { deviceId } = req.params;

        if (!deviceId) {
            return res.status(400).json({ message: 'DeviceID là bắt buộc.' });
        }

        // Lấy thống kê tuần gần nhất
        const weeklyStat = await statistics.findOne({
            where: {
                DeviceID: deviceId,
                StatisticsTypeID: STATISTICS_TYPES.WEEKLY_AVERAGE_SENSOR,
            },
            order: [['Date', 'DESC']],
        });

        if (!weeklyStat) {
            return res.status(404).json({ message: 'Không tìm thấy thống kê sensor tuần cho thiết bị này.' });
        }

        res.status(200).json({
            weeklyAverage: weeklyStat.Value,
            date: weeklyStat.Date,
        });
    } catch (error) {
        console.error('Error in getWeeklyAverageSensor:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy thống kê sensor tuần.' });
    }
};

// Tính trung bình sensor dựa trên khoảng thời gian nhập vào
exports.calculateAverageSensorForRange = async (req, res) => {
    try {
        const { deviceId, startDate, endDate } = req.body;

        if (!deviceId || !startDate || !endDate) {
            return res.status(400).json({ message: 'DeviceID, StartDate và EndDate là bắt buộc.' });
        }

        // Lấy logs trong khoảng thời gian cho thiết bị và chỉ từ device
        const Logs = await logs.findAll({
            where: {
                DeviceID: deviceId,
                Timestamp: {
                    [Op.between]: [
                        new Date(`${startDate}T00:00:00.000Z`),
                        new Date(`${endDate}T23:59:59.999Z`)
                    ]
                },
                [Op.and]: Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromDevice: true })),
                    1
                )
            }
        });

        if (Logs.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy logs sensor cho thiết bị trong khoảng thời gian này.' });
        }

        // Tính toán trung bình cho các thuộc tính sensor
        let totalGas = 0;
        let totalTemperature = 0;
        let totalHumidity = 0;
        let count = 0;

        Logs.forEach(log => {
            let details = log.Details;
            if (typeof details === 'string') {
                try {
                    details = JSON.parse(details);
                } catch (e) {
                    console.error(`Invalid JSON in Details for LogID ${log.LogID}:`, log.Details);
                    details = null;
                }
            }


            if (details && details.type === 'sensorData') {
                if (details.gas !== undefined) {
                    totalGas += details.gas;
                }
                if (details.temperature !== undefined) {
                    totalTemperature += details.temperature;
                }
                if (details.humidity !== undefined) {
                    totalHumidity += details.humidity;
                }
                count += 1;
            }
        });

        const averageGas = count > 0 ? totalGas / count : 0;
        const averageTemperature = count > 0 ? totalTemperature / count : 0;
        const averageHumidity = count > 0 ? totalHumidity / count : 0;

        // Lấy SpaceID từ thiết bị tại thời điểm đó
        const device = await devices.findByPk(deviceId);
        const spaceId = device ? device.SpaceID : null;

        // Lưu vào bảng thống kê
        await statistics.create({
            DeviceID: deviceId,
            SpaceID: spaceId,
            Type: 'Range Average Sensor',
            Date: new Date(), // Sử dụng ngày hiện tại hoặc một cách xử lý phù hợp
            Value: {
                averageGas,
                averageTemperature,
                averageHumidity
            },
            StatisticsTypeID: STATISTICS_TYPES.RANGE_AVERAGE_SENSOR,
        });

        res.status(200).json({
            message: 'Trung bình sensor theo khoảng thời gian đã được tính và lưu thành công.',
            data: {
                averageGas,
                averageTemperature,
                averageHumidity
            }
        });
    } catch (error) {
        console.error('Error in calculateAverageSensorForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán trung bình sensor theo khoảng thời gian.' });
    }
};

// Tính trung bình sensor từng ngày trong khoảng thời gian nhập vào
exports.getDailyAveragesSensorForRange = async (req, res) => {
    try {
        const { deviceId, startDate, endDate } = req.params;

        if (!deviceId || !startDate || !endDate) {
            return res.status(400).json({ message: 'DeviceID, StartDate và EndDate là bắt buộc.' });
        }

        // Lấy logs trong khoảng thời gian cho thiết bị
        const logsInRange = await logs.findAll({
            where: {
                DeviceID: deviceId,
                Timestamp: {
                    [Op.between]: [
                        new Date(`${startDate}T00:00:00.000Z`),
                        new Date(`${endDate}T23:59:59.999Z`)
                    ]
                },
                [Op.and]: Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromDevice: true })),
                    1
                )
            },
            order: [['Timestamp', 'ASC']]
        });

        if (logsInRange.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy logs sensor cho thiết bị trong khoảng thời gian này.' });
        }

        // Nhóm logs theo từng ngày
        const groupedByDate = {};
        logsInRange.forEach(log => {
            const dateKey = new Date(log.Timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(log);
        });

        // Tính trung bình cho từng ngày
        const results = Object.keys(groupedByDate).map(date => {
            let totalGas = 0, totalTemperature = 0, totalHumidity = 0, count = 0;

            groupedByDate[date].forEach(log => {
                let details = log.Details;
                if (typeof details === 'string') {
                    try {
                        details = JSON.parse(details);
                    } catch (e) {
                        console.error(`Invalid JSON in Details for LogID ${log.LogID}:`, log.Details);
                        details = null;
                    }
                }

                if (details && details.type === 'sensorData') {
                    if (details.gas !== undefined) totalGas += details.gas;
                    if (details.temperature !== undefined) totalTemperature += details.temperature;
                    if (details.humidity !== undefined) totalHumidity += details.humidity;
                    count++;
                }
            });

            return {
                date,
                averageGas: count > 0 ? totalGas / count : 0,
                averageTemperature: count > 0 ? totalTemperature / count : 0,
                averageHumidity: count > 0 ? totalHumidity / count : 0
            };
        });

        res.status(200).json({ dailyAverages: results });
    } catch (error) {
        console.error('Error in getDailyAveragesSensorForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính trung bình sensor từng ngày trong khoảng thời gian.' });
    }
};



exports.calculateDailyPowerUsage = async (req, res) => {
    try {
        const { deviceId, date } = req.body;

        // Xác thực đầu vào
        if (!deviceId || !date) {
            return res.status(400).json({ message: 'DeviceID và Date là bắt buộc.' });
        }

        // Lấy thiết bị để biết TypeID
        const device = await devices.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
        }

        const typeId = device.TypeID;
        if (!typeId || !POWER_RATINGS_BY_TYPEID[typeId]) {
            return res.status(400).json({ message: 'Thiết bị không có TypeID hợp lệ hoặc không có powerRating tương ứng.' });
        }

        const powerRating = POWER_RATINGS_BY_TYPEID[typeId]; // Công suất tiêu thụ (Watt)

        // Truy vấn sử dụng JSON_CONTAINS cho cột Action
        const Logs = await logs.findAll({
            where: {
                DeviceID: deviceId,
                Timestamp: {
                    [Op.between]: [
                        new Date(`${date}T00:00:00.000Z`),
                        new Date(`${date}T23:59:59.999Z`)
                    ]
                },
                [Op.and]: Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromServer: true })),
                    1
                )
            },
            order: [['Timestamp', 'ASC']]
        });

        console.log(`Found ${Logs.length} logs`);

        if (Logs.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy logs từ server cho thiết bị trong ngày này.' });
        }

        // Tính tổng thời gian bật trong ngày
        const totalOnTimeHours = calculateTotalPowerOnTime(Logs, date, date);

        // Tính điện tiêu thụ: Power (W) * Time (h) / 1000 = Energy (kWh)
        const energyConsumed = (powerRating * totalOnTimeHours) / 1000; // Tính bằng kWh

        // Lấy SpaceID từ thiết bị tại thời điểm đó
        const spaceId = device.SpaceID;

        // Lưu vào bảng thống kê
        await statistics.create({
            DeviceID: deviceId,
            SpaceID: spaceId,
            Type: 'Daily Power Usage',
            Date: date,
            Value: {
                energyConsumed, // Tính bằng kWh
                powerRating,
                totalOnTimeHours
            },
            StatisticsTypeID: STATISTICS_TYPES.DAILY_POWER_USAGE,
        });

        res.status(200).json({
            message: 'Tiêu thụ điện hàng ngày đã được tính và lưu thành công.',
            data: {
                energyConsumed,
                powerRating,
                totalOnTimeHours
            }
        });
    } catch (error) {
        console.error('Error in calculateDailyPowerUsage:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán tiêu thụ điện hàng ngày.' });
    }
};

// Tính tiêu thụ điện hàng tuần cho một thiết bị dựa trên 7 ngày gần nhất
exports.calculateWeeklyPowerUsage = async (req, res) => {
    try {
        const { deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({ message: 'DeviceID là bắt buộc.' });
        }

        // Lấy thiết bị để biết TypeName hoặc TypeID
        const device = await devices.findByPk(deviceId, {
            include: {
                model: devicetypes,
                as: 'DeviceType',
                attributes: ['TypeName', 'TypeID']
            }
        });
        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
        }

        // Sử dụng TypeName để lấy powerRating
        const typeName = device.DeviceType ? device.DeviceType.TypeName : null;
        let powerRating;
        if (typeName && POWER_RATINGS[typeName]) {
            powerRating = POWER_RATINGS[typeName];
        } else if (device.TypeID && POWER_RATINGS_BY_TYPEID[device.TypeID]) {
            powerRating = POWER_RATINGS_BY_TYPEID[device.TypeID];
        } else {
            return res.status(400).json({ message: 'Thiết bị không có TypeName hoặc TypeID hợp lệ để lấy powerRating.' });
        }

        // Lấy 7 ngày gần nhất từ bảng thống kê loại DAILY_POWER_USAGE
        const dailyStats = await statistics.findAll({
            where: {
                DeviceID: deviceId,
                StatisticsTypeID: STATISTICS_TYPES.DAILY_POWER_USAGE,
            },
            order: [['Date', 'DESC']],
            limit: 7,
        });

        if (dailyStats.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thống kê tiêu thụ điện hàng ngày cho thiết bị này.' });
        }

        // Tính tổng điện tiêu thụ trong 7 ngày
        let totalEnergy = 0;
        let totalOnTime = 0;

        dailyStats.forEach(stat => {
            if (stat.Value) {
                totalEnergy += stat.Value.energyConsumed || 0;
                totalOnTime += stat.Value.totalOnTimeHours || 0;
            }
        });

        // Tính điện tiêu thụ trung bình hàng tuần
        const weeklyAverageEnergy = totalEnergy / dailyStats.length;
        const weeklyAverageOnTime = totalOnTime / dailyStats.length;

        // Lấy ngày hiện tại để đặt cho thống kê tuần
        const currentDate = new Date().toISOString().split('T')[0];

        // Lấy SpaceID từ thiết bị tại thời điểm đó
        const spaceId = device.SpaceID;

        // Lưu vào bảng thống kê
        await statistics.create({
            DeviceID: deviceId,
            SpaceID: spaceId,
            Type: 'Weekly Power Usage',
            Date: currentDate,
            Value: {
                weeklyAverageEnergy,
                weeklyAverageOnTime,
                powerRating
            },
            StatisticsTypeID: STATISTICS_TYPES.WEEKLY_POWER_USAGE,
        });

        res.status(200).json({
            message: 'Tiêu thụ điện hàng tuần đã được tính và lưu thành công.',
            data: {
                weeklyAverageEnergy,
                weeklyAverageOnTime,
                powerRating
            }
        });
    } catch (error) {
        console.error('Error in calculateWeeklyPowerUsage:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán tiêu thụ điện hàng tuần.' });
    }
};

// Tính tiêu thụ điện hàng tháng cho một thiết bị dựa trên logs từ server
exports.calculateMonthlyPowerUsage = async (req, res) => {
    try {
        const { deviceId, month, year } = req.body;

        if (!deviceId || !month || !year) {
            return res.status(400).json({ message: 'DeviceID, Month và Year là bắt buộc.' });
        }

        // Lấy thiết bị để biết TypeName hoặc TypeID
        const device = await devices.findByPk(deviceId, {
            include: {
                model: devicetypes,
                as: 'DeviceType',
                attributes: ['TypeName', 'TypeID']
            }
        });
        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
        }

        // Sử dụng TypeName để lấy powerRating
        const typeName = device.DeviceType ? device.DeviceType.TypeName : null;
        let powerRating;
        if (typeName && POWER_RATINGS[typeName]) {
            powerRating = POWER_RATINGS[typeName];
        } else if (device.TypeID && POWER_RATINGS_BY_TYPEID[device.TypeID]) {
            powerRating = POWER_RATINGS_BY_TYPEID[device.TypeID];
        } else {
            return res.status(400).json({ message: 'Thiết bị không có TypeName hoặc TypeID hợp lệ để lấy powerRating.' });
        }

        // Tạo chuỗi tháng định dạng YYYY-MM
        const startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setMilliseconds(endDate.getMilliseconds() - 1);

        // Lấy logs trong tháng cho thiết bị và chỉ từ server
        const Logs = await logs.findAll({
            where: {
                DeviceID: deviceId,
                Timestamp: {
                    [Op.between]: [
                        startDate,
                        endDate
                    ]
                },
                [Op.and]: Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), Sequelize.literal(`'{"fromServer": true}'`)),
                    1
                )
            },
            order: [['Timestamp', 'ASC']]
        });

        if (Logs.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy logs từ server cho thiết bị trong tháng này.' });
        }

        // Tính tổng thời gian bật trong tháng
        const totalOnTimeHours = calculateTotalPowerOnTime(
            Logs,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );

        // Tính điện tiêu thụ: Power (W) * Time (h) / 1000 = Energy (kWh)
        const energyConsumed = (powerRating * totalOnTimeHours) / 1000; // Tính bằng kWh

        // Lấy SpaceID từ thiết bị tại thời điểm đó
        const spaceId = device.SpaceID;

        // Lưu vào bảng thống kê
        await statistics.create({
            DeviceID: deviceId,
            SpaceID: spaceId,
            Type: 'Monthly Power Usage',
            Date: `${year}-${String(month).padStart(2, '0')}-01`, // Sử dụng ngày đầu tiên của tháng
            Value: {
                energyConsumed, // Tính bằng kWh
                powerRating,
                totalOnTimeHours
            },
            StatisticsTypeID: STATISTICS_TYPES.MONTHLY_POWER_USAGE,
        });

        res.status(200).json({
            message: 'Tiêu thụ điện hàng tháng đã được tính và lưu thành công.',
            data: {
                energyConsumed,
                powerRating,
                totalOnTimeHours
            }
        });
    } catch (error) {
        console.error('Error in calculateMonthlyPowerUsage:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán tiêu thụ điện hàng tháng.' });
    }
};

// Tính năng lượng tiêu thụ từng ngày trong khoảng thời gian nhập vào
exports.getDailyPowerUsageForRange = async (req, res) => {
    try {
        const { deviceId, startDate, endDate } = req.params;

        if (!deviceId || !startDate || !endDate) {
            return res.status(400).json({ message: 'DeviceID, StartDate và EndDate là bắt buộc.' });
        }

        // Lấy thiết bị để biết TypeName hoặc TypeID
        const device = await devices.findByPk(deviceId, {
            include: {
                model: devicetypes,
                as: 'DeviceType',
                attributes: ['TypeName', 'TypeID']
            }
        });
        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị.' });
        }

        // Sử dụng TypeName hoặc TypeID để lấy powerRating
        const typeName = device.DeviceType ? device.DeviceType.TypeName : null;
        let powerRating;
        if (typeName && POWER_RATINGS[typeName]) {
            powerRating = POWER_RATINGS[typeName];
        } else if (device.TypeID && POWER_RATINGS_BY_TYPEID[device.TypeID]) {
            powerRating = POWER_RATINGS_BY_TYPEID[device.TypeID];
        } else {
            return res.status(400).json({ message: 'Thiết bị không có TypeName hoặc TypeID hợp lệ để lấy powerRating.' });
        }

        // Lấy logs trong khoảng thời gian cho thiết bị
        const logsInRange = await logs.findAll({
            where: {
                DeviceID: deviceId,
                Timestamp: {
                    [Op.between]: [
                        new Date(`${startDate}T00:00:00.000Z`),
                        new Date(`${endDate}T23:59:59.999Z`)
                    ]
                },
                [Op.and]: Sequelize.where(
                    Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromServer: true })),
                    1
                )
            },
            order: [['Timestamp', 'ASC']]
        });

        if (logsInRange.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy logs từ server cho thiết bị trong khoảng thời gian này.' });
        }

        // Nhóm logs theo từng ngày
        const groupedByDate = {};
        logsInRange.forEach(log => {
            const dateKey = new Date(log.Timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
            if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
            }
            groupedByDate[dateKey].push(log);
        });

        // Tính tổng thời gian bật và năng lượng tiêu thụ mỗi ngày
        const results = Object.keys(groupedByDate).map(date => {
            const logsForDate = groupedByDate[date];

            // Tính tổng thời gian bật (giả sử action chứa trạng thái bật/tắt)
            let totalOnTimeSeconds = 0;
            let lastOnTimestamp = null;

            logsForDate.forEach(log => {
                const action = log.Action;
                if (typeof action === 'string') {
                    try {
                        const actionData = JSON.parse(action);

                        if (actionData.status === 'on') {
                            lastOnTimestamp = new Date(log.Timestamp);
                        } else if (actionData.status === 'off' && lastOnTimestamp) {
                            const offTimestamp = new Date(log.Timestamp);
                            totalOnTimeSeconds += (offTimestamp - lastOnTimestamp) / 1000; // Chuyển từ milliseconds sang seconds
                            lastOnTimestamp = null;
                        }

                    } catch (e) {
                        console.error(`Invalid JSON in Action for LogID ${log.LogID}:`, log.Action);
                    }
                }
            });

            // Nếu vẫn còn bật đến cuối ngày
            if (lastOnTimestamp) {
                const endOfDay = new Date(`${date}T23:59:59.999Z`);
                totalOnTimeSeconds += (endOfDay - lastOnTimestamp) / 1000;
            }

            const totalOnTimeHours = totalOnTimeSeconds / 3600; // Chuyển sang giờ
            const energyConsumed = (powerRating * totalOnTimeHours) / 1000; // kWh

            return {
                date,
                energyConsumed: energyConsumed.toFixed(3),  // Làm tròn 3 chữ số sau dấu phẩy
                powerRating,
                totalOnTimeHours: totalOnTimeHours.toFixed(2)  // Làm tròn 2 chữ số sau dấu phẩy
            };
        });

        res.status(200).json({ dailyPowerUsages: results });
    } catch (error) {
        console.error('Error in getDailyPowerUsageForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính năng lượng tiêu thụ hàng ngày trong khoảng thời gian.' });
    }
};

// Thống kê theo phòng


// Tính trung bình sensor cho cả phòng theo ngày
exports.calculateRoomAverageSensor = async (req, res) => {
    try {
        const { spaceId, date } = req.body;
        if (!spaceId || !date) {
            return res.status(400).json({ message: 'SpaceID và Date là bắt buộc.' });
        }

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        let totalGas = 0, totalTemperature = 0, totalHumidity = 0, count = 0;

        for (const device of devicesInRoom) {
            const Logs = await logs.findAll({
                where: {
                    DeviceID: device.DeviceID,
                    Timestamp: {
                        [Op.between]: [
                            new Date(`${date}T00:00:00.000Z`),
                            new Date(`${date}T23:59:59.999Z`)
                        ]
                    },
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromDevice: true })),
                        1
                    )
                }
            });

            Logs.forEach(log => {
                let details = log.Details;
                if (typeof details === 'string') details = JSON.parse(details);
                if (details && details.type === 'sensorData') {
                    totalGas += details.gas || 0;
                    totalTemperature += details.temperature || 0;
                    totalHumidity += details.humidity || 0;
                    count++;
                }
            });
        }

        const averageGas = count > 0 ? totalGas / count : 0;
        const averageTemperature = count > 0 ? totalTemperature / count : 0;
        const averageHumidity = count > 0 ? totalHumidity / count : 0;

        await statistics.create({
            SpaceID: spaceId,
            Type: 'Room Daily Average Sensor',
            Date: date,
            Value: { averageGas, averageTemperature, averageHumidity }
        });

        res.status(200).json({
            message: 'Trung bình sensor cho phòng đã được tính và lưu thành công.',
            data: { averageGas, averageTemperature, averageHumidity }
        });
    } catch (error) {
        console.error('Error in calculateRoomAverageSensor:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

// Tính tổng điện năng tiêu thụ cho phòng theo ngày
exports.calculateRoomPowerUsage = async (req, res) => {
    try {
        const { spaceId, date } = req.body;
        if (!spaceId || !date) {
            return res.status(400).json({ message: 'SpaceID và Date là bắt buộc.' });
        }

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        let totalEnergyConsumed = 0;

        for (const device of devicesInRoom) {
            const Logs = await logs.findAll({
                where: {
                    DeviceID: device.DeviceID,
                    Timestamp: {
                        [Op.between]: [
                            new Date(`${date}T00:00:00.000Z`),
                            new Date(`${date}T23:59:59.999Z`)
                        ]
                    },
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromServer: true })),
                        1
                    )
                }
            });

            const totalOnTimeHours = calculateTotalPowerOnTime(Logs, date, date);
            const powerRating = device.TypeID ? POWER_RATINGS_BY_TYPEID[device.TypeID] : 0;
            totalEnergyConsumed += (powerRating * totalOnTimeHours) / 1000;
        }

        await statistics.create({
            SpaceID: spaceId,
            Type: 'Room Daily Power Usage',
            Date: date,
            Value: { totalEnergyConsumed }
        });

        res.status(200).json({
            message: 'Tiêu thụ điện năng của phòng đã được tính và lưu thành công.',
            data: { totalEnergyConsumed }
        });
    } catch (error) {
        console.error('Error in calculateRoomPowerUsage:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

// Tính trung bình sensor cho phòng theo khoảng thời gian
exports.calculateRoomAverageSensorForRange = async (req, res) => {
    try {
        const { spaceId, startDate, endDate } = req.body;
        if (!spaceId || !startDate || !endDate) {
            return res.status(400).json({ message: 'SpaceID, StartDate và EndDate là bắt buộc.' });
        }

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        let totalGas = 0, totalTemperature = 0, totalHumidity = 0, count = 0;

        for (const device of devicesInRoom) {
            const Logs = await logs.findAll({
                where: {
                    DeviceID: device.DeviceID,
                    Timestamp: {
                        [Op.between]: [
                            new Date(`${startDate}T00:00:00.000Z`),
                            new Date(`${endDate}T23:59:59.999Z`)
                        ]
                    },
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromDevice: true })),
                        1
                    )
                }
            });

            Logs.forEach(log => {
                let details = log.Details;
                if (typeof details === 'string') details = JSON.parse(details);
                if (details && details.type === 'sensorData') {
                    totalGas += details.gas || 0;
                    totalTemperature += details.temperature || 0;
                    totalHumidity += details.humidity || 0;
                    count++;
                }
            });
        }

        const averageGas = count > 0 ? totalGas / count : 0;
        const averageTemperature = count > 0 ? totalTemperature / count : 0;
        const averageHumidity = count > 0 ? totalHumidity / count : 0;

        res.status(200).json({
            message: 'Trung bình sensor theo khoảng thời gian đã được tính.',
            data: { averageGas, averageTemperature, averageHumidity }
        });
    } catch (error) {
        console.error('Error in calculateRoomAverageSensorForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

exports.calculateWeeklyRoomAverageSensor = async (req, res) => {
    try {
        const { spaceId } = req.body;
        if (!spaceId) {
            return res.status(400).json({ message: 'SpaceID là bắt buộc.' });
        }

        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        let totalGas = 0, totalTemperature = 0, totalHumidity = 0, count = 0;

        for (const device of devicesInRoom) {
            const Logs = await logs.findAll({
                where: {
                    DeviceID: device.DeviceID,
                    Timestamp: {
                        [Op.between]: [lastWeek, today]
                    },
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromDevice: true })),
                        1
                    )
                }
            });

            Logs.forEach(log => {
                let details = JSON.parse(log.Details);
                if (details && details.type === 'sensorData') {
                    totalGas += details.gas || 0;
                    totalTemperature += details.temperature || 0;
                    totalHumidity += details.humidity || 0;
                    count++;
                }
            });
        }

        const averageGas = count > 0 ? totalGas / count : 0;
        const averageTemperature = count > 0 ? totalTemperature / count : 0;
        const averageHumidity = count > 0 ? totalHumidity / count : 0;

        res.status(200).json({
            message: 'Trung bình sensor hàng tuần đã được tính.',
            data: { averageGas, averageTemperature, averageHumidity }
        });
    } catch (error) {
        console.error('Error in calculateWeeklyRoomAverageSensor:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

exports.calculateMonthlyRoomAverageSensor = async (req, res) => {
    try {
        const { spaceId } = req.body;
        if (!spaceId) {
            return res.status(400).json({ message: 'SpaceID là bắt buộc.' });
        }

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        let totalGas = 0, totalTemperature = 0, totalHumidity = 0, count = 0;

        for (const device of devicesInRoom) {
            const Logs = await logs.findAll({
                where: {
                    DeviceID: device.DeviceID,
                    Timestamp: {
                        [Op.between]: [firstDayOfMonth, today]
                    },
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromDevice: true })),
                        1
                    )
                }
            });

            Logs.forEach(log => {
                let details = JSON.parse(log.Details);
                if (details && details.type === 'sensorData') {
                    totalGas += details.gas || 0;
                    totalTemperature += details.temperature || 0;
                    totalHumidity += details.humidity || 0;
                    count++;
                }
            });
        }

        const averageGas = count > 0 ? totalGas / count : 0;
        const averageTemperature = count > 0 ? totalTemperature / count : 0;
        const averageHumidity = count > 0 ? totalHumidity / count : 0;

        res.status(200).json({
            message: 'Trung bình sensor hàng tháng đã được tính.',
            data: { averageGas, averageTemperature, averageHumidity }
        });
    } catch (error) {
        console.error('Error in calculateMonthlyRoomAverageSensor:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

exports.calculateWeeklyRoomPowerUsage = async (req, res) => {
    try {
        const { spaceId } = req.body;
        if (!spaceId) {
            return res.status(400).json({ message: 'SpaceID là bắt buộc.' });
        }

        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        let totalEnergyConsumed = 0;

        for (const device of devicesInRoom) {
            const Logs = await logs.findAll({
                where: {
                    DeviceID: device.DeviceID,
                    Timestamp: {
                        [Op.between]: [lastWeek, today]
                    },
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromServer: true })),
                        1
                    )
                }
            });

            const totalOnTimeHours = calculateTotalPowerOnTime(Logs, lastWeek, today);
            const powerRating = device.TypeID ? POWER_RATINGS_BY_TYPEID[device.TypeID] : 0;
            totalEnergyConsumed += (powerRating * totalOnTimeHours) / 1000;
        }

        res.status(200).json({
            message: 'Tiêu thụ điện năng hàng tuần đã được tính.',
            data: { totalEnergyConsumed }
        });
    } catch (error) {
        console.error('Error in calculateWeeklyRoomPowerUsage:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

exports.calculateMonthlyRoomPowerUsage = async (req, res) => {
    try {
        const { spaceId } = req.body;
        if (!spaceId) {
            return res.status(400).json({ message: 'SpaceID là bắt buộc.' });
        }

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        let totalEnergyConsumed = 0;

        for (const device of devicesInRoom) {
            const Logs = await logs.findAll({
                where: {
                    DeviceID: device.DeviceID,
                    Timestamp: {
                        [Op.between]: [firstDayOfMonth, today]
                    },
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromServer: true })),
                        1
                    )
                }
            });

            const totalOnTimeHours = calculateTotalPowerOnTime(Logs, firstDayOfMonth, today);
            const powerRating = device.TypeID ? POWER_RATINGS_BY_TYPEID[device.TypeID] : 0;
            totalEnergyConsumed += (powerRating * totalOnTimeHours) / 1000;
        }

        res.status(200).json({
            message: 'Tiêu thụ điện năng hàng tháng đã được tính.',
            data: { totalEnergyConsumed }
        });
    } catch (error) {
        console.error('Error in calculateMonthlyRoomPowerUsage:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

exports.calculateRoomPowerUsageForRange = async (req, res) => {
    try {
        const { spaceId, startDate, endDate } = req.body;
        if (!spaceId || !startDate || !endDate) {
            return res.status(400).json({ message: 'SpaceID, StartDate và EndDate là bắt buộc.' });
        }

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        let totalEnergyConsumed = 0;

        for (const device of devicesInRoom) {
            const Logs = await logs.findAll({
                where: {
                    DeviceID: device.DeviceID,
                    Timestamp: {
                        [Op.between]: [new Date(startDate), new Date(endDate)]
                    },
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromServer: true })),
                        1
                    )
                }
            });

            const totalOnTimeHours = calculateTotalPowerOnTime(Logs, startDate, endDate);
            const powerRating = device.TypeID ? POWER_RATINGS_BY_TYPEID[device.TypeID] : 0;
            totalEnergyConsumed += (powerRating * totalOnTimeHours) / 1000;
        }

        res.status(200).json({
            message: 'Tiêu thụ điện năng theo khoảng ngày đã được tính.',
            data: { totalEnergyConsumed }
        });
    } catch (error) {
        console.error('Error in calculateRoomPowerUsageForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

exports.getDailyRoomAverageSensorForRange = async (req, res) => {
    try {
        const { spaceId, startDate, endDate } = req.body;
        if (!spaceId || !startDate || !endDate) {
            return res.status(400).json({ message: 'SpaceID, StartDate và EndDate là bắt buộc.' });
        }

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        const results = [];
        const currentDate = new Date(startDate);

        while (currentDate <= new Date(endDate)) {
            let totalGas = 0, totalTemperature = 0, totalHumidity = 0, count = 0;

            for (const device of devicesInRoom) {
                const Logs = await logs.findAll({
                    where: {
                        DeviceID: device.DeviceID,
                        Timestamp: {
                            [Op.between]: [
                                new Date(currentDate.toISOString().split('T')[0] + 'T00:00:00.000Z'),
                                new Date(currentDate.toISOString().split('T')[0] + 'T23:59:59.999Z')
                            ]
                        },
                        [Op.and]: Sequelize.where(
                            Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromDevice: true })),
                            1
                        )
                    }
                });

                Logs.forEach(log => {
                    let details = log.Details;
                    if (typeof details === 'string') details = JSON.parse(details);
                    if (details && details.type === 'sensorData') {
                        totalGas += details.gas || 0;
                        totalTemperature += details.temperature || 0;
                        totalHumidity += details.humidity || 0;
                        count++;
                    }
                });
            }

            results.push({
                date: currentDate.toISOString().split('T')[0],
                averageGas: count > 0 ? totalGas / count : 0,
                averageTemperature: count > 0 ? totalTemperature / count : 0,
                averageHumidity: count > 0 ? totalHumidity / count : 0
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.status(200).json({
            message: 'Dữ liệu trung bình sensor từng ngày đã được tính.',
            data: results
        });
    } catch (error) {
        console.error('Error in getDailyRoomAverageSensorForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

exports.getDailyRoomPowerUsageForRange = async (req, res) => {
    try {
        const { spaceId, startDate, endDate } = req.params;

        if (!spaceId || !startDate || !endDate) {
            return res.status(400).json({ message: 'SpaceID, StartDate và EndDate là bắt buộc.' });
        }

        const devicesInRoom = await devices.findAll({ where: { SpaceID: spaceId } });
        if (devicesInRoom.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị trong phòng này.' });
        }

        const results = [];
        const currentDate = new Date(startDate);

        while (currentDate <= new Date(endDate)) {
            let totalEnergyConsumed = 0;

            for (const device of devicesInRoom) {
                const Logs = await logs.findAll({
                    where: {
                        DeviceID: device.DeviceID,
                        Timestamp: {
                            [Op.between]: [
                                new Date(currentDate.toISOString().split('T')[0] + 'T00:00:00.000Z'),
                                new Date(currentDate.toISOString().split('T')[0] + 'T23:59:59.999Z')
                            ]
                        },
                        [Op.and]: Sequelize.where(
                            Sequelize.fn('JSON_CONTAINS', Sequelize.col('Action'), JSON.stringify({ fromServer: true })),
                            1
                        )
                    }
                });

                const totalOnTimeHours = calculateTotalPowerOnTime(Logs, currentDate, currentDate);
                const powerRating = device.TypeID ? POWER_RATINGS_BY_TYPEID[device.TypeID] : 0;
                totalEnergyConsumed += (powerRating * totalOnTimeHours) / 1000;
            }

            results.push({
                date: currentDate.toISOString().split('T')[0],
                totalEnergyConsumed: totalEnergyConsumed.toFixed(3)  // Làm tròn 3 chữ số
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        res.status(200).json({
            message: 'Danh sách tiêu thụ điện năng hàng ngày đã được tính.',
            data: results
        });
    } catch (error) {
        console.error('Error in getDailyRoomPowerUsageForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi tính toán.' });
    }
};

