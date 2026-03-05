const db = require('./db');

// Budget Transfer Model - จัดการข้อมูลการโอนงบประมาณรายจ่ายประจำปี
// ใช้ table budget_transfer
const BudgetTransfer = {
    // ดึงรายการทั้งหมด
    getAll: async (limit = null, offset = 0, titleKeyword = '') => {
        try {
            let query = 'SELECT * FROM budget_transfer';
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
            console.error('Error fetching budget transfer records:', error);
            return [];
        }
    },

    // ดึงรายการที่เผยแพร่แล้ว
    getPublished: async (limit = null, offset = 0) => {
        try {
            let query = 'SELECT * FROM budget_transfer WHERE is_published = 1 ORDER BY date_posted DESC';
            const params = [];
            
            if (limit) {
                query += ' LIMIT ? OFFSET ?';
                params.push(limit, offset);
            }
            
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching published budget transfer records:', error);
            return [];
        }
    },

    // ค้นหารายการที่เผยแพร่แล้ว
    searchPublished: async (keyword = '', limit = null, offset = 0) => {
        try {
            let query = 'SELECT * FROM budget_transfer WHERE is_published = 1';
            const params = [];
            
            if (keyword && keyword.trim()) {
                query += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
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
            console.error('Error searching budget transfer records:', error);
            return [];
        }
    },

    // ดึงรายการหน้าแรก
    getHomepage: async (limit = 5) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM budget_transfer WHERE is_published = 1 ORDER BY date_posted DESC LIMIT ?',
                [limit]
            );
            return rows;
        } catch (error) {
            console.error('Error fetching homepage budget transfer records:', error);
            return [];
        }
    },

    // ดึงรายการตามลำดับ
    getById: async (id) => {
        try {
            const [rows] = await db.query('SELECT * FROM budget_transfer WHERE id = ?', [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching budget transfer record:', error);
            return null;
        }
    },

    // สร้างรายการใหม่
    create: async (title, description, imageUrl = null, attachmentUrl = null, category = null, datePosted = null, isPublished = 1, createdBy = 'Admin', referenceNumber = '') => {
        try {
            const date = datePosted || new Date();
            const [result] = await db.query(
                `INSERT INTO budget_transfer (title, description, image_url, attachment_url, category, date_posted, is_published, created_by, reference_number)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description, imageUrl, attachmentUrl, category, date, isPublished, createdBy, referenceNumber]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error creating budget transfer record:', error);
            throw error;
        }
    },

    // อัพเดทรายการ
    update: async (id, title, description, imageUrl, attachmentUrl, category, datePosted, isPublished = 1, isFeatured = 0, referenceNumber = '') => {
        try {
            await db.query(
                `UPDATE budget_transfer 
                 SET title = ?, description = ?, image_url = ?, attachment_url = ?, category = ?, date_posted = ?, is_published = ?, is_featured = ?, reference_number = ?
                 WHERE id = ?`,
                [title, description, imageUrl, attachmentUrl, category, datePosted, isPublished, isFeatured, referenceNumber, id]
            );
        } catch (error) {
            console.error('Error updating budget transfer record:', error);
            throw error;
        }
    },

    // อัพเดทฟิลด์สำหรับ migration (แก้รูป, attachment)
    updateMigratedFields: async (id, description, imageUrl, attachmentUrl) => {
        try {
            await db.query(
                `UPDATE budget_transfer 
                 SET description = ?, image_url = ?, attachment_url = ?
                 WHERE id = ?`,
                [description, imageUrl, attachmentUrl, id]
            );
        } catch (error) {
            console.error('Error updating migrated fields:', error);
            throw error;
        }
    },

    // ลบรายการ
    delete: async (id) => {
        try {
            await db.query('DELETE FROM budget_transfer WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting budget transfer record:', error);
            throw error;
        }
    },

    // เปลี่ยนสถานะเผยแพร่
    togglePublish: async (id) => {
        try {
            const record = await BudgetTransfer.getById(id);
            await db.query('UPDATE budget_transfer SET is_published = ? WHERE id = ?', [1 - record.is_published, id]);
        } catch (error) {
            console.error('Error toggling publish status:', error);
            throw error;
        }
    },

    // เปลี่ยนสถานะข่าวเด่น
    toggleFeatured: async (id) => {
        try {
            const record = await BudgetTransfer.getById(id);
            await db.query('UPDATE budget_transfer SET is_featured = ? WHERE id = ?', [1 - record.is_featured, id]);
        } catch (error) {
            console.error('Error toggling featured status:', error);
            throw error;
        }
    },

    // นับรายการทั้งหมด
    getCount: async (status = 'all') => {
        try {
            let query = 'SELECT COUNT(*) as count FROM budget_transfer';
            if (status === 'published') {
                query += ' WHERE is_published = 1';
            } else if (status === 'draft') {
                query += ' WHERE is_published = 0';
            } else if (status === 'featured') {
                query += ' WHERE is_featured = 1';
            }
            
            const [rows] = await db.query(query);
            return rows[0].count;
        } catch (error) {
            console.error('Error counting records:', error);
            return 0;
        }
    },

    // นับรายการตามชื่อ
    countByTitle: async (titleKeyword = '') => {
        try {
            let query = 'SELECT COUNT(*) as count FROM budget_transfer';
            const params = [];
            
            if (titleKeyword && titleKeyword.trim()) {
                query += ' WHERE title LIKE ?';
                params.push(`%${titleKeyword.trim()}%`);
            }
            
            const [rows] = await db.query(query, params);
            return rows[0].count;
        } catch (error) {
            console.error('Error counting by title:', error);
            return 0;
        }
    },

    // ดึงหมวดหมู่ทั้งหมด
    getCategories: async () => {
        try {
            const [rows] = await db.query(
                'SELECT DISTINCT category FROM budget_transfer WHERE category IS NOT NULL ORDER BY category'
            );
            return rows.map(row => row.category);
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    // ตรวจสอบรายการที่สำหรับจาก Migration Source
    getByMigrationSource: async (joomlaArticleId) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM budget_transfer WHERE created_by = ? LIMIT 1',
                [`joomla:${joomlaArticleId}`]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error checking migration source:', error);
            return null;
        }
    },

    // ตรวจสอบว่ามีรายการที่เหมือนกันอยู่แล้ว (ป้องกัน duplicate)
    existsForMigration: async (title, datePosted, category) => {
        try {
            const postedDate = datePosted instanceof Date 
                ? datePosted.toISOString().split('T')[0] 
                : new Date(datePosted).toISOString().split('T')[0];

            const [rows] = await db.query(
                `SELECT COUNT(*) as count FROM budget_transfer 
                 WHERE title = ? AND DATE(date_posted) = ? AND (category = ? OR (category IS NULL AND ? IS NULL))`,
                [title, postedDate, category, category]
            );
            return rows[0].count > 0;
        } catch (error) {
            console.error('Error checking existence for migration:', error);
            return false;
        }
    }
};

module.exports = BudgetTransfer;
