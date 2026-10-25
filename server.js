const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
// Cho phép App Electron gọi API từ bên ngoài vào
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public')));

// Khởi tạo Database SQLite
const db = new sqlite3.Database('./keys.db');
db.serialize(() => {
  // Bảng lưu Key
  db.run(`CREATE TABLE IF NOT EXISTS keys_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_code TEXT UNIQUE,
    hwid TEXT DEFAULT NULL,
    is_used INTEGER DEFAULT 0,
    created_at INTEGER
  )`);
  
  // Tự động sinh 10.000 key nếu kho trống
  db.get("SELECT COUNT(*) as count FROM keys_pool", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO keys_pool (key_code, created_at) VALUES (?, ?)");
      for (let i = 0; i < 10000; i++) {
        stmt.run("NXD-" + crypto.randomBytes(4).toString('hex').toUpperCase(), Date.now());
      }
      stmt.finalize();
      console.log("Đã tạo sẵn 10.000 Key trong kho.");
    }
  });
});

// API 1: Web gọi để lấy key
app.get('/api/get-key', (req, res) => {
  db.get("SELECT key_code FROM keys_pool WHERE is_used = 0 LIMIT 1", (err, row) => {
    if (!row) return res.status(404).json({ error: "Hết key!" });
    
    // Đánh dấu key đã được lấy
    db.run("UPDATE keys_pool SET is_used = 1 WHERE key_code = ?", [row.key_code]);
    res.json({ success: true, key: row.key_code });
  });
});

// API 2: App GamePro gọi để xác thực Key
app.post('/api/verify-key', (req, res) => {
  const { key, hwid } = req.body;
  if (!key || !hwid) return res.status(400).json({ error: "Thiếu dữ liệu!" });

  db.get("SELECT * FROM keys_pool WHERE key_code = ?", [key], (err, row) => {
    if (!row) {
      return res.json({ success: false, message: "Key không tồn tại!" });
    }

    // Nếu key chưa được gắn với máy nào -> Gắn HWID hiện tại vào
    if (row.hwid === null) {
      db.run("UPDATE keys_pool SET hwid = ? WHERE id = ?", [hwid, row.id]);
      return res.json({ success: true, message: "Kích hoạt thành công!" });
    }

    // Nếu key đã gắn với máy khác -> Báo lỗi
    if (row.hwid !== hwid) {
      return res.json({ success: false, message: "Key này đã được sử dụng trên thiết bị khác!" });
    }

    // Nếu đúng HWID -> Cho phép vào
    return res.json({ success: true, message: "Đăng nhập thành công!" });
  });
});

// Khởi chạy Server
app.listen(3000, () => {
  console.log('=========================================');
  console.log(' SERVER ĐANG CHẠY TẠI: http://localhost:3000');
  console.log('=========================================');
});