const { houses, spaces,sequelize } = require('../models');

/**
 * Tạo mới nhà (Create House)
 */
exports.createHouse = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = req.user.id;  // Lấy ID của người dùng từ token
        const { Name, Address, IconName, IconColor } = req.body;

        // Tạo nhà mới
        const house = await houses.create({
            UserID: userId,
            Name,
            Address,
            IconName,
            IconColor
        }, { transaction });

        // Tạo phòng mặc định trong nhà vừa tạo
        const space = await spaces.create({
            HouseID: house.id,
            Name: 'Phòng Mặc Định'
        }, { transaction });

        // Commit transaction
        await transaction.commit();

        res.status(201).json({
            message: 'Nhà tạo thành công',
            house,
            space
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Lỗi khi tạo nhà:', error);
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
            return res.status(404).json({ error: 'Nhà không tồn tại hoặc không có quyền' });
        }

        // Cập nhật dữ liệu
        await house.update(req.body);
        res.status(200).json({ message: 'Nhà được cập nhật thành công', house });
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
            return res.status(404).json({ error: 'Nhà không tồn tại hoặc không có quyền' });
        }

        const spaceCount = await spaces.count({ where: { HouseID: id } });
        if (spaceCount > 0) {
            return res.status(400).json({ error: 'Không thể xóa nhà khi còn phòng' });
        }

        // Xóa mềm bằng cách cập nhật IsDeleted
        house.IsDeleted = true;
        await house.save();

        res.status(200).json({ message: 'Nhà xóa thành công' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
