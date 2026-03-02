const fs = require('fs').promises;
const path = require('path');
const Slider = require('../models/sliderModel');

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

    // จัดการข่าวสาร (เดิม)
    getNewsManagement: (req, res) => {
        res.render('admin/news-add', { 
            title: 'เพิ่มข่าวใหม่',
            currentPage: 'news'
        });
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
    }
};

module.exports = adminController;
