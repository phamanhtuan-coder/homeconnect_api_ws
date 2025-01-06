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
 * Bỏ qua nhà đã bị xóa mềm (isDeleted = true)
 */
exports.getAllHousesByUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const houseList = await houses.findAll({
            where: { UserID: userId, IsDeleted: false },  // Lọc bỏ các nhà bị xóa mềm
            include: {
                model: spaces,
                as: 'Spaces',
                attributes: ['SpaceID', 'Name']  // Loại bỏ TypeID, chỉ lấy SpaceID và Name
            },
            attributes: ['HouseID', 'Name', 'Address', 'IconName', 'IconColor']  // Lọc các cột trả về
        });

        res.status(200).json(houseList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


/**
 * Lấy thông tin chi tiết nhà theo ID (Get House by ID)
 * Bỏ qua nhà đã bị xóa mềm
 */
exports.getHouseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const house = await houses.findOne({
            where: { HouseID: id, UserID: userId, IsDeleted: false },
            include: {
                model: spaces,
                as: 'Spaces',
                attributes: ['SpaceID', 'Name']  // Loại bỏ TypeID, chỉ giữ SpaceID và Name
            }
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
            where: { HouseID: id, UserID: userId, IsDeleted: false }
        });

        if (!house) {
            return res.status(404).json({ error: 'House not found or access denied' });
        }

        // Cập nhật dữ liệu
        await house.update(req.body);
        res.status(200).json({ message: 'House updated successfully', house });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Xóa nhà (Delete House)
 * Xóa mềm (soft delete) bằng cách cập nhật IsDeleted = true
 * Kiểm tra xem có space nào thuộc nhà không trước khi xóa
 */
exports.deleteHouseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const house = await houses.findOne({
            where: { HouseID: id, UserID: userId, IsDeleted: false }
        });

        if (!house) {
            return res.status(404).json({ error: 'House not found or access denied' });
        }

        const spaceCount = await spaces.count({ where: { HouseID: id } });
        if (spaceCount > 0) {
            return res.status(400).json({ error: 'Cannot delete house with existing spaces' });
        }

        // Xóa mềm bằng cách cập nhật IsDeleted
        house.IsDeleted = true;
        await house.save();

        res.status(200).json({ message: 'House deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
