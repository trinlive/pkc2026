const db = require('./db');

const Slider = {
    // ดึงรายการ slider ทั้งหมด
    getAll: async () => {
        try {
            const [rows] = await db.query('SELECT * FROM sliders ORDER BY display_order ASC');
            return rows;
        } catch (error) {
            console.error('Error fetching sliders:', error);
            return [];
        }
    },

    // ดึง slider ตาม ID
    getById: async (id) => {
        try {
            const [rows] = await db.query('SELECT * FROM sliders WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            console.error('Error fetching slider by ID:', error);
            return null;
        }
    },

    // สร้าง slider ใหม่
    create: async (title, subtitle, image_url, link_url, badge_text, display_order) => {
        try {
            const [result] = await db.query(
                'INSERT INTO sliders (title, subtitle, image_url, link_url, badge_text, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
                [title, subtitle, image_url, link_url, badge_text, display_order]
            );
            return result;
        } catch (error) {
            console.error('Error creating slider:', error);
            throw error;
        }
    },

    // อัพเดท slider
    update: async (id, title, subtitle, image_url, link_url, badge_text, display_order) => {
        try {
            const [result] = await db.query(
                'UPDATE sliders SET title = ?, subtitle = ?, image_url = ?, link_url = ?, badge_text = ?, display_order = ? WHERE id = ?',
                [title, subtitle, image_url, link_url, badge_text, display_order, id]
            );
            return result;
        } catch (error) {
            console.error('Error updating slider:', error);
            throw error;
        }
    },

    // ลบ slider
    delete: async (id) => {
        try {
            const [result] = await db.query('DELETE FROM sliders WHERE id = ?', [id]);
            return result;
        } catch (error) {
            console.error('Error deleting slider:', error);
            throw error;
        }
    },

    // สลับสถานะ active/inactive
    toggleActive: async (id) => {
        try {
            const [result] = await db.query(
                'UPDATE sliders SET is_active = NOT is_active WHERE id = ?',
                [id]
            );
            return result;
        } catch (error) {
            console.error('Error toggling slider status:', error);
            throw error;
        }
    }
};

module.exports = Slider;
