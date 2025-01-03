const { spaces, devices, houses } = require('../models');

/**
 * Tạo mới không gian trong nhà (Create Space)
 */
exports.createSpace = async (req, res) => {
    try {
        const userId = req.user.id;
        const { HouseID, Name } = req.body;

        // Kiểm tra nhà có thuộc về người dùng không
        const house = await houses.findOne({
            where: { HouseID, UserID: userId }
        });

        if (!house) {
            return res.status(404).json({ error: 'House not found or access denied' });
        }

        const space = await spaces.create({ HouseID, Name });

        res.status(201).json({ message: 'Space created successfully', space });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy tất cả không gian của một nhà (Get Spaces by House)
 */
exports.getSpacesByHouse = async (req, res) => {
    try {
        const { houseId } = req.params;
        const userId = req.user.id;

        const house = await houses.findOne({
            where: { HouseID: houseId, UserID: userId }
        });

        if (!house) {
            return res.status(404).json({ error: 'House not found or access denied' });
        }

        const spaceList = await spaces.findAll({ where: { HouseID: houseId } });

        res.status(200).json(spaceList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cập nhật không gian (Update Space)
 */
exports.updateSpace = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { Name } = req.body;

        const space = await spaces.findOne({
            where: { SpaceID: id },
            include: { model: houses, as: 'House', where: { UserID: userId } }
        });

        if (!space) {
            return res.status(404).json({ error: 'Space not found or access denied' });
        }

        await space.update({ Name });
        res.status(200).json({ message: 'Space updated successfully', space });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Xóa không gian (Delete Space)
 */
exports.deleteSpaceById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const space = await spaces.findOne({
            where: { SpaceID: id },
            include: { model: houses, as: 'House', where: { UserID: userId } }
        });

        if (!space) {
            return res.status(404).json({ error: 'Space not found or access denied' });
        }

        await space.destroy();
        res.status(200).json({ message: 'Space deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Thêm thiết bị vào không gian (Assign Device to Space)
 */
exports.assignDeviceToSpace = async (req, res) => {
    try {
        const { spaceId, deviceId } = req.body;
        const userId = req.user.id;

        const space = await spaces.findOne({
            where: { SpaceID: spaceId },
            include: { model: houses, as: 'House', where: { UserID: userId } }
        });

        if (!space) {
            return res.status(404).json({ error: 'Space not found or access denied' });
        }

        const device = await devices.findOne({
            where: { DeviceID: deviceId, UserID: userId }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        // Cập nhật SpaceID của thiết bị
        await device.update({ SpaceID: spaceId });
        res.status(200).json({ message: 'Device assigned to space successfully', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Xóa thiết bị khỏi không gian (Remove Device from Space)
 */
exports.removeDeviceFromSpace = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const device = await devices.findOne({
            where: { DeviceID: id, UserID: userId }
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        await device.update({ SpaceID: null });
        res.status(200).json({ message: 'Device removed from space', device });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy danh sách thiết bị trong không gian (Get Devices in Space)
 */
exports.getDevicesInSpace = async (req, res) => {
    try {
        const { spaceId } = req.params;
        const userId = req.user.id;

        const space = await spaces.findOne({
            where: { SpaceID: spaceId },
            include: { model: houses, as: 'House', where: { UserID: userId } }
        });

        if (!space) {
            return res.status(404).json({ error: 'Space not found or access denied' });
        }

        const deviceList = await devices.findAll({ where: { SpaceID: spaceId } });
        res.status(200).json(deviceList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
