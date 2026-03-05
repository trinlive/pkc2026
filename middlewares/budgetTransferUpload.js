const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../public/uploads/budget_transfer');
const tempUploadDir = path.join(__dirname, '../public/uploads/budget_transfer/temp');

// Create directories
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB

const allowedImageExt = /jpeg|jpg|png|gif|webp/;
const allowedAttachmentExt = /pdf|jpg|jpeg|png/;

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
    if (file.fieldname === 'image') {
        const extname = allowedImageExt.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedImageExt.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        return cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ: .jpg, .jpeg, .png, .gif, .webp'));
    } else if (file.fieldname === 'attachment') {
        const ext = path.extname(file.originalname).toLowerCase();
        const extMatch = allowedAttachmentExt.test(ext);
        const mimetypeMatch = /pdf|image\/jpeg|image\/png/.test(file.mimetype);
        
        if (extMatch && mimetypeMatch) {
            return cb(null, true);
        }
        return cb(new Error('อนุญาตเฉพาะ PDF, JPG, JPEG, PNG'));
    }
    
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_ATTACHMENT_SIZE }
});

module.exports = (req, res, next) => {
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'attachment', maxCount: 1 }
    ])(req, res, async (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `ไฟล์ใหญ่เกินกำหนด (รูปภาพไม่เกิน 10MB, ไฟล์แนบไม่เกิน 25MB)`
                });
            }
            return res.status(400).json({ success: false, message: err.message });
        }

        const imageFile = req.files?.image?.[0] || null;
        const attachmentFile = req.files?.attachment?.[0] || null;

        try {
            if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
                if (imageFile.path && fs.existsSync(imageFile.path)) {
                    fs.unlinkSync(imageFile.path);
                }
                if (attachmentFile?.path && fs.existsSync(attachmentFile.path)) {
                    fs.unlinkSync(attachmentFile.path);
                }
                return res.status(400).json({ success: false, message: 'รูปภาพมีขนาดใหญ่เกิน 10MB' });
            }

            if (attachmentFile && attachmentFile.size > MAX_ATTACHMENT_SIZE) {
                if (attachmentFile.path && fs.existsSync(attachmentFile.path)) {
                    fs.unlinkSync(attachmentFile.path);
                }
                if (imageFile?.path && fs.existsSync(imageFile.path)) {
                    fs.unlinkSync(imageFile.path);
                }
                return res.status(400).json({ success: false, message: 'ไฟล์แนบมีขนาดใหญ่เกิน 25MB' });
            }

            // Process image
            if (imageFile) {
                const tempPath = imageFile.path;
                const filename = imageFile.filename;
                const finalPath = path.join(uploadDir, filename);

                await sharp(tempPath)
                    .resize(1200, 630, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .webp({ quality: 80 })
                    .toFile(finalPath.replace(/\.[^/.]+$/, '.webp'));

                await sharp(tempPath)
                    .resize(400, 300, {
                        fit: 'cover',
                        position: 'center'
                    })
                    .webp({ quality: 75 })
                    .toFile(finalPath.replace(/\.[^/.]+$/, '-thumb.webp'));

                fs.unlinkSync(tempPath);
                req.uploadedImage = `/uploads/budget_transfer/${filename.replace(/\.[^/.]+$/, '.webp')}`;
                req.uploadedThumb = `/uploads/budget_transfer/${filename.replace(/\.[^/.]+$/, '-thumb.webp')}`;
            }

            // Process attachment
            if (attachmentFile) {
                const ext = path.extname(attachmentFile.filename).toLowerCase();
                const attachmentName = `attachment_${Date.now()}${ext}`;
                const destPath = path.join(uploadDir, 'attachments', attachmentName);

                // Create attachments directory if not exist
                const attachmentsDir = path.join(uploadDir, 'attachments');
                if (!fs.existsSync(attachmentsDir)) {
                    fs.mkdirSync(attachmentsDir, { recursive: true });
                }

                // For budget transfer, just copy the file as-is
                fs.renameSync(attachmentFile.path, destPath);
                req.uploadedAttachment = `/uploads/budget_transfer/attachments/${attachmentName}`;
            }

            next();
        } catch (error) {
            console.error('Error processing upload:', error);

            if (imageFile?.path && fs.existsSync(imageFile.path)) {
                fs.unlinkSync(imageFile.path);
            }
            if (attachmentFile?.path && fs.existsSync(attachmentFile.path)) {
                fs.unlinkSync(attachmentFile.path);
            }

            return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการประมวลไฟล์อัปโหลด' });
        }
    });
};
