const db = require('./db');

const News = {
    // ดึงรายการข่าวทั้งหมด (สามารถเรียงลำดับ)
    getAll: async (limit = null, offset = 0, titleKeyword = '') => {
        try {
            let query = 'SELECT * FROM news';
            const params = [];

            if (titleKeyword && titleKeyword.trim()) {
                query += ' WHERE title LIKE ?';
                params.push(`%${titleKeyword.trim()}%`);
            }

            query += ' ORDER BY date_posted DESC';
            
            if (limit) {
                query += ' LIMIT ? OFFSET ?';
                params.push(limit, offset);
            }
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching news:', error);
            return [];
        }
    },

    // ดึงข่าวเผยแพร่เท่านั้น
    getPublished: async (limit = null, offset = 0) => {
        try {
            let query = 'SELECT * FROM news WHERE is_published = 1 ORDER BY date_posted DESC';
            const params = [];
            
            if (limit) {
                query += ' LIMIT ? OFFSET ?';
                params.push(limit, offset);
            }
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching published news:', error);
            return [];
        }
    },

    // ดึงข่าวเด่น
    getFeatured: async (limit = 5) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM news WHERE is_published = 1 AND is_featured = 1 ORDER BY date_posted DESC LIMIT ?',
                [limit]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching featured news:', error);
            return [];
        }
    },

    // ดึงข่าวหน้าแรก: ข่าวเด่นก่อน และเรียงวันที่ลงข่าวล่าสุด
    getHomepageNews: async (limit = 5) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM news WHERE is_published = 1 ORDER BY is_featured DESC, date_posted DESC LIMIT ?',
                [limit]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching homepage news:', error);
            return [];
        }
    },

    // ดึงข่าวตามหมวดหมู่
    getByCategory: async (category, limit = null, offset = 0) => {
        try {
            let query = 'SELECT * FROM news WHERE is_published = 1 AND news_category = ? ORDER BY date_posted DESC';
            const params = [category];
            
            if (limit) {
                query += ' LIMIT ? OFFSET ?';
                params.push(limit, offset);
            }
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching news by category:', error);
            return [];
        }
    },

    // ดึงข่าวตาม ID
    getById: async (id) => {
        try {
            const [rows] = await db.query('SELECT * FROM news WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            console.error('Error fetching news by ID:', error);
            return null;
        }
    },

    // ตรวจสอบข่าวซ้ำสำหรับงาน Migration
    existsForMigration: async (title, date_posted, news_category) => {
        try {
            const [rows] = await db.query(
                'SELECT id FROM news WHERE title = ? AND date_posted = ? AND news_category = ? LIMIT 1',
                [title, date_posted, news_category]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking duplicate migration news:', error);
            return false;
        }
    },

    // หาข่าวที่ migrate มาจาก Joomla article เดิม
    getByMigrationSource: async (joomlaArticleId) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM news WHERE created_by = ? LIMIT 1',
                [`joomla:${joomlaArticleId}`]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching news by migration source:', error);
            return null;
        }
    },

    // สร้างข่าวใหม่
    create: async (title, description, image_url, attachment_url, news_category, date_posted, is_published, created_by) => {
        try {
            const [result] = await db.query(
                'INSERT INTO news (title, description, image_url, attachment_url, news_category, date_posted, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [title, description, image_url, attachment_url, news_category, date_posted, is_published ? 1 : 0, created_by]
            );
            return result;
        } catch (error) {
            console.error('Error creating news:', error);
            throw error;
        }
    },

    // อัพเดทข่าว
    update: async (id, title, description, image_url, attachment_url, news_category, date_posted, is_published, is_featured) => {
        try {
            const [result] = await db.query(
                'UPDATE news SET title = ?, description = ?, image_url = ?, attachment_url = ?, news_category = ?, date_posted = ?, is_published = ?, is_featured = ? WHERE id = ?',
                [title, description, image_url, attachment_url, news_category, date_posted, is_published ? 1 : 0, is_featured ? 1 : 0, id]
            );
            return result;
        } catch (error) {
            console.error('Error updating news:', error);
            throw error;
        }
    },

    // อัพเดทฟิลด์หลักจากงาน migration (ไม่แตะสถานะ publish/featured)
    updateMigratedFields: async (id, description, image_url, attachment_url) => {
        try {
            const [result] = await db.query(
                'UPDATE news SET description = ?, image_url = ?, attachment_url = ? WHERE id = ?',
                [description, image_url, attachment_url, id]
            );
            return result;
        } catch (error) {
            console.error('Error updating migrated news fields:', error);
            throw error;
        }
    },

    // ลบข่าว
    delete: async (id) => {
        try {
            const [result] = await db.query('DELETE FROM news WHERE id = ?', [id]);
            return result;
        } catch (error) {
            console.error('Error deleting news:', error);
            throw error;
        }
    },

    // เปลี่ยนสถานะการเผยแพร่
    togglePublish: async (id) => {
        try {
            const [result] = await db.query(
                'UPDATE news SET is_published = NOT is_published WHERE id = ?',
                [id]
            );
            return result;
        } catch (error) {
            console.error('Error toggling publish status:', error);
            throw error;
        }
    },

    // เปลี่ยนสถานะข่าวเด่น
    toggleFeatured: async (id) => {
        try {
            const [result] = await db.query(
                'UPDATE news SET is_featured = NOT is_featured WHERE id = ?',
                [id]
            );
            return result;
        } catch (error) {
            console.error('Error toggling featured status:', error);
            throw error;
        }
    },

    // เพิ่มจำนวนการดู
    incrementViewCount: async (id) => {
        try {
            const [result] = await db.query(
                'UPDATE news SET view_count = view_count + 1 WHERE id = ?',
                [id]
            );
            return result;
        } catch (error) {
            console.error('Error incrementing view count:', error);
            return null;
        }
    },

    // ดึงรายการหมวดหมู่ข่าว
    getCategories: async () => {
        try {
            const [rows] = await db.query(
                'SELECT DISTINCT news_category FROM news WHERE news_category IS NOT NULL ORDER BY news_category'
            );
            return rows;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    // นับจำนวนข่าวทั้งหมด
    getCount: async (filter = 'all') => {
        try {
            let query = 'SELECT COUNT(*) as count FROM news';
            if (filter === 'published') {
                query += ' WHERE is_published = 1';
            } else if (filter === 'draft') {
                query += ' WHERE is_published = 0';
            } else if (filter === 'featured') {
                query += ' WHERE is_featured = 1';
            }
            
            const [rows] = await db.query(query);
            return rows[0].count;
        } catch (error) {
            console.error('Error counting news:', error);
            return 0;
        }
    },

    // นับจำนวนข่าวจากคำค้นหาในหัวข้อข่าว
    countByTitle: async (titleKeyword = '') => {
        try {
            if (!titleKeyword || !titleKeyword.trim()) {
                return await News.getCount('all');
            }

            const [rows] = await db.query(
                'SELECT COUNT(*) as count FROM news WHERE title LIKE ?',
                [`%${titleKeyword.trim()}%`]
            );
            return rows[0].count;
        } catch (error) {
            console.error('Error counting news by title:', error);
            return 0;
        }
    }
};

module.exports = News;
