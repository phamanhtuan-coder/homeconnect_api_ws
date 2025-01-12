
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '..', 'config', 'homeconnect-teamiot-firebase-adminsdk-7r0kf-5d5a2a790b.json');

// Verify the service account file exists
if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account file not found at path: ${serviceAccountPath}`);
    process.exit(1);
}

// Import the service account
const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

console.log('Firebase Admin initialized successfully.');

module.exports = admin;
