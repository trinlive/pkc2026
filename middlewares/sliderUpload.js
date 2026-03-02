const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../public/uploads/sliders');
const tempUploadDir = path.join(__dirname, '../public/uploads/sliders/temp');

// สร้างโฟลเดอร์สำหรับอัปโหลด
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

const allowedExt = /jpeg|jpg|png|webp|gif/;

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

    return cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ: .jpg, .jpeg, .png, .webp, .gif'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // เพิ่มเป็น 10MB เพราะจะ resize
});

module.exports = (req, res, next) => {
    upload.single('image_file')(req, res, async (err) => {
        if (err) {
            req.uploadError = err.message || 'อัปโหลดไฟล์ไม่สำเร็จ';
            return next();
        }

        // ถ้าไม่มีไฟล์ ให้ผ่านไป
        if (!req.file) {
            return next();
        }

        try {
            const tempFilePath = req.file.path;
            const fileName = req.file.filename;
            const finalFilePath = path.join(uploadDir, fileName);

            // Resize รูปภาพเป็น 1920x1080
            await sharp(tempFilePath)
                .resize(1920, 1080, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 90 })
                .toFile(finalFilePath);

            // ลบไฟล์ชั่วคราว
            fs.unlinkSync(tempFilePath);

            // อัปเดตข้อมูล path ใน req.file
            req.file.path = finalFilePath;
            req.file.filename = fileName;

            next();
        } catch (resizeError) {
            console.error('Error resizing image:', resizeError);
            req.uploadError = 'ไม่สามารถปรับขนาดรูปภาพได้';
            
            // ลบไฟล์ชั่วคราวถ้ามี error
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            next();
        }
    });
};