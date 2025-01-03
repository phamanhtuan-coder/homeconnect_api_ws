const { houses, spaces } = require('../models');

/**
 * Tạo mới nhà (Create House)
 */
exports.createHouse = async (req, res) => {
    try {
        const userId = req.user.id;  // Lấy ID của người dùng từ token
        const { Name, Address, IconName, IconColor } = req.body;

        const house = await houses.create({
            UserID: userId,
            Name,
            Address,
            IconName,
            IconColor
        });

        res.status(201).json({ message: 'House created successfully', house });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy danh sách nhà của người dùng (Get All Houses by User)
 */
exports.getAllHousesByUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const houseList = await houses.findAll({
            where: { UserID: userId },
            include: { model: spaces, as: 'Spaces' }
        });

        res.status(200).json(houseList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Lấy thông tin chi tiết nhà theo ID (Get House by ID)
 */
exports.getHouseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const house = await houses.findOne({
            where: { HouseID: id, UserID: userId },
            include: { model: spaces, as: 'Spaces' }
        });

        if (!house) {
            return res.status(404).json({ error: 'House not found or access denied' });
        }

        res.status(200).json(house);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cập nhật thông tin nhà (Update House)
 */
exports.updateHouseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const house = await houses.findOne({
            where: { HouseID: id, UserID: userId }
        });

        if (!house) {
            return res.status(404).json({ error: 'House not found or access denied' });
        }

        await house.update(req.body);
        res.status(200).json({ message: 'House updated successfully', house });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Xóa nhà (Delete House)
 * Kiểm tra xem có space nào thuộc nhà không trước khi xóa
 */
exports.deleteHouseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const house = await houses.findOne({
            where: { HouseID: id, UserID: userId }
        });

        if (!house) {
            return res.status(404).json({ error: 'House not found or access denied' });
        }

        const spaceCount = await spaces.count({ where: { HouseID: id } });
        if (spaceCount > 0) {
            return res.status(400).json({ error: 'Cannot delete house with existing spaces' });
        }

        await house.destroy();
        res.status(200).json({ message: 'House deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
