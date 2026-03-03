const fs = require('fs').promises;
const path = require('path');
const Slider = require('../models/sliderModel');
const News = require('../models/newsModel');
const JoomlaDB = require('../models/joomla-db');

const DESTINATION_MENU_MAP = {
    news: 'ข่าวประชาสัมพันธ์'
};

/**
 * ทำความสะอาด image URL โดยเอาเฉพาะ path ส่วนที่ใช้ได้จริง
 * ลบ Joomla image reference ออก เช่น #joomlaImage://... หรือ query string
 * @param {string} imageUrl - URL จากฐานข้อมูล เช่น "images/news2026/file.jpg#joomlaImage://..."
 * @returns {string} - Path ที่สะอาด เช่น "/uploads/news/file.jpg" หรือ "images/news2026/file.jpg"
 */
const cleanImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // ลบ Joomla image reference ที่อยู่หลัง #
    let cleanPath = imageUrl.split('#')[0].trim();
    
    // ถอด URL encoding (e.g. %20 → space)
    try {
        cleanPath = decodeURIComponent(cleanPath);
    } catch (e) {
        // ไม่ต้องทำอะไรถ้า decode ไม่ได้
    }
    
    return cleanPath || null;
};

const normalizeImageUrlForDisplay = (imageUrl) => {
    const cleanUrl = cleanImageUrl(imageUrl);
    if (!cleanUrl) return '';

    if (/^https?:\/\//i.test(cleanUrl)) {
        return cleanUrl;
    }

    if (cleanUrl.startsWith('/')) {
        return cleanUrl;
    }

    return `/${cleanUrl}`;
};

/**
 * คัดลอกรูปภาพจาก Joomla ไปยัง N-Pakkret พร้อมเปลี่ยนชื่อไฟล์เป็น timestamp
 * @param {string} htmlContent - HTML content ที่มี image tags
 * @param {Date} postedDate - วันที่ลงข่าวต้นฉบับจาก Joomla (ใช้สร้าง timestamp)
 * @returns {Promise<{updatedContent: string, copiedImages: Array, errors: Array}>}
 */
const copyImagesFromJoomla = async (htmlContent, postedDate = null) => {
    if (!htmlContent) return { updatedContent: '', copiedImages: [], errors: [] };

    const joomlaImagesPath = '/var/www/vhosts/pakkretcity.go.th/httpdocs/images';
    const npakkretImagesPath = '/var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th/public/uploads/news';
    
    // สร้าง timestamp จากวันที่ลงข่าว เช่น 20260303_143045
    const generateTimestamp = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            date = new Date();
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        const secs = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${mins}${secs}`;
    };

    const timestamp = generateTimestamp(postedDate);
    const copiedImages = [];
    const errors = [];
    let updatedContent = htmlContent;

    // Regex เพื่อหา image paths ทั้งหมด (images/news2026/..., images/news2025/..., etc.)
    // รองรับทั้งใน src="" และ plain text ที่อ้างอิง
    const imagePatterns = [
        /images\/(news\d{4}\/[^"\s<>]+\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP))/gi,
        /images\/(news\/[^"\s<>]+\.(jpg|jpeg|png|gif|webp|JPG|JPEG|PNG|GIF|WEBP))/gi
    ];

    const foundImages = new Set();
    
    // หา image paths ทั้งหมดจากทุก pattern
    for (const pattern of imagePatterns) {
        const matches = htmlContent.matchAll(pattern);
        for (const match of matches) {
            foundImages.add(match[1]); // เก็บ path ส่วนหลัง images/ เช่น news2026/news5022.jpg
        }
    }

    // คัดลอกรูปแต่ละอันและแก้ path
    let imageIndex = 0;
    for (const imagePath of foundImages) {
        try {
            const sourcePath = path.join(joomlaImagesPath, imagePath);
            
            // ดึง extension จากไฟล์ต้นฉบับ
            const fileExt = path.extname(imagePath).toLowerCase(); // .jpg, .png, etc.
            const newFilename = `news_${timestamp}_${imageIndex}${fileExt}`; // news_20260303_143045_0.jpg
            const destPath = path.join(npakkretImagesPath, newFilename);

            // เช็คว่าไฟล์ต้นทางมีอยู่จริงหรือไม่
            try {
                await fs.access(sourcePath);
                
                // สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
                await fs.mkdir(npakkretImagesPath, { recursive: true });
                
                // คัดลอกไฟล์พร้อมเปลี่ยนชื่อ
                await fs.copyFile(sourcePath, destPath);
                
                const oldPath = `images/${imagePath}`;
                const newPath = `/uploads/news/${newFilename}`;
                
                copiedImages.push({
                    original: oldPath,
                    copied: newPath,
                    newFilename: newFilename
                });

                // แก้ path ใน content ทั้งหมด
                updatedContent = updatedContent.replace(new RegExp(oldPath, 'gi'), newPath);
                
                imageIndex++;
                
            } catch (accessError) {
                errors.push({
                    path: `images/${imagePath}`,
                    error: 'Source file not found',
                    details: accessError.message
                });
            }
            
        } catch (error) {
            errors.push({
                path: `images/${imagePath}`,
                error: 'Copy failed',
                details: error.message
            });
        }
    }

    return { updatedContent, copiedImages, errors };
};


const mapJoomlaCategoryToNews = (joomlaCategoryName = '') => {
    if (joomlaCategoryName.includes('ข่าว')) return 'ข่าวประชาสัมพันธ์';
    return 'ข่าวประชาสัมพันธ์';
};

const resolveDestinationCategory = (destinationMenu, joomlaCategoryName) => {
    if (destinationMenu && DESTINATION_MENU_MAP[destinationMenu]) {
        return DESTINATION_MENU_MAP[destinationMenu];
    }
    return mapJoomlaCategoryToNews(joomlaCategoryName);
};

const adminController = {
    // หน้า Dashboard หลัก
    getDashboard: (req, res) => {
        res.render('admin/dashboard', { 
            title: 'ระบบจัดการ - N-Pakkret Admin',
            currentPage: 'dashboard'
        });
    },

    // จัดการ Partials
    getPartialsList: async (req, res) => {
        try {
            const partialsDir = path.join(__dirname, '../views/partials');
            const files = await fs.readdir(partialsDir);
            const ejsFiles = files.filter(file => file.endsWith('.ejs'));
            
            res.render('admin/partials-list', { 
                title: 'จัดการ Partials',
                currentPage: 'partials',
                partials: ejsFiles 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถอ่านไฟล์ Partials ได้');
        }
    },

    // แสดงเนื้อหา Partial
    getPartialContent: async (req, res) => {
        try {
            const filename = req.params.filename;
            const filePath = path.join(__dirname, '../views/partials', filename);
            const content = await fs.readFile(filePath, 'utf8');
            
            res.render('admin/partial-edit', { 
                title: `แก้ไข ${filename}`,
                currentPage: 'partials',
                filename,
                content 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถอ่านไฟล์ได้');
        }
    },

    // บันทึก Partial
    updatePartial: async (req, res) => {
        try {
            const filename = req.params.filename;
            const { content } = req.body;
            const filePath = path.join(__dirname, '../views/partials', filename);
            
            await fs.writeFile(filePath, content, 'utf8');
            res.redirect('/admin/partials');
        } catch (error) {
            res.status(500).send('ไม่สามารถบันทึกไฟล์ได้');
        }
    },

    // จัดการ Models
    getModelsList: async (req, res) => {
        try {
            const modelsDir = path.join(__dirname, '../models');
            const files = await fs.readdir(modelsDir);
            const jsFiles = files.filter(file => file.endsWith('.js'));
            
            res.render('admin/models-list', { 
                title: 'จัดการ Models',
                currentPage: 'models',
                models: jsFiles 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถอ่านไฟล์ Models ได้');
        }
    },

    // แสดงเนื้อหา Model
    getModelContent: async (req, res) => {
        try {
            const filename = req.params.filename;
            const filePath = path.join(__dirname, '../models', filename);
            const content = await fs.readFile(filePath, 'utf8');
            
            res.render('admin/model-edit', { 
                title: `แก้ไข ${filename}`,
                currentPage: 'models',
                filename,
                content 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถอ่านไฟล์ได้');
        }
    },

    // บันทึก Model
    updateModel: async (req, res) => {
        try {
            const filename = req.params.filename;
            const { content } = req.body;
            const filePath = path.join(__dirname, '../models', filename);
            
            await fs.writeFile(filePath, content, 'utf8');
            res.redirect('/admin/models');
        } catch (error) {
            res.status(500).send('ไม่สามารถบันทึกไฟล์ได้');
        }
    },

    // ========== จัดการข่าวประชาสัมพันธ์ ==========
    // รายการข่าวทั้งหมด
    getNewsList: async (req, res) => {
        try {
            // ดึงค่า limit จาก query parameter (default: 30)
            let limitParam = req.query.limit || '30';
            const searchQuery = (req.query.q || '').trim();
            let limit = null;
            
            // แปลงค่า limit
            if (limitParam === 'all') {
                limit = null; // ไม่มี limit
            } else {
                limit = parseInt(limitParam, 10) || 30;
            }
            
            const news = await News.getAll(limit, 0, searchQuery);
            const homepageNews = await News.getHomepageNews(5); // ดึงข่าวที่แสดงในหน้า Home
            const categories = await News.getCategories();
            const totalCount = await News.getCount('all');
            const filteredCount = await News.countByTitle(searchQuery);
            const publishedCount = await News.getCount('published');
            const draftCount = await News.getCount('draft');
            const featuredCount = await News.getCount('featured');

            const newsForView = news.map((item) => ({
                ...item,
                image_preview_url: normalizeImageUrlForDisplay(item.image_url)
            }));
            
            res.render('admin/news-list', { 
                title: 'จัดการข่าวประชาสัมพันธ์',
                currentPage: 'news',
                newsList: newsForView,
                homepageNews: homepageNews, // ส่งข่าวหน้า Home ไปแสดงด้วย
                categories,
                searchQuery,
                currentLimit: limitParam === 'all' ? 'all' : parseInt(limitParam, 10) || 30,
                statistics: {
                    total: totalCount,
                    filteredTotal: filteredCount,
                    published: publishedCount,
                    draft: draftCount,
                    featured: featuredCount
                }
            });
        } catch (error) {
            console.error('Error fetching news:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูลข่าวได้');
        }
    },

    // หน้าเพิ่มข่าวใหม่
    getNewsAddForm: async (req, res) => {
        try {
            const categories = await News.getCategories();
            res.render('admin/news-add', { 
                title: 'เพิ่มข่าวประชาสัมพันธ์ใหม่',
                currentPage: 'news',
                errorMessage: '',
                categories,
                formData: {}
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    // บันทึกข่าวใหม่
    createNews: async (req, res) => {
        try {
            const { title, description, news_category, date_posted, is_published } = req.body;
            const imageUrl = req.uploadedImage || '';

            if (!title) {
                const categories = await News.getCategories();
                return res.status(400).render('admin/news-add', {
                    title: 'เพิ่มข่าวประชาสัมพันธ์ใหม่',
                    currentPage: 'news',
                    errorMessage: 'กรุณากรอกหัวข้อข่าว',
                    categories,
                    formData: req.body
                });
            }

            const createdBy = 'Admin'; // สามารถแก้เป็น user account ได้ในอนาคต
            const newsDate = date_posted || new Date();
            
            await News.create(
                title,
                description || '',
                imageUrl,
                news_category || null,
                newsDate,
                is_published ? 1 : 0,
                createdBy
            );

            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error creating news:', error);
            const categories = await News.getCategories();
            res.status(500).render('admin/news-add', {
                title: 'เพิ่มข่าวประชาสัมพันธ์ใหม่',
                currentPage: 'news',
                errorMessage: 'เกิดข้อผิดพลาดในการบันทึกข่าว',
                categories,
                formData: req.body
            });
        }
    },

    // หน้าแก้ไขข่าว
    getNewsEditForm: async (req, res) => {
        try {
            const id = req.params.id;
            const news = await News.getById(id);
            const categories = await News.getCategories();
            
            if (!news) {
                return res.status(404).send('ไม่พบข่าวขนี้');
            }

            const newsForView = {
                ...news,
                image_preview_url: normalizeImageUrlForDisplay(news.image_url)
            };
            
            res.render('admin/news-edit', { 
                title: 'แก้ไขข่าว',
                currentPage: 'news',
                errorMessage: '',
                news: newsForView,
                categories
            });
        } catch (error) {
            console.error('Error fetching news:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูลข่าวได้');
        }
    },

    // อัพเดทข่าว
    updateNews: async (req, res) => {
        try {
            const id = req.params.id;
            const { title, description, news_category, date_posted, is_published, is_featured } = req.body;
            
            const existingNews = await News.getById(id);
            if (!existingNews) {
                return res.status(404).send('ไม่พบข่าวนี้');
            }

            if (!title) {
                const categories = await News.getCategories();
                return res.status(400).render('admin/news-edit', {
                    title: 'แก้ไขข่าว',
                    currentPage: 'news',
                    errorMessage: 'กรุณากรอกหัวข้อข่าว',
                    news: { ...existingNews, ...req.body },
                    categories
                });
            }

            const imageUrl = req.uploadedImage || existingNews.image_url;
            const newsDate = date_posted || existingNews.date_posted;

            await News.update(
                id,
                title,
                description || '',
                imageUrl,
                news_category || null,
                newsDate,
                is_published ? 1 : 0,
                is_featured ? 1 : 0
            );

            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error updating news:', error);
            const id = req.params.id;
            const existingNews = await News.getById(id);
            const categories = await News.getCategories();
            res.status(500).render('admin/news-edit', {
                title: 'แก้ไขข่าว',
                currentPage: 'news',
                errorMessage: 'เกิดข้อผิดพลาดในการอัพเดทข่าว',
                news: existingNews,
                categories
            });
        }
    },

    // ลบข่าว
    deleteNews: async (req, res) => {
        try {
            const id = req.params.id;
            const news = await News.getById(id);
            
            if (!news) {
                return res.status(404).send('ไม่พบข่าวนี้');
            }

            // ลบไฟล์รูปภาพ
            if (news.image_url) {
                const cleanUrl = cleanImageUrl(news.image_url);
                if (cleanUrl) {
                    // Resolve path relative to Joomla httpdocs directory
                    const joomlaImagePath = path.join('/var/www/vhosts/pakkretcity.go.th/httpdocs', cleanUrl);
                    try {
                        await fs.unlink(joomlaImagePath);
                        console.log(`Deleted image: ${joomlaImagePath}`);
                    } catch (fileError) {
                        console.warn(`Warning: Could not delete image files for news ${id}:`, fileError);
                    }
                }
            }

            await News.delete(id);
            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error deleting news:', error);
            res.status(500).send('ไม่สามารถลบข่าวได้');
        }
    },

    // ลบข่าวหลายรายการ (AJAX)
    deleteNewsMultiple: async (req, res) => {
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ต้องระบุ ID ของข่าวที่ต้องการลบ'
                });
            }

            let deletedCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const id of ids) {
                try {
                    const news = await News.getById(id);
                    if (!news) {
                        errorCount++;
                        errors.push({ id, error: 'ไม่พบข่าวนี้' });
                        continue;
                    }

                    // ลบไฟล์รูปภาพ
                    if (news.image_url) {
                    const cleanUrl = cleanImageUrl(news.image_url);
                    if (!cleanUrl) {
                        console.warn(`Warning: Invalid image URL for news ${id}: ${news.image_url}`);
                    } else {
                        // Resolve path relative to Joomla httpdocs directory
                        const joomlaImagePath = path.join('/var/www/vhosts/pakkretcity.go.th/httpdocs', cleanUrl);
                        try {
                            await fs.unlink(joomlaImagePath);
                            console.log(`Deleted image: ${joomlaImagePath}`);
                        } catch (fileError) {
                            console.warn(`Warning: Could not delete image files for news ${id}:`, fileError);
                        }
                    }
                    }

                    // ลบจากในฐานข้อมูล
                    await News.delete(id);
                    deletedCount++;
                } catch (err) {
                    errorCount++;
                    errors.push({ id, error: err.message });
                    console.error(`Error deleting news ${id}:`, err);
                }
            }

            res.json({
                success: true,
                message: `ลบสำเร็จ ${deletedCount} รายการ${errorCount > 0 ? `, ล้มเหลว ${errorCount} รายการ` : ''}`,
                deletedCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error) {
            console.error('Error in deleteNewsMultiple:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลบข่าว',
                error: error.message
            });
        }
    },

    // เปลี่ยนสถานะเผยแพร่
    toggleNewsPublish: async (req, res) => {
        try {
            const id = req.params.id;
            await News.togglePublish(id);
            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error toggling publish status:', error);
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // เปลี่ยนสถานะข่าวเด่น
    toggleNewsFeatured: async (req, res) => {
        try {
            const id = req.params.id;
            await News.toggleFeatured(id);
            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error toggling featured status:', error);
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // ========== จัดการ Sliders ==========
    // รายการ Slider ทั้งหมด
    getSlidersList: async (req, res) => {
        try {
            const sliders = await Slider.getAll();
            res.render('admin/sliders-list', { 
                title: 'จัดการ Slider',
                currentPage: 'sliders',
                sliders 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถโหลดข้อมูล Slider ได้');
        }
    },

    // หน้าเพิ่ม Slider ใหม่
    getSliderAddForm: (req, res) => {
        res.render('admin/slider-add', { 
            title: 'เพิ่ม Slider ใหม่',
            currentPage: 'sliders',
            errorMessage: '',
            formData: {}
        });
    },

    // บันทึก Slider ใหม่
    createSlider: async (req, res) => {
        try {
            if (req.uploadError) {
                return res.status(400).render('admin/slider-add', {
                    title: 'เพิ่ม Slider ใหม่',
                    currentPage: 'sliders',
                    errorMessage: req.uploadError,
                    formData: req.body
                });
            }

            const { title, subtitle, image_url, link_url, badge_text, display_order } = req.body;

            const uploadedImageUrl = req.file ? `/uploads/sliders/${req.file.filename}` : '';
            // ถ้ามีไฟล์ใหม่ ให้ใช้ไฟล์นั้นเท่านั้น (ไม่สนใจ URL field)
            const finalImageUrl = uploadedImageUrl || image_url;

            if (!finalImageUrl) {
                return res.status(400).render('admin/slider-add', {
                    title: 'เพิ่ม Slider ใหม่',
                    currentPage: 'sliders',
                    errorMessage: 'กรุณาใส่ URL รูปภาพ หรืออัปโหลดไฟล์รูปภาพอย่างน้อย 1 อย่าง',
                    formData: req.body
                });
            }

            await Slider.create(title, subtitle, finalImageUrl, link_url, badge_text, display_order || 0);
            res.redirect('/admin/sliders');
        } catch (error) {
            res.status(500).send('ไม่สามารถบันทึก Slider ได้');
        }
    },

    // หน้าแก้ไข Slider
    getSliderEditForm: async (req, res) => {
        try {
            const id = req.params.id;
            const slider = await Slider.getById(id);
            
            if (!slider) {
                return res.status(404).send('ไม่พบ Slider นี้');
            }
            
            res.render('admin/slider-edit', { 
                title: 'แก้ไข Slider',
                currentPage: 'sliders',
                errorMessage: '',
                slider 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถโหลดข้อมูล Slider ได้');
        }
    },

    // อัพเดท Slider
    updateSlider: async (req, res) => {
        try {
            const id = req.params.id;
            const existingSlider = await Slider.getById(id);

            if (!existingSlider) {
                return res.status(404).send('ไม่พบ Slider นี้');
            }

            if (req.uploadError) {
                return res.status(400).render('admin/slider-edit', {
                    title: 'แก้ไข Slider',
                    currentPage: 'sliders',
                    errorMessage: req.uploadError,
                    slider: {
                        ...existingSlider,
                        ...req.body
                    }
                });
            }

            const { title, subtitle, image_url, link_url, badge_text, display_order } = req.body;
            const uploadedImageUrl = req.file ? `/uploads/sliders/${req.file.filename}` : '';
            // ถ้ามีไฟล์ใหม่ ให้ใช้ไฟล์นั้นเท่านั้น (ไม่สนใจ URL field)
            const finalImageUrl = uploadedImageUrl || image_url || existingSlider.image_url;

            await Slider.update(id, title, subtitle, finalImageUrl, link_url, badge_text, display_order);
            res.redirect('/admin/sliders');
        } catch (error) {
            res.status(500).send('ไม่สามารถอัพเดท Slider ได้');
        }
    },

    // ลบ Slider
    deleteSlider: async (req, res) => {
        try {
            const id = req.params.id;
            await Slider.delete(id);
            res.redirect('/admin/sliders');
        } catch (error) {
            res.status(500).send('ไม่สามารถลบ Slider ได้');
        }
    },

    // สลับสถานะ active/inactive
    toggleSliderStatus: async (req, res) => {
        try {
            const id = req.params.id;
            await Slider.toggleActive(id);
            res.redirect('/admin/sliders');
        } catch (error) {
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // ================================
    // DATA MIGRATION FROM JOOMLA
    // ================================

    // หน้าแสดง Migration Dashboard
    getMigrationDashboard: async (req, res) => {
        try {
            const joomlaStats = await JoomlaDB.getDbStats();
            const currentNewsCount = await News.getCount('all');
            const categories = await JoomlaDB.getAllCategories();

            res.render('admin/migration-dashboard', {
                title: 'Data Migration - Joomla to N-Pakkret',
                currentPage: 'migration',
                joomlaStats,
                currentNewsCount,
                categories
            });
        } catch (error) {
            console.error('Error loading migration dashboard:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูล Migration ได้');
        }
    },

    previewMigrationNewsFromJoomla: async (req, res) => {
        try {
            const {
                limit = 10,
                offset = 0,
                categoryName = 'ข่าวประชาสัมพันธ์ | News'
            } = req.body;
            const destinationMenu = 'news';
            const numericLimit = parseInt(limit, 10) || 10;
            const numericOffset = parseInt(offset, 10) || 0;

            const joomlaArticles = await JoomlaDB.getAllArticles(null, 0, 1);
            const filteredArticles = categoryName
                ? joomlaArticles.filter(art => art.category_name === categoryName)
                : joomlaArticles;

            const articlesToPreview = filteredArticles.slice(numericOffset, numericOffset + numericLimit);
            const willAdd = [];
            const willSkip = [];

            for (const article of articlesToPreview) {
                const newsCategory = resolveDestinationCategory(destinationMenu, article.category_name);

                const postedDate = new Date(article.publish_up);
                const alreadyExists = await News.existsForMigration(
                    article.title,
                    postedDate,
                    newsCategory
                );

                const item = {
                    articleId: article.id,
                    title: article.title,
                    categoryName: newsCategory,
                    datePosted: postedDate,
                    joomlaCategory: article.category_name || '',
                    destinationMenu
                };

                if (alreadyExists) {
                    willSkip.push(item);
                } else {
                    willAdd.push(item);
                }
            }

            res.json({
                success: true,
                message: `Preview completed: will add ${willAdd.length}, will skip ${willSkip.length}`,
                statistics: {
                    totalChecked: articlesToPreview.length,
                    willAddCount: willAdd.length,
                    willSkipCount: willSkip.length,
                    destinationCategory: resolveDestinationCategory(destinationMenu, categoryName)
                },
                preview: {
                    willAdd,
                    willSkip
                }
            });
        } catch (error) {
            console.error('Migration preview error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ preview ข้อมูล',
                error: error.message
            });
        }
    },

    // Migrate ข่าวจาก Joomla (AJAX)
    migrateNewsFromJoomla: async (req, res) => {
        try {
            const {
                limit = 10,
                offset = 0,
                categoryName = 'ข่าวประชาสัมพันธ์ | News'
            } = req.body;
            const destinationMenu = 'news';
            const numericLimit = parseInt(limit, 10) || 10;
            const numericOffset = parseInt(offset, 10) || 0;

            // 1. ดึงข่าวจาก Joomla DB
            const joomlaArticles = await JoomlaDB.getAllArticles(null, 0, 1);

            // กรองเฉพาะหมวดที่ต้องการ
            const filteredArticles = categoryName 
                ? joomlaArticles.filter(art => art.category_name === categoryName)
                : joomlaArticles;

            const articlesToMigrate = filteredArticles.slice(numericOffset, numericOffset + numericLimit);

            // 2. แปลงและบันทึกเข้า pkc_nodeweb_db
            let successCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            const errors = [];
            const allCopiedImages = [];
            const allImageErrors = [];

            for (const article of articlesToMigrate) {
                try {
                    // แปลง Joomla images JSON
                    let imageUrl = null;
                    if (article.images) {
                        try {
                            const imagesData = JSON.parse(article.images);
                            imageUrl = imagesData.image_intro || imagesData.image_fulltext || null;
                        } catch (e) {
                            // ถ้า parse ไม่ได้ ให้เป็น null
                        }
                    }

                    const newsCategory = resolveDestinationCategory(destinationMenu, article.category_name);

                    // สร้างข่าวใหม่ - รวม introtext และ fulltext
                    const rawDescription = `${article.introtext || ''}\n\n${article.fulltext || ''}`.trim();
                    const postedDate = new Date(article.publish_up);

                    // ป้องกันการ Migration ซ้ำ (title + date_posted + category)
                    const alreadyExists = await News.existsForMigration(
                        article.title,
                        postedDate,
                        newsCategory
                    );

                    if (alreadyExists) {
                        skippedCount++;
                        continue;
                    }

                    // 🖼️ คัดลอกรูปภาพจาก Joomla และแก้ไข path พร้อมเปลี่ยนชื่อเป็น timestamp
                    const imageCopyResult = await copyImagesFromJoomla(rawDescription, postedDate);
                    const finalDescription = imageCopyResult.updatedContent;

                    // เก็บสถิติการคัดลอกรูป
                    if (imageCopyResult.copiedImages.length > 0) {
                        allCopiedImages.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            images: imageCopyResult.copiedImages
                        });
                    }
                    if (imageCopyResult.errors.length > 0) {
                        allImageErrors.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            errors: imageCopyResult.errors
                        });
                    }
                    
                    await News.create(
                        article.title,
                        finalDescription, // ใช้ content ที่แก้ไข path แล้ว
                        imageUrl,
                        newsCategory,
                        postedDate,
                        1, // is_published
                        `joomla:${article.id}`
                    );

                    successCount++;
                } catch (err) {
                    errorCount++;
                    errors.push({
                        articleId: article.id,
                        title: article.title,
                        error: err.message
                    });
                    console.error(`Error migrating article ${article.id}:`, err);
                }
            }

            // คำนวณสถิติรูปภาพ
            const totalImagesCopied = allCopiedImages.reduce((sum, item) => sum + item.images.length, 0);
            const totalImageErrors = allImageErrors.reduce((sum, item) => sum + item.errors.length, 0);

            res.json({
                success: true,
                message: `Migration completed: ${successCount} success, ${skippedCount} skipped, ${errorCount} errors | Images: ${totalImagesCopied} copied, ${totalImageErrors} errors`,
                statistics: {
                    totalProcessed: articlesToMigrate.length,
                    successCount,
                    skippedCount,
                    errorCount,
                    errors,
                    destinationMenu,
                    destinationCategory: resolveDestinationCategory(destinationMenu, categoryName),
                    imagesCopied: totalImagesCopied,
                    imageErrors: totalImageErrors
                },
                imageDetails: {
                    copiedImages: allCopiedImages,
                    imageErrors: allImageErrors
                }
            });

        } catch (error) {
            console.error('Migration error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ migrate ข้อมูล',
                error: error.message
            });
        }
    },

    // ตรวจสอบสถานะ Joomla DB (AJAX)
    checkJoomlaConnection: async (req, res) => {
        try {
            const connectionTest = await JoomlaDB.testConnection();
            const stats = await JoomlaDB.getDbStats();

            res.json({
                success: true,
                connection: connectionTest,
                statistics: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ไม่สามารถเชื่อมต่อ Joomla DB ได้',
                error: error.message
            });
        }
    }
};

module.exports = adminController;
