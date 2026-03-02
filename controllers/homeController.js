const Post = require('../models/postModel');
const Slider = require('../models/sliderModel');

// หน้าแรก (ที่ทำเสร็จแล้ว)
exports.getHomePage = async (req, res) => {
    try {
        const news = await Post.getAll();
        const sliders = await Slider.getAll();
        
        // กรองเฉพาะ slider ที่ active และเรียงตาม display_order
        const activeSliders = sliders.filter(slider => slider.is_active === 1);
        
        res.render('index', { 
            title: 'หน้าแรก | เทศบาลนครปากเกร็ด',
            welcomeMessage: 'ยินดีต้อนรับสู่ระบบ N-Pakkret Node.js',
            newsList: news,
            sliders: activeSliders
        });
    } catch (error) {
        res.render('index', { 
            title: 'Error', 
            welcomeMessage: 'DB Error', 
            newsList: [],
            sliders: []
        });
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