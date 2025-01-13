const admin = require('firebase-admin');

// Kiểm tra biến môi trường
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('Biến môi trường FIREBASE_SERVICE_ACCOUNT không được thiết lập.');
    process.exit(1);
}

let serviceAccount;

try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('Service Account:', serviceAccount); // Chỉ log trong môi trường phát triển
} catch (error) {
    console.error('Lỗi khi parse FIREBASE_SERVICE_ACCOUNT:', error);
    process.exit(1);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // Bạn có thể thêm các tùy chọn khác nếu cần
});

console.log('Firebase Admin initialized successfully.');

module.exports = admin;
