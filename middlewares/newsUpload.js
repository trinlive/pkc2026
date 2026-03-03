const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../public/uploads/news');
const tempUploadDir = path.join(__dirname, '../public/uploads/news/temp');

// สร้างโฟลเดอร์สำหรับอัปโหลด
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

const allowedExt = /jpeg|jpg|png|webp|gif|avif/;

// เก็บไฟล์ชั่วคราวก่อน resize
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, tempUploadDir);
    },
    filename: (_req, file, cb) => {
        const safeName = file.originalname
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]/g, '-');
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${safeName}${ext}`);
    }
});

const fileFilter = (_req, file, cb) => {
    const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedExt.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }

    return cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ: .jpg, .jpeg, .png, .webp, .gif, .avif'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

module.exports = (req, res, next) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!req.file) {
            return next(); // ข้ามไปถ้าไม่มีไฟล์
        }

        try {
            const tempPath = req.file.path;
            const filename = req.file.filename;
            const finalPath = path.join(uploadDir, filename);
            
            // Resize รูปภาพให้เป็นขนาด 1200x630 (สำหรับแสดงบนหน้าแรก) และ 300x200 (thumbnail)
            await sharp(tempPath)
                .resize(1200, 630, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: 80 })
                .toFile(finalPath.replace(/\.[^/.]+$/, '.webp'));

            // สร้าง thumbnail ขนาด 400x300
            await sharp(tempPath)
                .resize(400, 300, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: 75 })
                .toFile(finalPath.replace(/\.[^/.]+$/, '-thumb.webp'));

            // ลบไฟล์ต้นฉบับและไฟล์ชั่วคราว
            fs.unlinkSync(tempPath);

            // ส่ง URL รูปภาพไปยัง request object
            req.uploadedImage = `/uploads/news/${filename.replace(/\.[^/.]+$/, '.webp')}`;
            req.uploadedThumb = `/uploads/news/${filename.replace(/\.[^/.]+$/, '-thumb.webp')}`;

            next();
        } catch (error) {
            console.error('Error processing image:', error);
            fs.unlinkSync(req.file.path);
            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการประมวลรูปภาพ' });
        }
    });
};
