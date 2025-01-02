const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 4000 });
const clients = {};  // Lưu trữ các kết nối thiết bị

wss.on('connection', (ws, req) => {
    const deviceId = req.url.split('=')[1];
    clients[deviceId] = ws;

    console.log(`Device ${deviceId} connected`);

    ws.on('message', (message) => {
        console.log(`Message from Device ${deviceId}:`, message);
    });

    ws.on('close', () => {
        console.log(`Device ${deviceId} disconnected`);
        delete clients[deviceId];
    });
});

// Hàm gửi lệnh tới thiết bị qua WebSocket
function sendToDevice(deviceId, command) {
    if (clients[deviceId]) {
        clients[deviceId].send(JSON.stringify(command));
        console.log(`Command sent to Device ${deviceId}:`, command);
    } else {
        console.log(`Device ${deviceId} not connected`);
    }
}

// Đảm bảo export cả wss và hàm sendToDevice
module.exports = {
    wss,
    sendToDevice
};
