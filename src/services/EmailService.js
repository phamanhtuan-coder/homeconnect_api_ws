const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

// Cấu hình transporter gửi email
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Email của bạn
        pass: process.env.EMAIL_PASS  // Mật khẩu ứng dụng hoặc mật khẩu email
    }
});

// Cấu hình Handlebars với Nodemailer
transporter.use('compile', hbs({
    viewEngine: {
        partialsDir: path.resolve('./templates/emails/'),
        defaultLayout: false,
    },
    viewPath: path.resolve('./templates/emails/'),
    extName: '.handlebars',
}));

/**
 * Hàm gửi email OTP
 * @param {string} receiverEmail - Email người nhận
 * @param {string} otp - Mã OTP
 */
const sendOtpEmail = async (receiverEmail, otp) => {
    try {
        const mailOptions = {
            from: `"Team IoT - CKC F.IT SmartNet Solutions" <${process.env.EMAIL_USER}>`,
            to: receiverEmail,
            subject: 'Mã OTP Xác Thực của Bạn',
            template: 'otpEmailTemplate', // Tên file không cần đuôi .handlebars
            context: {
                otp: otp,
                logoUrl: 'https://ibb.co/ZzhfQ5h', // Thay bằng URL thực tế của logo
                currentYear: new Date().getFullYear()
            }
        };

        // Gửi email
        await transporter.sendMail(mailOptions);
        console.log(`Email OTP đã được gửi đến ${receiverEmail}: ${otp}`);
    } catch (error) {
        console.error('Lỗi khi gửi email OTP:', error);
        throw error;
    }
};

module.exports = {
    sendOtpEmail
};
