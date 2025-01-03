const { synctracking, devices } = require('../models');

/**
 * Tạo hoặc cập nhật thông tin đồng bộ (Create or Update Sync)
 */
exports.createOrUpdateSync = async (req, res) => {
    try {
        const userId = req.user.id;
        const { DeviceID, DeviceName, IPAddress, SyncStatus } = req.body;

        // Kiểm tra thiết bị có tồn tại và thuộc người dùng không
        const device = await devices.findOne({
            where: { DeviceID, UserID: userId }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Tìm kiếm bản ghi sync hoặc tạo mới nếu không tồn tại
        const [sync, created] = await synctracking.findOrCreate({
            where: { DeviceID },
            defaults: {
                UserID: userId,
                DeviceName,
                IPAddress,
                SyncStatus,
                LastSyncedAt: new Date()
            }
        });

        if (!created) {
            // Nếu tồn tại thì cập nhật thông tin
            await sync.update({
                DeviceName,
                IPAddress,
                SyncStatus,
                LastSyncedAt: new Date()
            });
        }

        res.status(200).json({ message: 'Sync data updated', sync });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy danh sách trạng thái đồng bộ của người dùng (Get User Sync List)
 */
exports.getUserSyncList = async (req, res) => {
    try {
        const userId = req.user.id;

        const syncList = await synctracking.findAll({
            where: { UserID: userId },
            include: { model: devices, as: 'Device' }
        });

        res.status(200).json(syncList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy trạng thái đồng bộ cụ thể theo DeviceID (Get Sync by Device)
 */
exports.getSyncByDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const userId = req.user.id;

        const sync = await synctracking.findOne({
            where: { DeviceID: deviceId, UserID: userId },
            include: { model: devices, as: 'Device' }
        });

        if (!sync) {
            return res.status(404).json({ error: 'No sync data found for this device' });
        }

        res.status(200).json(sync);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cập nhật địa chỉ IP hoặc trạng thái đồng bộ của thiết bị
 */
exports.updateSyncStatus = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const userId = req.user.id;
        const { IPAddress, SyncStatus } = req.body;

        const sync = await synctracking.findOne({
            where: { DeviceID: deviceId, UserID: userId }
        });

        if (!sync) {
            return res.status(404).json({ error: 'Sync record not found' });
        }

        await sync.update({
            IPAddress,
            SyncStatus,
            LastSyncedAt: new Date()
        });

        res.status(200).json({ message: 'Sync record updated successfully', sync });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Xóa bản ghi đồng bộ của thiết bị
 */
exports.deleteSyncRecord = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const userId = req.user.id;

        const sync = await synctracking.findOne({
            where: { DeviceID: deviceId, UserID: userId }
        });

        if (!sync) {
            return res.status(404).json({ error: 'Sync record not found' });
        }

        await sync.destroy();
        res.status(200).json({ message: 'Sync record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
