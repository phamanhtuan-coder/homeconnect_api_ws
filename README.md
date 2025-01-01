# homeconnect_api_ws

## Tổng Quan
Repository này chứa backend API và máy chủ WebSocket cho ứng dụng di động được xây dựng bằng Kotlin và Jetpack Compose. Ứng dụng này được thiết kế để điều khiển các thiết bị IoT lập trình bằng chip ESP32.

## Tính Năng
- **Backend Node.js**: Backend mạnh mẽ được xây dựng bằng Node.js để xử lý các yêu cầu API và kết nối WebSocket.
- **API Endpoints**: Các endpoint API RESTful cho quản lý thiết bị, xác thực người dùng và truy xuất dữ liệu.
- **Máy Chủ WebSocket**: Giao tiếp thời gian thực với các thiết bị IoT bằng WebSocket.
- **Tích Hợp Cơ Sở Dữ Liệu**: Sử dụng MySQL và Sequelize để lưu trữ dữ liệu người dùng, cấu hình thiết bị và nhật ký.
- **Bảo Mật**: Các biện pháp bảo mật bao gồm xác thực JWT và mã hóa dữ liệu.
- **Khả Năng Mở Rộng**: Thiết kế để xử lý nhiều thiết bị và người dùng đồng thời.

## Công Nghệ Sử Dụng
| Công Nghệ    | Mô Tả                                      |
|--------------|--------------------------------------------|
| Node.js      | Môi trường runtime cho backend             |
| Express.js   | Framework web cho Node.js                  |
| Socket.IO    | Thư viện cho giao tiếp WebSocket thời gian thực |
| MySQL        | Cơ sở dữ liệu quan hệ để lưu trữ dữ liệu   |
| Sequelize    | ORM cho MySQL                              |
| JWT          | JSON Web Tokens cho xác thực bảo mật       |
| Kotlin       | Ngôn ngữ lập trình cho ứng dụng di động    |
| Jetpack Compose | Bộ công cụ hiện đại để xây dựng giao diện người dùng gốc trên Android |

## Bắt Đầu
### Yêu Cầu
- Cài đặt Node.js và npm.
- Chạy instance MySQL.
- Kotlin và Android Studio cho phát triển ứng dụng di động.

### Cài Đặt
1. Clone repository:
   ```bash
   git clone https://github.com/yourusername/homeconnect_api_ws.git
2. Điều hướng đến thư mục dự án:
    ```bash
   cd homeconnect_api_ws
4. Cài đặt các phụ thuộc:
   ```bash
    npm install
   
### Chạy Máy Chủ
1. Khởi động máy chủ MySQL.
2. Chạy máy chủ backend:
   ```bash
      npm start   
### Tài Liệu API
- Tài liệu API chi tiết có thể được tìm thấy tại đây.

### Đóng Góp
- Đóng góp được hoan nghênh! Vui lòng đọc hướng dẫn đóng góp trước khi gửi pull request.

### Giấy Phép
- Dự án này được cấp phép theo giấy phép MIT - xem tệp LICENSE để biết chi tiết.


