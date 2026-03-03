📰 ระบบจัดการข่าวประชาสัมพันธ์
================================

✅ ระบบจัดการข่าวประชาสัมพันธ์ที่สมบูรณ์พร้อมใช้งานแล้ว!

📋 สิ่งที่เพิ่มเข้ามา:

1. DATABASE
   ✓ ตาราง news ในฐานข้อมูล pkc_nodeweb_db
   ✓ ข้อมูลตัวอย่าง 3 รายการ
   ✓ File: database/create_news_table.sql

2. BACKEND LOGIC
   ✓ newsModel.js - ฟังก์ชันจัดการฐานข้อมูล
   ✓ newsUpload.js - Middleware สำหรับอัปโหลดรูปภาพ
   ✓ adminController.js - ฟังก์ชันหลักสำหรับ CRUD
   ✓ server.js - เส้นทาง/Routes ระบบ

3. FRONTEND (ADMIN)
   ✓ news-list.ejs - หน้าแสดงรายการข่าว
   ✓ news-add.ejs - ฟอร์มเพิ่มข่าวใหม่
   ✓ news-edit.ejs - ฟอร์มแก้ไขข่าว
   
4. FILE MANAGEMENT
   ✓ public/uploads/news/ - โฟลเดอร์เก็บรูป
   ✓ สนับสนุน: JPG, PNG, WebP, GIF
   ✓ ปรับขนาดอัตโนมัติ + สร้าง Thumbnail

🎯 ฟีเจอร์หลัก:

📝 จัดการข่าว
  • เพิ่มข่าวใหม่
  • แก้ไขข่าวเดิม
  • ลบข่าว
  • จัดการหมวดหมู่

🖼️ จัดการรูปภาพ
  • อัปโหลดรูปภาพ
  • ปรับขนาดอัตโนมัติ (1200x630 px)
  • สร้าง thumbnail (400x300 px)
  • แปลง WebP (ลดขนาดไฟล์)
  • ลบรูปเดิมอัตโนมัติ

📊 การจัดการสถานะ
  • เผยแพร่ / เก็บร่าง
  • ตั้งเป็นข่าวเด่น
  • ติดตามจำนวนการชม
  • สถิติจำนวนข่าว

🔄 Routes ที่เพิ่มเข้า:

Admin Paths:
  GET    /admin/news                - ดูรายการข่าว
  GET    /admin/news/add            - ฟอร์มเพิ่มข่าว
  POST   /admin/news/add            - บันทึกข่าวใหม่
  GET    /admin/news/edit/:id       - ฟอร์มแก้ไข
  POST   /admin/news/edit/:id       - บันทึกการแก้ไข
  POST   /admin/news/delete/:id     - ลบข่าว
  POST   /admin/news/toggle-publish/:id  - สลับสถานะเผยแพร่
  POST   /admin/news/toggle-featured/:id - สลับสถานะเด่น

🚀 วิธีเริ่มใช้:

1. เข้า Admin Panel: http://n.pakkretcity.go.th/admin
2. คลิก "📰 จัดการข่าวสาร" ในเมนูด้านข้าง
3. คลิก "➕ เพิ่มข่าวใหม่"
4. กรอกข้อมูล:
   - หัวข้อข่าว (บังคับ)
   - รายละเอียด
   - หมวดหมู่
   - วันที่ลง
   - อัปโหลดรูป
5. เลือกตัวเลือก:
   - ☑️ เผยแพร่ทันที
   - ☑️ ตั้งเป็นเด่น
6. คลิก "💾 บันทึกข่าว"

✨ ความพิเศษ:

1. Drag & Drop - ลากรูปมาวางตรง ๆ
2. AutoResize - ปรับขนาดและแปลง WebP อัตโนมัติ
3. Thumbnail - สร้างรูปย่อสำหรับ mobile
4. Statistics - จำนวนการชม + วันที่สร้าง/แก้ไข
5. Categories - รองรับหมวดหมู่หลายประเภท
6. Featured - ข่าวเด่นสำหรับหน้าแรก

📱 Support:

Status: ✅ Ready to Use
Database: ✅ Connected
Uploads: ✅ Configured
Routes: ✅ Registered
Syntax: ✅ Verified

สำหรับรายละเอียดเพิ่มเติม: ดู NEWS_MANAGEMENT_README.md

================================
พร้อมสำหรับใช้งาน! 🎉
