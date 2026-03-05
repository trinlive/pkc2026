const Post = require('../models/postModel');
const Slider = require('../models/sliderModel');
const News = require('../models/newsModel');
const Activity = require('../models/activityModel');
const BudgetTransfer = require('../models/budgetTransferModel');

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
        const activities = await Activity.getHomepageActivities(6);
        const sliders = await Slider.getAll();
        
        // กรองเฉพาะ slider ที่ active และเรียงตาม display_order
        const activeSliders = sliders.filter(slider => slider.is_active === 1);
        const newsForView = news.map((item) => ({
            ...item,
            image_preview_url: normalizeImageUrlForDisplay(item.image_url)
        }));
        const activitiesForView = activities.map((item) => ({
            ...item,
            image_preview_url: normalizeImageUrlForDisplay(item.image_url)
        }));
        
        res.render('home/index', { 
            title: 'หน้าแรก | เทศบาลนครปากเกร็ด',
            welcomeMessage: 'ยินดีต้อนรับสู่ระบบ N-Pakkret Node.js',
            newsList: newsForView,
            activitiesList: activitiesForView,
            sliders: activeSliders
        });
    } catch (error) {
        res.render('home/index', { 
            title: 'Error', 
            welcomeMessage: 'DB Error', 
            newsList: [],
            activitiesList: [],
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

// หน้าดูข่าวทั้งหมด
exports.getNewsListPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const searchQuery = (req.query.q || '').trim();
        const limit = 9;
        const offset = (page - 1) * limit;

        let news, allNews, totalNews, totalPages;

        if (searchQuery) {
            // ค้นหาข่าวที่ตรงกับคำค้นหา
            news = await News.searchPublished(searchQuery, limit, offset);
            allNews = await News.searchPublished(searchQuery);
            totalNews = allNews.length;
            totalPages = Math.ceil(totalNews / limit) || 1;
        } else {
            // แสดงข่าวทั้งหมด
            news = await News.getPublished(limit, offset);
            allNews = await News.getPublished();
            totalNews = allNews.length;
            totalPages = Math.ceil(totalNews / limit);
        }

        // ปรับรูปภาพให้ถูกต้อง
        const newsForView = news.map((item) => ({
            ...item,
            image_preview_url: normalizeImageUrlForDisplay(item.image_url)
        }));

        res.render('home/news-list', { 
            title: 'ข่าวประชาสัมพันธ์ | เทศบาลนครปากเกร็ด',
            newsList: newsForView,
            currentPage: page,
            totalPages: totalPages,
            totalNews: totalNews,
            searchQuery
        });
    } catch (error) {
        console.error('Error fetching news list:', error);
        res.render('home/news-list', { 
            title: 'Error', 
            newsList: [],
            currentPage: 1,
            totalPages: 1,
            totalNews: 0,
            searchQuery: ''
        });
    }
};

// หน้าดูข่าวกิจกรรมทั้งหมด
exports.getActivitiesListPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const searchQuery = (req.query.q || '').trim();
        const limit = 9;
        const offset = (page - 1) * limit;

        let activities, allActivities, totalActivities, totalPages;

        if (searchQuery) {
            // ค้นหาข่าวกิจกรรมที่ตรงกับคำค้นหา
            activities = await Activity.searchPublished(searchQuery, limit, offset);
            allActivities = await Activity.searchPublished(searchQuery);
            totalActivities = allActivities.length;
            totalPages = Math.ceil(totalActivities / limit) || 1;
        } else {
            // แสดงข่าวกิจกรรมทั้งหมด
            activities = await Activity.getPublished(limit, offset);
            allActivities = await Activity.getPublished();
            totalActivities = allActivities.length;
            totalPages = Math.ceil(totalActivities / limit) || 1;
        }

        const activitiesForView = activities.map((item) => ({
            ...item,
            image_preview_url: normalizeImageUrlForDisplay(item.image_url)
        }));

        res.render('home/activity', {
            title: 'ข่าวกิจกรรม | เทศบาลนครปากเกร็ด',
            activitiesList: activitiesForView,
            currentPage: page,
            totalPages,
            totalActivities,
            searchQuery
        });
    } catch (error) {
        console.error('Error fetching activities list:', error);
        res.render('home/activity', {
            title: 'Error',
            activitiesList: [],
            currentPage: 1,
            totalPages: 1,
            totalActivities: 0,
            searchQuery: ''
        });
    }
};

// หน้าดูการโอนงบประมาณรายจ่ายทั้งหมด
exports.getBudgetTransferListPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const searchQuery = (req.query.q || '').trim();
        const limit = 9;
        const offset = (page - 1) * limit;

        let budgetTransfers, allBudgetTransfers, totalBudgetTransfers, totalPages;

        if (searchQuery) {
            // ค้นหาข้อมูลการโอนงบประมาณที่ตรงกับคำค้นหา
            budgetTransfers = await BudgetTransfer.searchPublished(searchQuery, limit, offset);
            allBudgetTransfers = await BudgetTransfer.searchPublished(searchQuery);
            totalBudgetTransfers = allBudgetTransfers.length;
            totalPages = Math.ceil(totalBudgetTransfers / limit) || 1;
        } else {
            // แสดงข้อมูลทั้งหมด
            budgetTransfers = await BudgetTransfer.getPublished(limit, offset);
            allBudgetTransfers = await BudgetTransfer.getPublished();
            totalBudgetTransfers = allBudgetTransfers.length;
            totalPages = Math.ceil(totalBudgetTransfers / limit) || 1;
        }

        const budgetTransfersForView = budgetTransfers.map((item) => ({
            ...item,
            image_preview_url: normalizeImageUrlForDisplay(item.image_url)
        }));

        res.render('home/budgettransfer', {
            title: 'การโอนงบประมาณรายจ่ายประจำปี | เทศบาลนครปากเกร็ด',
            budgetTransferList: budgetTransfersForView,
            currentPage: page,
            totalPages,
            totalBudgetTransfers,
            searchQuery
        });
    } catch (error) {
        console.error('Error fetching budget transfer list:', error);
        res.render('home/budgettransfer', {
            title: 'Error',
            budgetTransferList: [],
            currentPage: 1,
            totalPages: 1,
            totalBudgetTransfers: 0,
            searchQuery: ''
        });
    }
};