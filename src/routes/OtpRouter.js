const express = require('express');
const {
  sendingOTP,
    verifyOTP,
    checkEmailExists
} = require('../controllers/OtpController');

const router = express.Router();

// Gửi OTP
router.post('/send', sendingOTP);

// Route kiểm tra OTP
router.post('/verify', verifyOTP);

// Route kiểm tra email có tồn tại không
router.post('/check-email', checkEmailExists);

module.exports = router;