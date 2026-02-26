const Post = require('../models/postModel');

// หน้าแรก (ที่ทำเสร็จแล้ว)
exports.getHomePage = async (req, res) => {
    try {
        const news = await Post.getAll();
        res.render('index', { 
            title: 'หน้าแรก | เทศบาลนครปากเกร็ด',
            welcomeMessage: 'ยินดีต้อนรับสู่ระบบ N-Pakkret Node.js',
            newsList: news 
        });
    } catch (error) {
        res.render('index', { title: 'Error', welcomeMessage: 'DB Error', newsList: [] });
    }
};

// หน้าฟอร์มสำหรับ Admin
exports.getAdminPage = (req, res) => {
    res.render('admin', { title: 'ระบบจัดการข่าวสาร' });
};

// รับข้อมูลจากฟอร์มแล้วบันทึก
exports.createPost = async (req, res) => {
    try {
        const { title, date_posted } = req.body;
        await Post.create(title, date_posted); // เรียก Model ให้ Insert ข้อมูล
        res.redirect('/'); // บันทึกเสร็จให้กลับไปหน้าแรกเพื่อดูผล
    } catch (error) {
        console.error(error);
        res.status(500).send('ไม่สามารถบันทึกข้อมูลได้');
    }
};