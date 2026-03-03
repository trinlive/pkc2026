const mysql = require('mysql2');

// สร้าง connection pool สำหรับ Joomla Database เก่า
const joomlaPool = mysql.createPool({
    host: 'localhost',
    user: 'pkc_joomla_full',
    password: 'dRy94k$21',
    database: 'pkc_joomla_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const PREFIX = 'fn4n2_'; // Joomla table prefix

const JoomlaDB = {
    // ================================
    // ARTICLES / CONTENT
    // ================================

    // ดึงบทความทั้งหมด (รวมหมวดหมู่)
    getAllArticles: async (limit = null, offset = 0, published = null) => {
        try {
            let query = `
                SELECT 
                    c.id,
                    c.title,
                    c.alias,
                    c.introtext,
                    c.fulltext,
                    c.state,
                    c.catid,
                    cat.title as category_name,
                    c.created,
                    c.modified,
                    c.publish_up,
                    c.publish_down,
                    c.created_by,
                    u.name as author_name,
                    c.images,
                    c.access
                FROM ${PREFIX}content c
                LEFT JOIN ${PREFIX}categories cat ON c.catid = cat.id
                LEFT JOIN ${PREFIX}users u ON c.created_by = u.id
                WHERE c.state = 1
            `;

            let params = [];

            if (published !== null) {
                query += ` AND c.state = ?`;
                params.push(published ? 1 : 0);
            }

            query += ` ORDER BY c.publish_up DESC`;

            if (limit) {
                query += ` LIMIT ? OFFSET ?`;
                params.push(limit, offset);
            }

            const db = joomlaPool.promise();
            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching Joomla articles:', error);
            return [];
        }
    },

    // ดึงบทความตาม ID
    getArticleById: async (id) => {
        try {
            const db = joomlaPool.promise();
            const query = `
                SELECT 
                    c.id,
                    c.title,
                    c.alias,
                    c.introtext,
                    c.fulltext,
                    c.state,
                    c.catid,
                    cat.title as category_name,
                    c.created,
                    c.modified,
                    c.publish_up,
                    c.publish_down,
                    c.created_by,
                    u.name as author_name,
                    c.images,
                    c.access
                FROM ${PREFIX}content c
                LEFT JOIN ${PREFIX}categories cat ON c.catid = cat.id
                LEFT JOIN ${PREFIX}users u ON c.created_by = u.id
                WHERE c.id = ? AND c.state = 1
            `;
            const [rows] = await db.query(query, [id]);
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching article by ID:', error);
            return null;
        }
    },

    // ดึงบทความตามหมวดหมู่
    getArticlesByCategory: async (categoryId, limit = null, offset = 0) => {
        try {
            const db = joomlaPool.promise();
            let query = `
                SELECT 
                    c.id,
                    c.title,
                    c.alias,
                    c.introtext,
                    c.fulltext,
                    c.state,
                    c.catid,
                    cat.title as category_name,
                    c.created,
                    c.modified,
                    c.publish_up,
                    c.publish_down,
                    c.created_by,
                    u.name as author_name,
                    c.images
                FROM ${PREFIX}content c
                LEFT JOIN ${PREFIX}categories cat ON c.catid = cat.id
                LEFT JOIN ${PREFIX}users u ON c.created_by = u.id
                WHERE c.catid = ? AND c.state = 1
                ORDER BY c.publish_up DESC
            `;

            let params = [categoryId];

            if (limit) {
                query += ` LIMIT ? OFFSET ?`;
                params.push(limit, offset);
            }

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching articles by category:', error);
            return [];
        }
    },

    // นับจำนวนบทความทั้งหมด
    countArticles: async (published = null) => {
        try {
            const db = joomlaPool.promise();
            let query = `SELECT COUNT(*) as total FROM ${PREFIX}content WHERE state = 1`;

            const [rows] = await db.query(query);
            return rows[0].total;
        } catch (error) {
            console.error('Error counting articles:', error);
            return 0;
        }
    },

    // ================================
    // CATEGORIES
    // ================================

    // ดึงหมวดหมู่ทั้งหมด
    getAllCategories: async (published = true) => {
        try {
            const db = joomlaPool.promise();
            let query = `
                SELECT 
                    id,
                    title,
                    alias,
                    description,
                    published,
                    parent_id,
                    level,
                    language
                FROM ${PREFIX}categories
                WHERE extension = 'com_content'
            `;

            if (published) {
                query += ` AND published = 1`;
            }

            query += ` ORDER BY level, lft`;

            const [rows] = await db.query(query);
            return rows;
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    // ดึงหมวดหมู่ตาม ID
    getCategoryById: async (id) => {
        try {
            const db = joomlaPool.promise();
            const [rows] = await db.query(
                `SELECT * FROM ${PREFIX}categories WHERE id = ? AND extension = 'com_content'`,
                [id]
            );
            return rows[0] || null;
        } catch (error) {
            console.error('Error fetching category by ID:', error);
            return null;
        }
    },

    // ================================
    // USERS
    // ================================

    // ดึงผู้ใช้ทั้งหมด
    getAllUsers: async () => {
        try {
            const db = joomlaPool.promise();
            const [rows] = await db.query(
                `
                SELECT 
                    id,
                    name,
                    username,
                    email,
                    block,
                    registerDate,
                    lastvisitDate
                FROM ${PREFIX}users
                ORDER BY registerDate DESC
                `
            );
            return rows;
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    },

    // ========================
    // MENUS
    // ========================

    // ดึง Menu Items
    getMenuItems: async (menuType = null) => {
        try {
            const db = joomlaPool.promise();
            let query = `
                SELECT 
                    id,
                    menutype,
                    title,
                    alias,
                    link,
                    type,
                    published,
                    parent_id,
                    level,
                    lft,
                    rgt,
                    access
                FROM ${PREFIX}menu
                WHERE published = 1
            `;

            let params = [];

            if (menuType) {
                query += ` AND menutype = ?`;
                params.push(menuType);
            }

            query += ` ORDER BY lft`;

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching menu items:', error);
            return [];
        }
    },

    // ดึง Menu Types
    getMenuTypes: async () => {
        try {
            const db = joomlaPool.promise();
            const [rows] = await db.query(
                `SELECT DISTINCT menutype FROM ${PREFIX}menu ORDER BY menutype`
            );
            return rows;
        } catch (error) {
            console.error('Error fetching menu types:', error);
            return [];
        }
    },

    // ================================
    // IMAGES / ASSETS
    // ================================

    // ดึง Assets (ไฟล์อัพโหลด)
    getAssets: async (limit = null) => {
        try {
            const db = joomlaPool.promise();
            let query = `
                SELECT 
                    id,
                    name,
                    title,
                    type,
                    size,
                    created,
                    modified,
                    path
                FROM ${PREFIX}assets
                WHERE type = 'file'
                ORDER BY created DESC
            `;

            let params = [];

            if (limit) {
                query += ` LIMIT ?`;
                params.push(limit);
            }

            const [rows] = await db.query(query, params);
            return rows;
        } catch (error) {
            console.error('Error fetching assets:', error);
            return [];
        }
    },

    // ===================================
    // DATABASE STATISTICS
    // ===================================

    // ตรวจสอบสถานะฐานข้อมูล
    getDbStats: async () => {
        try {
            const db = joomlaPool.promise();

            const [articles] = await db.query(`SELECT COUNT(*) as count FROM ${PREFIX}content`);
            const [categories] = await db.query(`SELECT COUNT(*) as count FROM ${PREFIX}categories WHERE extension = 'com_content'`);
            const [users] = await db.query(`SELECT COUNT(*) as count FROM ${PREFIX}users`);
            const [menus] = await db.query(`SELECT COUNT(*) as count FROM ${PREFIX}menu`);

            return {
                articles: articles[0].count,
                categories: categories[0].count,
                users: users[0].count,
                menus: menus[0].count,
                database: 'pkc_joomla_db',
                status: 'connected'
            };
        } catch (error) {
            console.error('Error getting database stats:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    },

    // ===================================
    // CONNECTION TEST
    // ===================================

    // ทดสอบการเชื่อมต่อ
    testConnection: async () => {
        try {
            const db = joomlaPool.promise();
            const connection = await db.getConnection();
            await connection.ping();
            connection.release();
            return { status: 'connected', database: 'pkc_joomla_db' };
        } catch (error) {
            console.error('Connection test failed:', error);
            return { status: 'error', message: error.message };
        }
    },

    // ===================================
    // UTILITY FUNCTIONS
    // ===================================

    // ดึง Raw SQL Query
    query: async (sql, params = []) => {
        try {
            const db = joomlaPool.promise();
            const [rows] = await db.query(sql, params);
            return rows;
        } catch (error) {
            console.error('Error executing query:', error);
            return [];
        }
    }
};

module.exports = JoomlaDB;
