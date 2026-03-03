# ระบบจัดการข่าวประชาสัมพันธ์ (News Management System)

## 📋 ภาพรวม
ระบบจัดการข่าวประชาสัมพันธ์ที่สมบูรณ์สำหรับเทศบาลนครปากเกร็ด ช่วยให้คุณสามารถ:
- ✅ เพิ่มข่าวประชาสัมพันธ์ใหม่
- ✅ อัปโหลดรูปภาพหัวข้อข่าวพร้อมการปรับขนาดอัตโนมัติ
- ✅ แก้ไขข่าวที่มีอยู่
- ✅ ลบข่าว
- ✅ จัดการหมวดหมู่ข่าว
- ✅ เผยแพร่/เก็บเป็นร่างข่าว
- ✅ ตั้งข่าวเด่นสำหรับหน้าแรก
- ✅ ติดตามจำนวนการชม

---

## 📁 โครงสร้างไฟล์ที่เพิ่ม/แก้ไข

### Database
```
database/create_news_table.sql
└─ สร้างตาราง news พร้อมข้อมูลตัวอย่าง
```

### Models
```
models/newsModel.js
└─ ฟังก์ชันสำหรับจัดการฐานข้อมูลข่าว
   - getAll()               : ดึงข่าวทั้งหมด
   - getPublished()         : ดึงข่าวที่เผยแพร่
   - getFeatured()          : ดึงข่าวเด่น
   - getByCategory()        : ดึงข่าวตามหมวดหมู่
   - getById()              : ดึงข่าวตาม ID
   - create()               : สร้างข่าวใหม่
   - update()               : อัปเดตข่าว
   - delete()               : ลบข่าว
   - togglePublish()        : เปลี่ยนสถานะเผยแพร่
   - toggleFeatured()       : เปลี่ยนสถานะข่าวเด่น
   - incrementViewCount()   : เพิ่มจำนวนการชม
   - getCategories()        : ดึงรายการหมวดหมู่
   - getCount()             : นับจำนวนข่าว
```

### Middlewares
```
middlewares/newsUpload.js
└─ จัดการการอัปโหลดรูปภาพ พร้อม:
   - ตรวจสอบประเภทไฟล์ (jpg, jpeg, png, webp, gif)
   - ปรับขนาดรูปภาพให้ 1200x630 px (เฉพาะ)
   - สร้าง thumbnail ขนาด 400x300 px
   - แปลงเป็น WebP เพื่อลดขนาดไฟล์
   - ขนาดสูงสุด 10 MB
```

### Controllers
```
controllers/adminController.js
└─ เพิ่มฟังก์ชันสำหรับจัดการข่าว:
   - getNewsList()           : แสดงรายการข่าว
   - getNewsAddForm()        : แสดงฟอร์มเพิ่มข่าว
   - createNews()            : บันทึกข่าวใหม่
   - getNewsEditForm()       : แสดงฟอร์มแก้ไข
   - updateNews()            : บันทึกการแก้ไข
   - deleteNews()            : ลบข่าว
   - toggleNewsPublish()     : เปลี่ยนสถานะเผยแพร่
   - toggleNewsFeatured()    : เปลี่ยนสถานะข่าวเด่น
```

### Routes
```
server.js (อัปเดต)
└─ เส้นทางข่าวประชาสัมพันธ์:
   GET    /admin/news                 - ดูรายการข่าว
   GET    /admin/news/add             - แสดงฟอร์มเพิ่มข่าว
   POST   /admin/news/add             - บันทึกข่าวใหม่
   GET    /admin/news/edit/:id        - แสดงฟอร์มแก้ไข
   POST   /admin/news/edit/:id        - บันทึกการแก้ไข
   POST   /admin/news/delete/:id      - ลบข่าว
   POST   /admin/news/toggle-publish/:id   - เปลี่ยนสถานะเผยแพร่
   POST   /admin/news/toggle-featured/:id  - เปลี่ยนสถานะเด่น
```

### Views
```
views/admin/
├─ news-list.ejs          - แสดงรายการข่าวทั้งหมด
├─ news-add.ejs           - ฟอร์มเพิ่มข่าวใหม่
└─ news-edit.ejs          - ฟอร์มแก้ไขข่าว
```

---

## 🗄️ โครงสร้างตาราง Database

### ตาราง `news`

```sql
CREATE TABLE news (
  id                INT PRIMARY KEY AUTO_INCREMENT
  title             VARCHAR(500)    NOT NULL     - หัวข้อข่าว
  description       LONGTEXT        NULL         - รายละเอียดข่าว
  image_url         VARCHAR(1000)   NULL         - URL รูปภาพ
  news_category     VARCHAR(100)    NULL         - หมวดหมู่ข่าว
  date_posted       DATETIME        DEFAULT NOW  - วันที่ลงข่าว
  date_updated      DATETIME        DEFAULT NOW  - วันที่แก้ไข
  is_published      TINYINT(1)      DEFAULT 1    - 1=เผยแพร่, 0=ร่าง
  is_featured       TINYINT(1)      DEFAULT 0    - 1=เด่น, 0=ปกติ
  view_count        INT             DEFAULT 0    - จำนวนครั้งที่ดู
  created_by        VARCHAR(100)    NULL         - ผู้สร้าง
  created_at        TIMESTAMP       DEFAULT NOW  - เวลาสร้าง
  updated_at        TIMESTAMP       DEFAULT NOW  - เวลาแก้ไข
)
```

---

## 🚀 วิธีใช้

### 1. เข้าหน้าจัดการข่าว
```
ไปที่เมนู Admin Panel → 📰 จัดการข่าวสาร
หรือเข้าที่ /admin/news
```

### 2. เพิ่มข่าวใหม่
```
1. คลิก "➕ เพิ่มข่าวใหม่"
2. กรอกข้อมูล:
   - หัวข้อข่าว (บังคับ)
   - รายละเอียด (ทางเลือก)
   - หมวดหมู่ข่าว
   - วันที่ลงข่าว
   - อัปโหลดรูปภาพ (ลากหรือคลิก)
3. เลือก:
   - ☑️ เผยแพร่ข่าวนี้ทันที
   - ☑️ ตั้งเป็นข่าวเด่น
4. คลิก "💾 บันทึกข่าว"
```

### 3. แก้ไขข่าว
```
1. ไปที่รายการข่าว
2. คลิก "✏️ แก้ไข" ในแถวที่ต้องการ
3. แก้ไขข้อมูล
4. สามารถเปลี่ยนรูปภาพหรือให้คงรูปเดิมได้
5. คลิก "💾 บันทึกการแก้ไข"
```

### 4. ลบข่าว
```
1. ไปที่รายการข่าว
2. คลิก "🗑️ ลบ" ในแถวที่ต้องการ
3. ยืนยันการลบ
```

### 5. จัดการสถานะ
```
สถานะเผยแพร่: ✓ เผยแพร่ หรือ ◐ ร่าง
สถานะข่าวเด่น: ★ เด่น (จะแสดงในหน้าแรก)
```

---

## 📸 การจัดการรูปภาพ

### ข้อกำหนดรูปภาพ:
- **ขนาดแนะนำ:** 1200x630 px
- **ประเภทไฟล์:** JPG, JPEG, PNG, WebP, GIF
- **ขนาดสูงสุด:** 10 MB
- **โฟลเดอร์บันทึก:** `public/uploads/news/`

### การประมวลผล:
1. ไฟล์ต้นฉบับจะถูกอัปโหลดไปยัง temp
2. ปรับขนาดเป็น 1200x630 px และแปลงเป็น WebP
3. สร้าง thumbnail 400x300 px และแปลงเป็น WebP
4. ลบไฟล์ต้นฉบับและไฟล์ temp
5. บันทึก URL ที่จะใช้

---

## 💡 หมวดหมู่ข่าวมาตรฐาน

ระบบรองรับหมวดหมู่เหล่านี้:
- **ข่าวประชาสัมพันธ์** - ข่าวทั่วไป
- **ติดตามการบริหาร** - ข่าวเกี่ยวกับการบริหารงาน
- **บริการประชาชน** - ข่าวเกี่ยวกับบริการ
- **โครงการพิเศษ** - โครงการจำเพาะ
- **ประกาศ** - ประกาศราชการ
- *สามารถเพิ่มหมวดหมู่ใหม่ได้ตามต้องการ*

---

## 📊 สถิติข่าว

ในหน้าจัดการข่าว สามารถดูสถิติ:
- 📰 **ข่าวทั้งหมด** - จำนวนข่าวทั้งหมด
- ✅ **เผยแพร่แล้ว** - ข่าวที่เผยแพร่
- 📝 **ร่าง** - ข่าวที่เก็บเป็นร่าง
- ⭐ **ข่าวเด่น** - ข่าวที่ตั้งเป็นเด่น

---

## 🔧 API / Hooks ที่มีให้ใช้

### ดึงข่าวทั้งหมด:
```javascript
const News = require('./models/newsModel');
const news = await News.getAll();
```

### ดึงข่าวเผยแพร่:
```javascript
const news = await News.getPublished(10, 0); // limit 10, offset 0
```

### ดึงข่าวเด่น:
```javascript
const featured = await News.getFeatured(5);
```

### เพิ่มจำนวนการชม:
```javascript
await News.incrementViewCount(newsId);
```

---

## 📝 หมายเหตุ

### ต้องการรวม News กับหน้าแรก:
แก้ไข `homeController.js` ในฟังก์ชัน `getHomePage`:
```javascript
const news = await News.getPublished(10); // ดึง 10 ข่าวล่าสุดที่เผยแพร่
const featured = await News.getFeatured(3); // ดึง 3 ข่าวเด่น
```

### การดำเนินการเพิ่มเติมที่อาจต้อง:
1. ตั้งค่าการอนุญาต/สิทธิ์ (Admin only)
2. เพิ่มการค้นหาข่าว
3. เพิ่มการเรียงลำดับ
4. เพิ่มการแท็ก/คีย์เวิร์ด
5. เพิ่มการยืนยันก่อนเผยแพร่

---

## ✅ Checklist

- [x] สร้างตาราง news ในฐานข้อมูล
- [x] สร้าง newsModel.js พร้อมฟังก์ชันทั้งหมด
- [x] สร้าง newsUpload middleware เพื่อจัดการภาพ
- [x] อัปเดต adminController.js
- [x] อัปเดต server.js routes
- [x] สร้าง views (list, add, edit)
- [x] สร้างโฟลเดอร์ uploads
- [x] ตรวจสอบ syntax ทั้งหมด
- [x] ทดสอบการเชื่อมต่อฐานข้อมูล

---

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ error log ใน console
2. ตรวจสอบสิทธิ์โฟลเดอร์ uploads
3. ตรวจสอบการเชื่อมต่อฐานข้อมูล
4. ตรวจสอบขนาด/ประเภทไฟล์รูปภาพ

---

**เวอร์ชัน:** 1.0.0  
**ปรับปรุง:** มี.ค. 2569  
**สถานะ:** ✅ พร้อมใช้งาน
