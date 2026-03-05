const express = require('express');
const path = require('path');
const app = express();
const homeController = require('./controllers/homeController');
const adminController = require('./controllers/adminController');
const sliderUpload = require('./middlewares/sliderUpload');
const newsUpload = require('./middlewares/newsUpload');
const activityUpload = require('./middlewares/activityUpload');
const budgetTransferUpload = require('./middlewares/budgetTransferUpload');

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

// หน้าดูข่าวทั้งหมด
app.get('/news', homeController.getNewsListPage);

// หน้าดูข่าวกิจกรรมทั้งหมด
app.get('/activities', homeController.getActivitiesListPage);

// หน้าดูการโอนงบประมาณรายจ่ายประจำปี
app.get('/budgettransfer', homeController.getBudgetTransferListPage);

// ========== Admin Routes ==========
// Dashboard
app.get('/admin/dashboard', adminController.getDashboard);

// จัดการ Partials
app.get('/admin/partials', adminController.getPartialsList);
app.get('/admin/partials/:filename', adminController.getPartialContent);
app.post('/admin/partials/:filename', adminController.updatePartial);

// จัดการ Models
app.get('/admin/models', adminController.getModelsList);
app.get('/admin/models/:filename', adminController.getModelContent);
app.post('/admin/models/:filename', adminController.updateModel);

// จัดการข่าวประชาสัมพันธ์
app.get('/admin/news', adminController.getNewsList);
app.get('/admin/news/add', adminController.getNewsAddForm);
app.post('/admin/news/add', newsUpload, adminController.createNews);
app.get('/admin/news/edit/:id', adminController.getNewsEditForm);
app.post('/admin/news/edit/:id', newsUpload, adminController.updateNews);
app.post('/admin/news/delete/:id', adminController.deleteNews);
app.post('/admin/news/delete-multiple', adminController.deleteNewsMultiple);
app.post('/admin/news/toggle-publish/:id', adminController.toggleNewsPublish);
app.post('/admin/news/toggle-featured/:id', adminController.toggleNewsFeatured);

// จัดการข่าวสาร (เก่า - สำหรับ backward compatibility)
app.post('/admin/add', homeController.createPost);

// จัดการ Sliders
app.get('/admin/sliders', adminController.getSlidersList);
app.get('/admin/sliders/add', adminController.getSliderAddForm);
app.post('/admin/sliders/add', sliderUpload, adminController.createSlider);
app.get('/admin/sliders/edit/:id', adminController.getSliderEditForm);
app.post('/admin/sliders/edit/:id', sliderUpload, adminController.updateSlider);
app.post('/admin/sliders/delete/:id', adminController.deleteSlider);
app.post('/admin/sliders/toggle/:id', adminController.toggleSliderStatus);

// จัดการข่าวกิจกรรม
app.get('/admin/activities', adminController.getActivitiesList);
app.get('/admin/activities/add', adminController.getActivityAddForm);
app.post('/admin/activities/add', activityUpload, adminController.createActivity);
app.get('/admin/activities/edit/:id', adminController.getActivityEditForm);
app.post('/admin/activities/edit/:id', activityUpload, adminController.updateActivity);
app.post('/admin/activities/delete/:id', adminController.deleteActivity);
app.post('/admin/activities/delete-multiple', adminController.deleteActivitiesMultiple);
app.post('/admin/activities/toggle-publish/:id', adminController.toggleActivityPublish);
app.post('/admin/activities/toggle-featured/:id',  adminController.toggleActivityFeatured);
app.get('/admin/activities/:id', adminController.getActivityDetail);

// Budget Transfer CRUD Routes
app.get('/admin/budgettransfer', adminController.getBudgetTransferList);
app.get('/admin/budgettransfer/add', adminController.getBudgetTransferAddForm);
app.post('/admin/budgettransfer/add', budgetTransferUpload, adminController.createBudgetTransfer);
app.get('/admin/budgettransfer/edit/:id', adminController.getBudgetTransferEditForm);
app.post('/admin/budgettransfer/edit/:id', budgetTransferUpload, adminController.updateBudgetTransfer);
app.post('/admin/budgettransfer/delete/:id', adminController.deleteBudgetTransfer);
app.post('/admin/budgettransfer/delete-multiple', adminController.deleteBudgetTransfersMultiple);
app.post('/admin/budgettransfer/toggle-publish/:id', adminController.toggleBudgetTransferPublish);
app.post('/admin/budgettransfer/toggle-featured/:id', adminController.toggleBudgetTransferFeatured);

// Data Migration from Joomla - News
app.get('/admin/migration', adminController.getMigrationDashboard);
app.post('/admin/migration/news/preview', adminController.previewMigrationNewsFromJoomla);
app.post('/admin/migration/news', adminController.migrateNewsFromJoomla);

// Data Migration from Joomla - Activities  
app.post('/admin/migration/activities/preview', adminController.previewMigrationActivitiesFromJoomla);
app.post('/admin/migration/activities', adminController.migrateActivitiesFromJoomla);

// Data Migration from Joomla - Budget Transfer
app.post('/admin/migration/budgettransfer/preview', adminController.previewMigrationBudgetTransferFromJoomla);
app.post('/admin/migration/budgettransfer', adminController.migrateBudgetTransferFromJoomla);

// Joomla DB Status
app.get('/admin/migration/check-connection', adminController.checkJoomlaConnection);

// หน้าจัดการเก่า (redirect ไป dashboard)
app.get('/admin', (req, res) => res.redirect('/admin/dashboard'));

// หน้าทดสอบ Slider ขนาด
app.get('/test/slider', async (req, res) => {
    try {
        const Slider = require('./models/sliderModel');
        const sliders = await Slider.getAll();
        res.render('home/slider-test', { 
            title: 'ทดสอบขนาด Slider - 1920x1080',
            sliders: sliders
        });
    } catch (error) {
        res.status(500).send('เกิดข้อผิดพลาด: ' + error.message);
    }
});

// 5. เริ่มต้น Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('---------------------------------------------');
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log('Domain: n.pakkretcity.go.th');
    console.log('Status: Online & Ready');
    console.log('---------------------------------------------');
});