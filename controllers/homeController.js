const Post = require('../models/postModel');
const Slider = require('../models/sliderModel');
const News = require('../models/newsModel');

const cleanImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    let cleanPath = String(imageUrl).split('#')[0].trim();

    try {
        cleanPath = decodeURIComponent(cleanPath);
    } catch (e) {
        // ถ้า decode ไม่ได้ให้ใช้ค่าเดิม
    }

    return cleanPath || null;
};

const normalizeImageUrlForDisplay = (imageUrl) => {
    const cleanUrl = cleanImageUrl(imageUrl);
    if (!cleanUrl) return '';

    if (/^https?:\/\//i.test(cleanUrl) || cleanUrl.startsWith('/')) {
        return cleanUrl;
    }

    return `/${cleanUrl}`;
};

// หน้าแรก (ที่ทำเสร็จแล้ว)
exports.getHomePage = async (req, res) => {
    try {
        const news = await News.getHomepageNews(5);
        const sliders = await Slider.getAll();
        
        // กรองเฉพาะ slider ที่ active และเรียงตาม display_order
        const activeSliders = sliders.filter(slider => slider.is_active === 1);
        const newsForView = news.map((item) => ({
            ...item,
            image_preview_url: normalizeImageUrlForDisplay(item.image_url)
        }));
        
        res.render('home/index', { 
            title: 'หน้าแรก | เทศบาลนครปากเกร็ด',
            welcomeMessage: 'ยินดีต้อนรับสู่ระบบ N-Pakkret Node.js',
            newsList: newsForView,
            sliders: activeSliders
        });
    } catch (error) {
        res.render('home/index', { 
            title: 'Error', 
            welcomeMessage: 'DB Error', 
            newsList: [],
            sliders: []
        });
    }
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