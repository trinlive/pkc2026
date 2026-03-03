const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { execSync } = require('child_process');

const uploadDir = path.join(__dirname, '../public/uploads/news');
const tempUploadDir = path.join(__dirname, '../public/uploads/news/temp');
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB

// สร้างโฟลเดอร์สำหรับอัปโหลด
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}

const allowedImageExt = /jpeg|jpg|png|webp|gif|avif/;
const allowedAttachmentExt = /pdf|jpg|jpeg|png/;

/**
 * บีบอัด PDF ด้วย Ghostscript
 * @param {string} inputPath - ไฟล์ PDF ต้นทาง
 * @param {string} outputPath - ไฟล์ PDF ปลายทาง (บีบอัดแล้ว)
 * @returns {Promise<void>}
 */
const compressPDF = async (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        try {
            // ใช้ /ebook setting = 150 dpi (สมดุลระหว่างขนาดกับคุณภาพ)
            const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${outputPath}" "${inputPath}"`;
            
            execSync(gsCommand, { stdio: 'pipe' });
            
            // เช็คว่าไฟล์ output ถูกสร้างจริง
            if (fs.existsSync(outputPath)) {
                const inputSize = fs.statSync(inputPath).size;
                const outputSize = fs.statSync(outputPath).size;
                
                // ถ้าบีบอัดแล้วไฟล์ใหญ่กว่าเดิม ให้ใช้ไฟล์เดิม
                if (outputSize >= inputSize) {
                    fs.unlinkSync(outputPath);
                    fs.copyFileSync(inputPath, outputPath);
                }
                
                resolve();
            } else {
                reject(new Error('ไม่สามารถสร้างไฟล์ PDF ที่บีบอัดได้'));
            }
        } catch (error) {
            reject(new Error(`เกิดข้อผิดพลาดในการบีบอัด PDF: ${error.message}`));
        }
    });
};

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
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = (file.mimetype || '').toLowerCase();

    if (file.fieldname === 'image') {
        const extname = allowedImageExt.test(ext);
        const mimetype = mime.startsWith('image/');
        if (extname && mimetype) {
            return cb(null, true);
        }
        return cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ: .jpg, .jpeg, .png, .webp, .gif, .avif'));
    }

    if (file.fieldname === 'attachment') {
        const extname = allowedAttachmentExt.test(ext);
        const mimetype = mime === 'application/pdf' || mime.startsWith('image/');
        if (extname && mimetype) {
            return cb(null, true);
        }
        return cb(new Error('ไฟล์อ่านรายละเอียดอนุญาตเฉพาะ .pdf, .jpg, .jpeg, .png'));
    }

    return cb(new Error('ฟิลด์อัปโหลดไม่ถูกต้อง'));
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
                    message: `ไฟล์ใหญ่เกินกำหนด (รูปภาพไม่เกิน 10MB, ไฟล์อ่านรายละเอียดไม่เกิน 25MB)`
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
                return res.status(400).json({ success: false, message: 'ไฟล์อ่านรายละเอียดมีขนาดใหญ่เกิน 25MB' });
            }

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
                req.uploadedImage = `/uploads/news/${filename.replace(/\.[^/.]+$/, '.webp')}`;
                req.uploadedThumb = `/uploads/news/${filename.replace(/\.[^/.]+$/, '-thumb.webp')}`;
            }

            if (attachmentFile) {
                const ext = path.extname(attachmentFile.filename).toLowerCase();
                const attachmentName = `attachment_${Date.now()}${ext}`;
                const destPath = path.join(uploadDir, attachmentName);
                
                // ถ้าเป็น PDF ให้บีบอัดก่อน
                if (ext === '.pdf') {
                    try {
                        const tempPdfPath = attachmentFile.path;
                        await compressPDF(tempPdfPath, destPath);
                        fs.unlinkSync(tempPdfPath); // ลบไฟล์ชั่วคราว
                        
                        const compressedSize = fs.statSync(destPath).size;
                        console.log(`PDF compressed: ${attachmentFile.originalname} → ${(compressedSize / (1024 * 1024)).toFixed(2)} MB`);
                    } catch (compressError) {
                        console.warn('PDF compression failed, using original file:', compressError.message);
                        // ถ้าบีบอัดไม่ได้ให้ใช้ไฟล์เดิม
                        fs.renameSync(attachmentFile.path, destPath);
                    }
                } else {
                    // ไฟล์รูปภาพให้ย้ายตรงๆ (เพราะมีการ resize ฝั่ง client แล้ว)
                    fs.renameSync(attachmentFile.path, destPath);
                }
                
                req.uploadedAttachment = `/uploads/news/${attachmentName}`;
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
