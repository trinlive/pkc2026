const express = require('express');
const path = require('path');
const app = express();
const homeController = require('./controllers/homeController');

// 1. ตั้งค่า View Engine เป็น EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Middleware (สำคัญมาก)
// ใช้สำหรับอ่านค่าจาก Form (req.body) ในหน้า Admin
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 3. ตั้งค่า Static Files
// สำหรับเก็บไฟล์ CSS, รูปภาพ และ JS ฝั่ง Client
app.use(express.static(path.join(__dirname, 'public')));

// 4. เส้นทางหลัก (Routes)

// หน้าแรก: แสดงรายการข่าวสารทั้งหมด
app.get('/', homeController.getHomePage);

// หน้าจัดการ (Admin): แสดงรายการข่าวและปุ่มเพิ่มข่าว
app.get('/admin', homeController.getAdminPage);

// หน้าบันทึกข้อมูล: รับค่าจากฟอร์มในหน้า Admin แล้วบันทึกลงฐานข้อมูล
app.post('/admin/add', homeController.createPost);


// 5. เริ่มต้น Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('---------------------------------------------');
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log('Domain: n.pakkretcity.go.th');
    console.log('Status: Online & Ready');
    console.log('---------------------------------------------');
});