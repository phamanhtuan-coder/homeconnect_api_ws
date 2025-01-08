// syncTrackingController.js
const { synctracking} = require('../models');

/**
 * [GET] Lấy tất cả bản ghi SyncTracking
 */
exports.getAllSyncTracking = async (req, res, next) => {
    try {
        const data = await synctracking.findAll();
        return res.status(200).json(data);
    } catch (error) {
        return next(error);
    }
};

/**
 * [GET] Lấy danh sách SyncTracking theo UserID
 *  - Giả sử ta lấy userId từ token auth => req.user.id
 *  - Hoặc bạn có thể lấy từ params (req.params.userId), tuỳ logic dự án.
 */
exports.getSyncTrackingByUserId = async (req, res, next) => {
    try {
        // Nếu bạn muốn lấy từ middleware auth, giả sử:
        const userId = req.user.id;

        // Nếu bạn muốn lấy từ params thì:
        // const { userId } = req.params;

        const data = await synctracking.findAll({ where: { UserID: userId } });
        return res.status(200).json(data);
    } catch (error) {
        return next(error);
    }
};

/**
 * [GET] Lấy một bản ghi SyncTracking theo SyncID
 */
exports.getSyncTrackingById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const syncItem = await synctracking.findOne({ where: { SyncID: id } });

        if (!syncItem) {
            return res.status(404).json({ message: 'Không tìm thấy bản ghi.' });
        }

        return res.status(200).json(syncItem);
    } catch (error) {
        return next(error);
    }
};

/**
 * [POST] Tạo mới một bản ghi SyncTracking
 */
exports.createSyncTracking = async (req, res, next) => {
    try {
        // Giả sử userId lấy từ auth middleware
        const userId = req.user.id;

        const {
            DeviceID,
            IpAddress,
            DeviceName,
            SyncStatus
        } = req.body;

        const newSyncTracking = await synctracking.create({
            UserID: userId,
            DeviceID,
            IpAddress,
            DeviceName,
            SyncStatus
        });

        return res.status(201).json(newSyncTracking);
    } catch (error) {
        return next(error);
    }
};

/**
 * [PUT] Cập nhật thông tin bản ghi SyncTracking
 */
exports.updateSyncTracking = async (req, res, next) => {
    try {
        const { id } = req.params; // SyncID
        const {
            DeviceID,
            IpAddress,
            DeviceName,
            SyncStatus
        } = req.body;

        const syncItem = await synctracking.findOne({ where: { SyncID: id } });

        if (!syncItem) {
            return res.status(404).json({ message: 'Không tìm thấy bản ghi để cập nhật.' });
        }

        // Cập nhật các trường (nếu có truyền lên)
        if (typeof DeviceID !== 'undefined') {
            syncItem.DeviceID = DeviceID;
        }
        if (typeof IpAddress !== 'undefined') {
            syncItem.IpAddress = IpAddress;
        }
        if (typeof DeviceName !== 'undefined') {
            syncItem.DeviceName = DeviceName;
        }
        if (typeof SyncStatus !== 'undefined') {
            syncItem.SyncStatus = SyncStatus;
        }

        await syncItem.save();

        return res.status(200).json(syncItem);
    } catch (error) {
        return next(error);
    }
};

/**
 * [DELETE] Xoá một bản ghi SyncTracking
 */
exports.deleteSyncTracking = async (req, res, next) => {
    try {
        const { id } = req.params; // SyncID
        const syncItem = await synctracking.findOne({ where: { SyncID: id } });

        if (!syncItem) {
            return res.status(404).json({ message: 'Không tìm thấy bản ghi để xoá.' });
        }

        await syncItem.destroy();

        return res.status(200).json({ message: 'Xoá bản ghi thành công.' });
    } catch (error) {
        return next(error);
    }
};

/**
 * [POST] Kiểm tra tình trạng sync giữa thiết bị (mobile) và CSDL
 *  - Điện thoại sẽ gửi { deviceId, localUpdatedAt } (định dạng ISOString)
 *  - Ta so sánh với trường updatedAt trên server.
 *  - Nếu trùng nhau => syncStatus = true, ngược lại => false.
 */
exports.checkSyncStatus = async (req, res, next) => {
    try {
        const { deviceId, localUpdatedAt } = req.body;

        // Tìm SyncTracking cho deviceId tương ứng (hoặc kèm UserID nếu cần)
        const syncItem = await synctracking.findOne({
            where: { DeviceID: deviceId /*, UserID: req.user.id (nếu cần)*/ },
        });

        if (!syncItem) {
            return res.status(404).json({
                message: 'Không tìm thấy bản ghi tương ứng với thiết bị này.',
            });
        }

        // updatedAt từ DB (Kiểu Date)
        const serverUpdatedAt = new Date(syncItem.updatedAt).getTime();

        // updatedAt local do mobile gửi lên (Kiểu chuỗi ISOString => convert sang number)
        const localUpdatedAtTime = new Date(localUpdatedAt).getTime();

        // So sánh
        const isSynced = serverUpdatedAt === localUpdatedAtTime;

        // Tuỳ ý, ta có thể cập nhật trường SyncStatus trong DB hoặc chỉ trả về kết quả
        // Ở đây, chỉ trả về kết quả cho client
        return res.status(200).json({
            syncStatus: isSynced, // true/false
            serverUpdatedAt: syncItem.updatedAt, // để client có thể đồng bộ nếu chưa khớp
        });
    } catch (error) {
        return next(error);
    }
};
