const admin = require('firebase-admin');
const serviceAccount = require('src/config/homeconnect-teamiot-firebase-adminsdk-7r0kf-5d5a2a790b.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
