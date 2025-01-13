const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const path = require('path');

// Create a transporter using nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your Gmail address
        pass: process.env.EMAIL_PASS  // Your Gmail password or App Password
    }
});

// Configure Handlebars options
const handlebarOptions = {
    viewEngine: {
        partialsDir: path.resolve(__dirname, '../templates/emails/'), // Adjust path as needed
        defaultLayout: false,
    },
    viewPath: path.resolve(__dirname, '../templates/emails/'),
    extName: '.handlebars',
};

// Attach the Handlebars plugin to the transporter
transporter.use('compile', hbs(handlebarOptions));

/**
 * Function to send OTP email
 * @param {string} receiverEmail - Recipient's email address
 * @param {string} otp - OTP code
 */
const sendOtpEmail = async (receiverEmail, otp) => {
    try {
        const mailOptions = {
            from: `"Team IoT - CKC F.IT SmartNet Solutions" <${process.env.EMAIL_USER}>`,
            to: receiverEmail,
            subject: 'Mã OTP Xác Thực của Bạn',
            template: 'otpEmailTemplate', // Name of the template file without extension
            context: {
                otp: otp,
                logoUrl: 'https://ibb.co/ZzhfQ5h', // Replace with your actual logo URL
                currentYear: new Date().getFullYear()
            }
        };

        // Send email
        await transporter.sendMail(mailOptions);
        console.log(`Email OTP đã được gửi đến ${receiverEmail}: ${otp}`);
    } catch (error) {
        console.error('Lỗi khi gửi email OTP:', error);
        throw error;
    }
};

/**
 * Hàm gửi email cảnh báo khẩn cấp
 * @param {string} receiverEmail - Địa chỉ email người nhận
 * @param {string} alertMessage - Thông điệp cảnh báo
 */
const sendEmergencyAlertEmail = async (receiverEmail, alertMessage) => {
    try {
        const mailOptions = {
            from: `"Team IoT - CKC F.IT SmartNet Solutions" <${process.env.EMAIL_USER}>`,
            to: receiverEmail,
            subject: 'CẢNH BÁO KHẨN CẤP TỪ HỆ THỐNG',
            template: 'emergencyAlertTemplate', // Tên file template không bao gồm đuôi
            context: {
                message: alertMessage,
                logoUrl:  'https://ibb.co/ZzhfQ5h', // Thay bằng URL logo của bạn
                currentYear: new Date().getFullYear()
            }
        };

        // Gửi email
        await transporter.sendMail(mailOptions);
        console.log(`Email cảnh báo khẩn cấp đã được gửi đến ${receiverEmail}: ${alertMessage}`);
    } catch (error) {
        console.error('Lỗi khi gửi email cảnh báo khẩn cấp:', error);
        throw error;
    }
};

module.exports = {
    sendOtpEmail,
    sendEmergencyAlertEmail
};
