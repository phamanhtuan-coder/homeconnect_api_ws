const { users } = require('../models');
const { sendOtpEmail } = require('../services/EmailService');

// Hàm tạo OTP ngẫu nhiên
function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

// Hàm gửi OTP và cập nhật vào database
async function sendOtpEmailHandler(receiverEmail) {
    const otp = generateOTP();  // Tạo mã OTP
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000);  // Thời gian hết hạn OTP sau 5 phút

    try {
        // Kiểm tra người dùng có tồn tại không
        const user = await users.findOne({ where: { Email: receiverEmail } });

        if (!user) {
            console.error(`Không tìm thấy người dùng với email: ${receiverEmail}`);
            throw new Error('Không tìm thấy người dùng với email này.');
        }

        // Cập nhật VerificationCode và VerificationExpiry vào bảng users
        await user.update({
            VerificationCode: otp,
            VerificationExpiry: expiryTime
        });

        // Gửi email OTP sử dụng template Handlebars
        await sendOtpEmail(receiverEmail, otp);
    } catch (error) {
        console.error('Lỗi khi gửi OTP:', error);
        throw error;
    }
}

// Route gửi OTP
exports.sendingOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email không được để trống.' });
    }

    try {
        await sendOtpEmailHandler(email);
        res.status(200).json({ success: true, message: 'OTP đã được gửi đến email của bạn.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Lỗi khi gửi OTP.' });
    }
};

// Hàm kiểm tra OTP
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email và OTP không được để trống.' });
    }

    try {
        // Tìm người dùng theo email
        const user = await users.findOne({ where: { Email: email } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Email không tồn tại.' });
        }

        // Kiểm tra OTP có trùng khớp không
        if (user.VerificationCode !== otp) {
            return res.status(401).json({ success: false, message: 'OTP không đúng.' });
        }

        // Kiểm tra thời gian hết hạn OTP
        const currentTime = new Date();
        if (currentTime > user.VerificationExpiry) {
            return res.status(401).json({ success: false, message: 'OTP đã hết hạn.' });
        }

        // OTP hợp lệ - có thể cập nhật trạng thái xác thực nếu cần
        // Ví dụ:
        // await user.update({ isVerified: true, VerificationCode: null, VerificationExpiry: null });

        return res.status(200).json({ success: true, message: 'OTP hợp lệ.' });

    } catch (error) {
        console.error('Lỗi khi kiểm tra OTP:', error);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};

// Hàm kiểm tra email tồn tại trong bảng users
exports.checkEmailExists = async (req, res) => {
    const { email } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email không được để trống.' });
    }

    try {
        // Tìm kiếm email trong bảng users
        const user = await users.findOne({ where: { Email: email } });

        if (user) {
            return res.status(200).json({ exists: true, message: 'Email tồn tại trong hệ thống.' });
        } else {
            return res.status(200).json({ exists: false, message: 'Email không tồn tại trong hệ thống.' });
        }
    } catch (error) {
        console.error('Lỗi kiểm tra email:', error);
        return res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
    }
};
