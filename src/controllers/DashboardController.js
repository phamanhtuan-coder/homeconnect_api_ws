const { users, devices, alerts, logs, houses, statistics } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
/**
 * Tổng hợp dữ liệu dashboard (Get Dashboard Overview)
 */
exports.getDashboardOverview = async (req, res) => {
    try {
        const userId = req.user.id;

        // Đếm tổng số người dùng (Admin only)
        const totalUsers = await users.count();

        // Đếm số lượng thiết bị thuộc người dùng
        const totalDevices = await devices.count({ where: { UserID: userId } });

        // Đếm số thiết bị đang hoạt động và không hoạt động
        const activeDevices = await devices.count({ where: { PowerStatus: true, UserID: userId } });
        const inactiveDevices = totalDevices - activeDevices;

        // Đếm tổng số cảnh báo
        const totalAlerts = await alerts.count({ where: { Status: false } });

        // Đếm tổng số nhà và không gian của người dùng
        const totalHouses = await houses.count({ where: { UserID: userId } });

        // Lấy 5 nhật ký hoạt động gần nhất
        const recentLogs = await logs.findAll({
            where: { UserID: userId },
            limit: 5,
            order: [['Timestamp', 'DESC']]
        });

        // Trả về dữ liệu tổng hợp
        res.status(200).json({
            overview: {
                totalUsers,
                totalDevices,
                activeDevices,
                inactiveDevices,
                totalAlerts,
                totalHouses,
                recentLogs
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy dữ liệu thống kê thiết bị theo ngày (Get Device Statistics)
 */
exports.getDeviceStatistics = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;

        const stats = await statistics.findAll({
            where: {
                UserID: userId,
                Date: {
                    [Op.between]: [startDate, endDate]
                }
            }
        });

        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy danh sách cảnh báo chưa xử lý (Get Pending Alerts)
 */
exports.getPendingAlerts = async (req, res) => {
    try {
        const userId = req.user.id;

        const pendingAlerts = await alerts.findAll({
            where: { Status: false, UserID: userId }
        });

        res.status(200).json(pendingAlerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



/**
 * Tính trung bình nhiệt độ, độ ẩm và năng lượng theo từng phòng
 */
exports.getRoomAverages = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = moment().startOf('day');
        const startDate = moment().subtract(6, 'days').startOf('day');

        // Lấy tất cả logs của thiết bị trong 7 ngày gần nhất
        const deviceLogs = await logs.findAll({
            where: {
                UserID: userId,
                Timestamp: {
                    [Op.between]: [startDate.toDate(), today.toDate()]
                }
            },
            include: {
                model: devices,
                as: 'Device',
                where: { TypeID: { [Op.notIn]: [1] } }, // Loại thiết bị không cảm biến (như bóng đèn)
            },
            order: [['Timestamp', 'ASC']]
        });

        const roomData = {};

        // Phân loại logs theo phòng (spaces)
        deviceLogs.forEach((log) => {
            const spaceId = log.SpaceID;
            const { energy, temperature, humidity } = log.Action;

            if (!roomData[spaceId]) {
                roomData[spaceId] = {
                    energy: 0,
                    temperature: 0,
                    humidity: 0,
                    count: 0
                };
            }

            roomData[spaceId].energy += energy || 0;
            roomData[spaceId].temperature += temperature || 0;
            roomData[spaceId].humidity += humidity || 0;
            roomData[spaceId].count += 1;
        });

        // Tính trung bình cho từng phòng
        Object.keys(roomData).forEach((spaceId) => {
            const room = roomData[spaceId];
            room.temperature = room.count ? (room.temperature / room.count) : null;
            room.humidity = room.count ? (room.humidity / room.count) : null;
        });

        res.status(200).json({
            message: 'Room average statistics fetched successfully',
            roomStatistics: roomData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Tính trung bình nhiệt độ, độ ẩm và điện năng cho toàn bộ nhà
 */
exports.getHouseAverages = async (req, res) => {
    try {
        const userId = req.user.id;
        const today = moment().startOf('day');
        const startDate = moment().subtract(6, 'days').startOf('day');

        // Lấy logs của tất cả thiết bị thuộc user
        const deviceLogs = await logs.findAll({
            where: {
                UserID: userId,
                Timestamp: {
                    [Op.between]: [startDate.toDate(), today.toDate()]
                }
            },
            include: {
                model: devices,
                as: 'Device',
                where: { TypeID: { [Op.notIn]: [1] } },  // Loại thiết bị không cảm biến
            },
            order: [['Timestamp', 'ASC']]
        });

        const houseData = {};

        // Phân loại logs theo nhà (houses)
        deviceLogs.forEach((log) => {
            const houseId = log.Device.HouseID;  // Giả định thiết bị có liên kết với nhà
            const { energy, temperature, humidity } = log.Action;

            if (!houseData[houseId]) {
                houseData[houseId] = {
                    energy: 0,
                    temperature: 0,
                    humidity: 0,
                    count: 0
                };
            }

            houseData[houseId].energy += energy || 0;
            houseData[houseId].temperature += temperature || 0;
            houseData[houseId].humidity += humidity || 0;
            houseData[houseId].count += 1;
        });

        // Tính trung bình cho từng nhà
        Object.keys(houseData).forEach((houseId) => {
            const house = houseData[houseId];
            house.temperature = house.count ? (house.temperature / house.count) : null;
            house.humidity = house.count ? (house.humidity / house.count) : null;
        });

        res.status(200).json({
            message: 'House average statistics fetched successfully',
            houseStatistics: houseData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};