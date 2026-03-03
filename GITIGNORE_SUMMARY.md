# สรุปการปรับแต่ง .gitignore

## 📋 ไฟล์และโฟลเดอร์ที่ถูก Ignore

### 🗂️ Dependencies & Environment
- `node_modules/` - Node.js dependencies
- `.env` - Environment variables (รหัสผ่าน DB, API keys)

### 📝 Logs
- `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`

### 💾 Database Files
- `*.db`, `*.sqlite`, `*.sqlite3`
- `database.db` (SQLite test database)

### 📤 User Uploads (UGC - User Generated Content)
- `public/uploads/*` - ไฟล์ที่ upload โดย user
  - ✅ เก็บโครงสร้างโฟลเดอร์ผ่าน `.gitkeep`
  - ❌ ไฟล์รูปภาพและเอกสารที่ upload ไม่ถูก commit

### 🎨 Build Outputs
- `public/css/style.css` - Tailwind CSS compiled output

### 🧪 Testing Files
- `test-*.js` - ไฟล์ทดสอบทั้งหมด:
  - `test-db.js`
  - `test-migrate-5.js`
  - `test-variety.js`
  - `test-fallback-*.js`
  - `test-joomla-db.js`
  - และอื่นๆ

### 📚 Development Documentation
- `trinyah/` - โฟลเดอร์เอกสารภายใน

### ⚙️ Configuration
- `configuration.php` - PHP config (อาจมีข้อมูล sensitive)

### 💻 IDEs/Editors
- `.vscode/`, `.idea/`
- `*.swp`, `*.swo`, `*~` (Vim/editor temp files)

### 🖥️ OS Files
- `.DS_Store` (macOS)
- `Thumbs.db` (Windows)

## ✅ ไฟล์ที่ถูก Track (เก็บโครงสร้าง)
- `public/uploads/.gitkeep`
- `public/uploads/news/.gitkeep`
- `public/uploads/sliders/.gitkeep`

## 🔧 วิธีใช้งาน

### Rebuild Tailwind CSS (ถ้่าต้องการ)
```bash
npm run build:css
```

### ดู Git Status
```bash
# ถ้ามี permission issue
git config --global --add safe.directory /var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th

# ตรวจสอบ status
git status
```

### Stage และ Commit
```bash
git add .
git commit -m "Update .gitignore for proper project structure"
```

---
**หมายเหตุ:** ไฟล์ uploaded content ในโฟลเดอร์ `public/uploads/` จะไม่ถูก commit เพื่อลดขนาด repository และป้องกัน sensitive files
