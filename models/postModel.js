const db = require('./db');

const Post = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM posts ORDER BY id DESC');
        return rows;
    },
    // เพิ่มฟังก์ชันนี้
    create: async (title, date_posted) => {
        return await db.query('INSERT INTO posts (title, date_posted) VALUES (?, ?)', [title, date_posted]);
    }
};

module.exports = Post;