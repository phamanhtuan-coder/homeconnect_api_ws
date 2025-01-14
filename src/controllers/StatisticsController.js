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
            if (stat.Value) {
                totalGas += stat.Value.averageGas || 0;
                totalTemperature += stat.Value.averageTemperature || 0;
                totalHumidity += stat.Value.averageHumidity || 0;
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
                Action: {
                    [Op.contains]: { fromDevice: true } // Chỉ lấy logs từ device
                }
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

        Logs.forEach(logs => {
            if (logs.Details && logs.Details.type === 'sensorData') {
                if (logs.Details.gas !== undefined) {
                    totalGas += logs.Details.gas;
                }
                if (logs.Details.temperature !== undefined) {
                    totalTemperature += logs.Details.temperature;
                }
                if (logs.Details.humidity !== undefined) {
                    totalHumidity += logs.Details.humidity;
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

// Trả về trung bình sensor từng ngày trong khoảng thời gian nhập vào
exports.getDailyAveragesSensorForRange = async (req, res) => {
    try {
        const { deviceId, startDate, endDate } = req.params;

        if (!deviceId || !startDate || !endDate) {
            return res.status(400).json({ message: 'DeviceID, StartDate và EndDate là bắt buộc.' });
        }

        // Lấy thống kê loại DAILY_AVERAGE_SENSOR trong khoảng thời gian
        const dailyStats = await statistics.findAll({
            where: {
                DeviceID: deviceId,
                StatisticsTypeID: STATISTICS_TYPES.DAILY_AVERAGE_SENSOR,
                Date: {
                    [Op.between]: [startDate, endDate],
                }
            },
            order: [['Date', 'ASC']],
        });

        if (dailyStats.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thống kê sensor hàng ngày trong khoảng thời gian này.' });
        }

        // Tạo mảng kết quả
        const results = dailyStats.map(stat => ({
            date: stat.Date,
            averageGas: stat.Value.averageGas,
            averageTemperature: stat.Value.averageTemperature,
            averageHumidity: stat.Value.averageHumidity,
        }));

        res.status(200).json({ dailyAverages: results });
    } catch (error) {
        console.error('Error in getDailyAveragesSensorForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy trung bình sensor từng ngày trong khoảng thời gian.' });
    }
};


// hàm calculateDailyPowerUsage tính điện năng tiêu thụ hàng ngày
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

        // Lấy logs trong ngày cho thiết bị và chỉ lấy từ server
        const Logs = await logs.findAll({
            where: {
                DeviceID: deviceId,
                Timestamp: {
                    [Op.between]: [
                        new Date(`${date}T00:00:00.000Z`),
                        new Date(`${date}T23:59:59.999Z`)
                    ]
                },
                Action: {
                    [Op.contains]: { fromServer: true } // Chỉ lấy logs từ server
                }
            },
            order: [['Timestamp', 'ASC']]
        });

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
                Action: {
                    [Op.contains]: { fromServer: true } // Chỉ lấy logs từ server
                }
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

// Trả về tiêu thụ điện từng ngày trong khoảng thời gian nhập vào
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

        // Lấy thống kê loại DAILY_POWER_USAGE trong khoảng thời gian
        const dailyStats = await statistics.findAll({
            where: {
                DeviceID: deviceId,
                StatisticsTypeID: STATISTICS_TYPES.DAILY_POWER_USAGE,
                Date: {
                    [Op.between]: [startDate, endDate],
                }
            },
            order: [['Date', 'ASC']],
        });

        if (dailyStats.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy thống kê tiêu thụ điện hàng ngày trong khoảng thời gian này.' });
        }

        // Tạo mảng kết quả
        const results = dailyStats.map(stat => ({
            date: stat.Date,
            energyConsumed: stat.Value.energyConsumed,
            powerRating: stat.Value.powerRating,
            totalOnTimeHours: stat.Value.totalOnTimeHours,
        }));

        res.status(200).json({ dailyPowerUsages: results });
    } catch (error) {
        console.error('Error in getDailyPowerUsageForRange:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy tiêu thụ điện hàng ngày trong khoảng thời gian.' });
    }
};


