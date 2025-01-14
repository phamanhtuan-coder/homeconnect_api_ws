
/**
 * Tính tổng thời gian thiết bị bật trong khoảng thời gian.
 * @param {Array} logs - Mảng các logs từ server (từ bật/tắt).
 * @param {String} startDate - Ngày bắt đầu (inclusive).
 * @param {String} endDate - Ngày kết thúc (inclusive).
 * @returns {Number} Tổng thời gian bật tính bằng giờ.
 */
const calculateTotalPowerOnTime = (logs, startDate, endDate) => {
    // Sắp xếp logs theo thời gian tăng dần
    const sortedLogs = logs.sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp));

    let totalOnTime = 0; // Tính bằng giây
    let lastOnTimestamp = null;

    sortedLogs.forEach(log => {
        const action = log.Action.command.action;
        const powerStatus = log.Action.command.powerStatus;

        if (action === 'toggle') {
            if (powerStatus) {
                // Thiết bị được bật
                lastOnTimestamp = new Date(log.Timestamp);
            } else {
                // Thiết bị được tắt
                if (lastOnTimestamp) {
                    const offTimestamp = new Date(log.Timestamp);
                    const duration = (offTimestamp - lastOnTimestamp) / 1000; // Tính bằng giây
                    totalOnTime += duration;
                    lastOnTimestamp = null;
                }
            }
        }
    });

    // Nếu thiết bị vẫn đang bật vào cuối khoảng thời gian
    if (lastOnTimestamp) {
        const end = new Date(endDate + 'T23:59:59.999Z');
        const duration = (end - lastOnTimestamp) / 1000; // Tính bằng giây
        totalOnTime += duration;
    }

    // Chuyển đổi tổng thời gian từ giây sang giờ
    return totalOnTime / 3600;
};



export {
    calculateTotalPowerOnTime
};