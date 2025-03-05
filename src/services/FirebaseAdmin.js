const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../config/homeconnect-teamiot-firebase-adminsdk-7r0kf-6ccaeb51a8.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('Không tìm thấy file service account:', serviceAccountPath);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

console.log('Firebase Admin initialized successfully.');

module.exports = admin;
