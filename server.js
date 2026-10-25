  // Tự động sinh 10.000 key nếu kho trống
  db.get("SELECT COUNT(*) as count FROM keys_pool", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO keys_pool (key_code, created_at) VALUES (?, ?)");
      for (let i = 0; i < 10000; i++) {
        // TẠO KEY CHUẨN 4 CỤM: VÍ DỤ NXD-1234-ABCD-5678
        const part1 = "NXD";
        const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const part4 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const fullKey = `${part1}-${part2}-${part3}-${part4}`;
        
        stmt.run(fullKey, Date.now());
      }
      stmt.finalize();
      console.log("Đã tạo sẵn 10.000 Key chuẩn định dạng trong kho.");
    }
  });