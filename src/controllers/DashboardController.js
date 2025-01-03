const { users, devices, alerts, logs, houses, statistics } = require('../models');

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
