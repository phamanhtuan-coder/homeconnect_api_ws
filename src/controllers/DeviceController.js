const { devices } = require('../models'); // Import devices model

// Create Device
exports.createDevice = async (req, res) => {
    try {
        const device = await devices.create(req.body);
        res.status(201).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get All Devices
exports.getAllDevices = async (req, res) => {
    try {
        const deviceList = await devices.findAll();
        res.status(200).json(deviceList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Device by ID
exports.getDeviceById = async (req, res) => {
    try {
        const device = await devices.findByPk(req.params.id);
        if (!device) return res.status(404).json({ error: 'Device not found' });
        res.status(200).json(device);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Device by ID
exports.updateDeviceById = async (req, res) => {
    try {
        const device = await devices.findByPk(req.params.id);
        if (!device) return res.status(404).json({ error: 'Device not found' });
        if (device.UserID !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to modify this device' });
        }
        await device.update(req.body);
        res.status(200).json(device);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete Device by ID
exports.deleteDeviceById = async (req, res) => {
    try {
        const device = await devices.findByPk(req.params.id);
        if (!device) return res.status(404).json({ error: 'Device not found' });
        if (device.UserID !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to modify this device' });
        }
        await device.destroy();
        res.status(200).json({ message: 'Device deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
