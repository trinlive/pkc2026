const db = require('./db');

// Activity Model - จัดการข่าวกิจกรรม
// ใช้ table news_activity แยกต่างหาก
const Activity = {
    // ดึงรายการข่าวกิจกรรมทั้งหมด
    getAll: async (limit = null, offset = 0, titleKeyword = '') => {
        try {
            let query = 'SELECT * FROM news_activity';
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
            console.error('Error fetching activities:', error);
            return [];
        }
    },

    // ดึงข่าวกิจกรรมที่เผยแพร่แล้ว
    getPublished: async (limit = null, offset = 0) => {
        try {
            let query = 'SELECT * FROM news_activity WHERE is_published = 1 ORDER BY date_posted DESC';
            const params = [];
            
            if (limit) {
                query += ' LIMIT ? OFFSET ?';
                params.push(limit, offset);
            }
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching published activities:', error);
            return [];
        }
    },

    // ค้นหาข่าวกิจกรรมที่เผยแพร่แล้ว ตามคำค้นหา
    searchPublished: async (keyword = '', limit = null, offset = 0) => {
        try {
            let query = 'SELECT * FROM news_activity WHERE is_published = 1';
            const params = [];
            
            if (keyword && keyword.trim()) {
                query += ' AND (title LIKE ? OR description LIKE ? OR news_category LIKE ?)';
                const searchPattern = `%${keyword.trim()}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }
            
            query += ' ORDER BY date_posted DESC';
            
            if (limit) {
                query += ' LIMIT ? OFFSET ?';
                params.push(limit, offset);
            }
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error searching published activities:', error);
            return [];
        }
    },

    // ดึงข่าวกิจกรรมเด่น
    getFeatured: async (limit = 5) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM news_activity WHERE is_published = 1 AND is_featured = 1 ORDER BY date_posted DESC LIMIT ?',
                [limit]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching featured activities:', error);
            return [];
        }
    },

    // ดึงข่าวกิจกรรมหน้าแรก
    getHomepageActivities: async (limit = 5) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM news_activity WHERE is_published = 1 ORDER BY is_featured DESC, date_posted DESC LIMIT ?',
                [limit]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching homepage activities:', error);
            return [];
        }
    },

    // ดึงข่าวกิจกรรมตาม ID
    getById: async (id) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM news_activity WHERE id = ?', 
                [id]
            );
            return rows[0];
        } catch (error) {
            console.error('Error fetching activity by ID:', error);
            return null;
        }
    },

    // ตรวจสอบข่าวกิจกรรมซ้ำสำหรับงาน Migration
    existsForMigration: async (title, date_posted) => {
        try {
            const [rows] = await db.query(
                'SELECT id FROM news_activity WHERE title = ? AND date_posted = ? LIMIT 1',
                [title, date_posted]
            );
            return rows.length > 0;
        } catch (error) {
            console.error('Error checking duplicate migration activity:', error);
            return false;
        }
    },

    // หาข่าวกิจกรรมที่ migrate มาจาก Joomla
    getByMigrationSource: async (joomlaArticleId) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM news_activity WHERE created_by = ? LIMIT 1',
                [`joomla:${joomlaArticleId}`]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching activity by migration source:', error);
            return null;
        }
    },

    // สร้างข่าวกิจกรรมใหม่
    create: async (title, description, image_url, attachment_url, date_posted, is_published, created_by, news_category = 'ข่าวกิจกรรม') => {
        try {
            const [result] = await db.query(
                'INSERT INTO news_activity (title, description, image_url, attachment_url, news_category, date_posted, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [title, description, image_url, attachment_url, news_category, date_posted, is_published ? 1 : 0, created_by]
            );
            return result;
        } catch (error) {
            console.error('Error creating activity:', error);
            throw error;
        }
    },

    // อัพเดทข่าวกิจกรรม
    update: async (id, title, description, image_url, attachment_url, date_posted, is_published, is_featured, news_category = 'ข่าวกิจกรรม') => {
        try {
            const [result] = await db.query(
                'UPDATE news_activity SET title = ?, description = ?, image_url = ?, attachment_url = ?, news_category = ?, date_posted = ?, is_published = ?, is_featured = ? WHERE id = ?',
                [title, description, image_url, attachment_url, news_category, date_posted, is_published ? 1 : 0, is_featured ? 1 : 0, id]
            );
            return result;
        } catch (error) {
            console.error('Error updating activity:', error);
            throw error;
        }
    },

    // อัพเดทฟิลด์หลักจากงาน migration (ไม่แตะสถานะ publish/featured)
    updateMigratedFields: async (id, description, image_url, attachment_url) => {
        try {
            const [result] = await db.query(
                'UPDATE news_activity SET description = ?, image_url = ?, attachment_url = ? WHERE id = ?',
                [description, image_url, attachment_url, id]
            );
            return result;
        } catch (error) {
            console.error('Error updating migrated activity fields:', error);
            throw error;
        }
    },

    // ลบข่าวกิจกรรม
    delete: async (id) => {
        try {
            const [result] = await db.query(
                'DELETE FROM news_activity WHERE id = ?', 
                [id]
            );
            return result;
        } catch (error) {
            console.error('Error deleting activity:', error);
            throw error;
        }
    },

    // เปลี่ยนสถานะการเผยแพร่
    togglePublish: async (id) => {
        try {
            const [result] = await db.query(
                'UPDATE news_activity SET is_published = NOT is_published WHERE id = ?',
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
                'UPDATE news_activity SET is_featured = NOT is_featured WHERE id = ?',
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
                'UPDATE news_activity SET view_count = view_count + 1 WHERE id = ?',
                [id]
            );
            return result;
        } catch (error) {
            console.error('Error incrementing view count:', error);
            return null;
        }
    },

    // นับจำนวนข่าวกิจกรรมทั้งหมด
    getCount: async (filter = 'all') => {
        try {
            let query = 'SELECT COUNT(*) as count FROM news_activity';
            const params = [];
            
            if (filter === 'published') {
                query += ' WHERE is_published = 1';
            } else if (filter === 'draft') {
                query += ' WHERE is_published = 0';
            } else if (filter === 'featured') {
                query += ' WHERE is_featured = 1';
            }
            
            const [rows] = await db.query(query, params);
            return rows[0].count;
        } catch (error) {
            console.error('Error counting activities:', error);
            return 0;
        }
    },

    // นับจำนวนข่าวกิจกรรมจากคำค้นหา
    countByTitle: async (titleKeyword = '') => {
        try {
            if (!titleKeyword || !titleKeyword.trim()) {
                return await Activity.getCount('all');
            }

            const [rows] = await db.query(
                'SELECT COUNT(*) as count FROM news_activity WHERE title LIKE ?',
                [`%${titleKeyword.trim()}%`]
            );
            return rows[0].count;
        } catch (error) {
            console.error('Error counting activities by title:', error);
            return 0;
        }
    }
};

module.exports = Activity;
