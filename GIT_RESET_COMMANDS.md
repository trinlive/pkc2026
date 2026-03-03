# คำสั่ง Git สำหรับเคลียร์และ Upload ใหม่

## 🎯 วัตถุประสงค์
ลบไฟล์ที่ถูก track ก่อนหน้า (ที่ไม่ได้ config .gitignore) ออกจาก Git แล้ว re-add ตาม .gitignore ใหม่

---

## 📝 ขั้นตอนการดำเนินการ

### 1️⃣ แก้ไข Git Permission Issue (ถ้ามี)
```bash
git config --global --add safe.directory /var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th
```

### 2️⃣ ลบไฟล์ทั้งหมดออกจาก Git Tracking (ไม่ลบไฟล์จริง)
```bash
cd /var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th
git rm -r --cached .
```
**คำอธิบาย:**
- `git rm -r --cached .` = ลบไฟล์ออกจาก Git index (staging area)
- `--cached` = ไม่ลบไฟล์จริงในเครื่อง เอาออกจาก Git track เท่านั้น
- `-r` = recursive (ทุก subdirectories)
- `.` = ทุกไฟล์ในโฟลเดอร์ปัจจุบัน

### 3️⃣ เพิ่มไฟล์กลับเข้าไปใหม่ตาม .gitignore
```bash
git add .
```
**คำอธิบาย:** ตอนนี้ Git จะอ่าน `.gitignore` และเพิ่มเฉพาะไฟล์ที่ไม่ถูก ignore

### 4️⃣ ตรวจสอบว่าไฟล์ไหนจะถูก commit
```bash
git status
```
**ตรวจสอบว่า:**
- ✅ ไฟล์ที่ควร track ยังอยู่ (source code, config files ที่ไม่ sensitive)
- ❌ ไฟล์ที่ไม่ควร track หายไป (uploads, test files, build outputs)

### 5️⃣ Commit การเปลี่ยนแปลง
```bash
git commit -m "chore: update .gitignore and remove ignored files from tracking

- Add comprehensive .gitignore rules
- Remove test files, uploads, database files from tracking
- Add .gitkeep to preserve folder structure
- Remove sensitive configuration files"
```

### 6️⃣ Push ขึ้น Remote Repository (ถ้ามี)
```bash
# ตรวจสอบว่ามี remote หรือไม่
git remote -v

# ถ้ามี origin แล้ว
git push origin main

# หรือ ถ้า branch ชื่อ master
git push origin master

# ถ้ายังไม่มี remote ให้เพิ่มก่อน
git remote add origin <URL-ของ-repository>
git push -u origin main
```

---

## 🔍 ตรวจสอบผลลัพธ์

### ดูไฟล์ที่ถูก Track
```bash
git ls-files
```

### ดูขนาด Repository
```bash
du -sh .git
```

### ตรวจสอบว่าไฟล์ที่ควร ignore ไม่ถูก track
```bash
# ตรวจสอบว่า uploads ไม่ถูก track (ควรไม่มีผลลัพธ์)
git ls-files | grep 'public/uploads.*\.\(jpg\|png\|pdf\)'

# ตรวจสอบว่า test files ไม่ถูก track (ควรไม่มีผลลัพธ์)
git ls-files | grep '^test-.*\.js$'

# ตรวจสอบว่า build output ไม่ถูก track (ควรไม่มีผลลัพธ์)
git ls-files | grep 'public/css/style.css'
```

---

## ⚠️ สิ่งที่ต้องระวัง

### 1. Backup ก่อน (ถ้าไม่แน่ใจ)
```bash
# สำรองโฟลเดอร์ทั้งหมด
cp -r /var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th \
     /var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th.backup
```

### 2. ตรวจสอบก่อน Push
ใช้ `git status` และ `git diff --cached` ดูว่าจะ commit อะไรบ้าง

### 3. ถ้าทำงานเป็นทีม
แจ้งให้ทีมรู้ว่ามีการเปลี่ยนแปลง Git history และให้ pull ใหม่

---

## 🚀 คำสั่งแบบรวม (Copy & Paste)

```bash
# เข้าโฟลเดอร์ project
cd /var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th

# แก้ไข permission issue
git config --global --add safe.directory /var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th

# ลบทุกอย่างออกจาก Git tracking
git rm -r --cached .

# เพิ่มกลับตาม .gitignore ใหม่
git add .

# ตรวจสอบ status
git status

# Commit
git commit -m "chore: update .gitignore and remove ignored files from tracking"

# Push (ถ้ามี remote)
git push origin main
```

---

## 📚 อ้างอิง

- `.gitignore` - กฎการ ignore files
- `GITIGNORE_SUMMARY.md` - สรุปรายละเอียดไฟล์ที่ถูก ignore
- `GIT_RESET_COMMANDS.md` - เอกสารนี้

