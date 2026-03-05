const fs = require('fs').promises;
const path = require('path');
const Slider = require('../models/sliderModel');
const News = require('../models/newsModel');
const Activity = require('../models/activityModel');
const BudgetTransfer = require('../models/budgetTransferModel');
const JoomlaDB = require('../models/joomla-db');

const DESTINATION_MENU_MAP = {
    news: 'ข่าวประชาสัมพันธ์',
    activities: 'ข่าวกิจกรรม',
    budgettransfer: 'การโอนงบประมาณรายจ่ายประจำปี'
};

/**
 * ทำความสะอาด image URL โดยเอาเฉพาะ path ส่วนที่ใช้ได้จริง
 * ลบ Joomla image reference ออก เช่น #joomlaImage://... หรือ query string
 * @param {string} imageUrl - URL จากฐานข้อมูล เช่น "images/news2026/file.jpg#joomlaImage://..."
 * @returns {string} - Path ที่สะอาด เช่น "/uploads/news/file.jpg" หรือ "images/news2026/file.jpg"
 */
const cleanImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // ลบ Joomla image reference ที่อยู่หลัง #
    let cleanPath = imageUrl.split('#')[0].trim();
    
    // ถอด URL encoding (e.g. %20 → space)
    try {
        cleanPath = decodeURIComponent(cleanPath);
    } catch (e) {
        // ไม่ต้องทำอะไรถ้า decode ไม่ได้
    }
    
    return cleanPath || null;
};

const normalizeImageUrlForDisplay = (imageUrl) => {
    const cleanUrl = cleanImageUrl(imageUrl);
    if (!cleanUrl) return '';

    if (/^https?:\/\//i.test(cleanUrl)) {
        return cleanUrl;
    }

    // ไฟล์ที่มาจาก Joomla source (ต้นทาง) ให้ชี้ไปโดเมนหลัก
    if (cleanUrl.startsWith('images/')) {
        return `https://pakkretcity.go.th/${cleanUrl}`;
    }

    if (cleanUrl.startsWith('/images/')) {
        return `https://pakkretcity.go.th${cleanUrl}`;
    }

    // ไฟล์ปลายทางของระบบใหม่ (/uploads/...)
    if (cleanUrl.startsWith('/')) {
        return cleanUrl;
    }

    return `/${cleanUrl}`;
};

const resolveDestinationNewsImagePath = (imageUrl) => {
    const cleanUrl = cleanImageUrl(imageUrl);
    if (!cleanUrl) return null;

    const normalized = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
    if (!normalized.startsWith('/uploads/news/')) {
        return null;
    }

    return path.join('/var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th/public', normalized);
};

/**
 * คัดลอกรูปภาพจาก Joomla ไปยัง N-Pakkret พร้อมเปลี่ยนชื่อไฟล์เป็น timestamp
 * @param {string} htmlContent - HTML content ที่มี image tags
 * @param {Date} postedDate - วันที่ลงข่าวต้นฉบับจาก Joomla (ใช้สร้าง timestamp)
 * @returns {Promise<{updatedContent: string, copiedImages: Array, errors: Array}>}
 */
const copyImagesFromJoomla = async (htmlContent, postedDate = null) => {
    if (!htmlContent) return { updatedContent: '', copiedImages: [], errors: [] };

    const joomlaImagesPath = '/var/www/vhosts/pakkretcity.go.th/httpdocs/images';
    const npakkretImagesPath = '/var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th/public/uploads/news';
    
    // สร้าง timestamp จากวันที่ลงข่าว เช่น 20260303_143045
    const generateTimestamp = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            date = new Date();
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        const secs = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${mins}${secs}`;
    };

    const timestamp = generateTimestamp(postedDate);
    const copiedImages = [];
    const errors = [];
    let updatedContent = htmlContent;

    // Regex เพื่อหา image paths ทั้งหมด (images/news2026/..., images/news2025/..., etc.)
    // รองรับทั้งใน src="" และ plain text ที่อ้างอิง
    const imagePatterns = [
        /images\/(news\d{4}\/[^"\s<>]+\.(jpg|jpeg|png|gif|webp|pdf|JPG|JPEG|PNG|GIF|WEBP|PDF))/gi,
        /images\/(news\/[^"\s<>]+\.(jpg|jpeg|png|gif|webp|pdf|JPG|JPEG|PNG|GIF|WEBP|PDF))/gi
    ];

    const foundImages = new Set();
    
    // หา image paths ทั้งหมดจากทุก pattern
    for (const pattern of imagePatterns) {
        const matches = htmlContent.matchAll(pattern);
        for (const match of matches) {
            foundImages.add(match[1]); // เก็บ path ส่วนหลัง images/ เช่น news2026/news5022.jpg
        }
    }

    // คัดลอกรูปแต่ละอันและแก้ path
    let imageIndex = 0;
    for (const imagePath of foundImages) {
        try {
            const sourcePath = path.join(joomlaImagesPath, imagePath);
            
            // ดึง extension จากไฟล์ต้นฉบับ
            const fileExt = path.extname(imagePath).toLowerCase(); // .jpg, .png, etc.
            const newFilename = `news_${timestamp}_${imageIndex}${fileExt}`; // news_20260303_143045_0.jpg
            const destPath = path.join(npakkretImagesPath, newFilename);

            // เช็คว่าไฟล์ต้นทางมีอยู่จริงหรือไม่
            try {
                await fs.access(sourcePath);
                
                // สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
                await fs.mkdir(npakkretImagesPath, { recursive: true });
                
                // คัดลอกไฟล์พร้อมเปลี่ยนชื่อ
                await fs.copyFile(sourcePath, destPath);
                
                const oldPath = `images/${imagePath}`;
                const newPath = `/uploads/news/${newFilename}`;
                
                copiedImages.push({
                    original: oldPath,
                    copied: newPath,
                    newFilename: newFilename
                });

                // แก้ path ใน content ทั้งหมด
                updatedContent = updatedContent.replace(new RegExp(oldPath, 'gi'), newPath);
                
                imageIndex++;
                
            } catch (accessError) {
                errors.push({
                    path: `images/${imagePath}`,
                    error: 'Source file not found',
                    details: accessError.message
                });
            }
            
        } catch (error) {
            errors.push({
                path: `images/${imagePath}`,
                error: 'Copy failed',
                details: error.message
            });
        }
    }

    return { updatedContent, copiedImages, errors };
};

/**
 * คัดลอก Thumbnail หัวข้อข่าว จาก Joomla ไปยัง N-Pakkret
 * @param {string} originalImageUrl - Image URL จาก Joomla (เช่น "images/news2026/news5022.jpg")
 * @param {Date} postedDate - วันที่ลงข่าวต้นฉบับจาก Joomla
 * @returns {Promise<string>} - Path ใหม่ที่ชี้ไปยัง destination (เช่น "/uploads/news/news_20260303_143045_thumb.jpg")
 */
const copyThumbnailFromJoomla = async (originalImageUrl, postedDate = null) => {
    if (!originalImageUrl) return null;

    try {
        const joomlaImagesPath = '/var/www/vhosts/pakkretcity.go.th/httpdocs/images';
        const npakkretImagesPath = '/var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th/public/uploads/news';

        // Clean URL (remove fragment)
        const cleanUrl = cleanImageUrl(originalImageUrl);
        
        // ตรวจสอบว่า path มี images/ หรือ /images/ (Joomla format)
        if (!cleanUrl || (!cleanUrl.includes('images/'))) {
            return originalImageUrl; // ถ้าไม่ใช่ Joomla path ให้คืนเดิม
        }

        // สร้าง timestamp
        const generateTimestamp = (date) => {
            if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                date = new Date();
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const mins = String(date.getMinutes()).padStart(2, '0');
            const secs = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}_${hours}${mins}${secs}`;
        };

        const timestamp = generateTimestamp(postedDate);

        // แยก image path จาก cleanUrl
        let imagePath;
        if (cleanUrl.startsWith('images/')) {
            imagePath = cleanUrl; // "images/news2026/file.jpg"
        } else if (cleanUrl.startsWith('/images/')) {
            imagePath = cleanUrl.substring(1); // remove leading / → "images/news2026/file.jpg"
        } else {
            return originalImageUrl;
        }

        // source base คือ .../httpdocs/images ดังนั้นต้องตัด prefix images/ ออกก่อน join
        const relativeToImagesRoot = imagePath.replace(/^images\//i, '');
        const sourcePath = path.join(joomlaImagesPath, relativeToImagesRoot);
        
        // ตรวจสอบว่าไฟล์ต้นทางมีอยู่
        await fs.access(sourcePath);

        // สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
        await fs.mkdir(npakkretImagesPath, { recursive: true });

        // ดึง extension และสร้างชื่อไฟล์ใหม่
        const fileExt = path.extname(imagePath).toLowerCase() || '.jpg';
        const newFilename = `news_${timestamp}_thumb${fileExt}`;
        const destPath = path.join(npakkretImagesPath, newFilename);

        // คัดลอกไฟล์
        await fs.copyFile(sourcePath, destPath);

        // คืน destination path
        return `/uploads/news/${newFilename}`;

    } catch (error) {
        console.error('Error copying thumbnail from Joomla:', error);
        return originalImageUrl; // ถ้า copy ไม่ได้ให้คืนเดิม
    }
};


/**
 * คัดลอก Thumbnail จาก Joomla ไปยัง /uploads/news_activity/ สำหรับ activities
 * @param {string} originalImageUrl - URL รูปภาพจาก Joomla (อาจมี #joomlaImage://...)
 * @param {Date} postedDate - วันที่ลงข่าว
 * @returns {Promise<string|null>} - path ของรูปที่บันทึก หรือ null ถ้าไม่สำเร็จ
 */
const copyThumbnailFromJoomlaForActivities = async (originalImageUrl, postedDate = null) => {
    if (!originalImageUrl) return null;

    try {
        const joomlaImagesPath = '/var/www/vhosts/pakkretcity.go.th/httpdocs/images';
        const npakkretImagesPath = '/var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th/public/uploads/news_activity';

        // Clean URL (remove fragment)
        const cleanUrl = cleanImageUrl(originalImageUrl);
        
        // ตรวจสอบว่า path มี images/ หรือ /images/ (Joomla format)
        if (!cleanUrl || (!cleanUrl.includes('images/'))) {
            return null; // ถ้าไม่ใช่ Joomla path ให้คืน null
        }

        // สร้าง timestamp
        const generateTimestamp = (date) => {
            if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                date = new Date();
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const mins = String(date.getMinutes()).padStart(2, '0');
            const secs = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}_${hours}${mins}${secs}`;
        };

        const timestamp = generateTimestamp(postedDate);

        // แยก image path จาก cleanUrl
        let imagePath;
        if (cleanUrl.startsWith('images/')) {
            imagePath = cleanUrl; // "images/activity2026/file.jpg"
        } else if (cleanUrl.startsWith('/images/')) {
            imagePath = cleanUrl.substring(1); // remove leading / → "images/activity2026/file.jpg"
        } else {
            return null;
        }

        // source base คือ .../httpdocs/images ดังนั้นต้องตัด prefix images/ ออกก่อน join
        const relativeToImagesRoot = imagePath.replace(/^images\//i, '');
        const sourcePath = path.join(joomlaImagesPath, relativeToImagesRoot);
        
        // ตรวจสอบว่าไฟล์ต้นทางมีอยู่
        await fs.access(sourcePath);

        // สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
        await fs.mkdir(npakkretImagesPath, { recursive: true });

        // ดึง extension และสร้างชื่อไฟล์ใหม่ (activity_ prefix for activities)
        const fileExt = path.extname(imagePath).toLowerCase() || '.jpg';
        const newFilename = `activity_${timestamp}_thumb${fileExt}`;
        const destPath = path.join(npakkretImagesPath, newFilename);

        // คัดลอกไฟล์
        await fs.copyFile(sourcePath, destPath);

        // คืน destination path
        return `/uploads/news_activity/${newFilename}`;

    } catch (error) {
        console.error('Error copying thumbnail from Joomla for activities:', error);
        return null; // ถ้า copy ไม่ได้ให้คืน null
    }
};

/**
 * ดึงและคัดลอกไฟล์แนบ (PDF, JPG, PNG) จาก Joomla HTML content
 * @param {string} htmlContent - HTML ที่มี <a href="...pdf/jpg/png"> หรือ <img src="...jpg/png">
 * @param {Date} postedDate - วันที่ลงข่าวสำหรับสร้าง timestamp
 * @param {{destinationMenu?: 'news'|'activities', includeImageSrcFallback?: boolean}} options
 * @returns {Promise<{attachmentUrl: string|null, copiedAttachments: Array, errors: Array}>}
 */
const extractAndCopyAttachmentsFromJoomla = async (htmlContent, postedDate = null, options = {}) => {
    if (!htmlContent) return { attachmentUrl: null, copiedAttachments: [], errors: [] };

    const joomlaBasePath = '/var/www/vhosts/pakkretcity.go.th/httpdocs';
    const destinationMenu = ['activities', 'budgettransfer'].includes(options.destinationMenu)
        ? options.destinationMenu
        : 'news';
    const includeImageSrcFallback = options.includeImageSrcFallback === true;
    const attachmentUploadPrefix = destinationMenu === 'activities'
        ? '/uploads/news_activity/attachments'
        : destinationMenu === 'budgettransfer'
            ? '/uploads/budget_transfer/attachments'
            : '/uploads/news/attachments';
    const npakkretAttachmentsPath = destinationMenu === 'activities'
        ? '/var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th/public/uploads/news_activity/attachments'
        : destinationMenu === 'budgettransfer'
            ? '/var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th/public/uploads/budget_transfer/attachments'
            : '/var/www/vhosts/pakkretcity.go.th/n.pakkretcity.go.th/public/uploads/news/attachments';
    
    // สร้าง timestamp จากวันที่ลงข่าว
    const generateTimestamp = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            date = new Date();
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        const secs = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${mins}${secs}`;
    };

    const timestamp = generateTimestamp(postedDate);
    const copiedAttachments = [];
    const errors = [];

    // Regex เพื่อหา <a href="..."> ที่ชี้ไปยังไฟล์ PDF, JPG, PNG, JPEG
    // รองรับ: images/pdf/..., /images/pdf/..., https://pakkretcity.go.th/images/...
    const attachmentPattern = /<a[^>]+href=["']([^"']+\.(pdf|jpg|jpeg|png|PDF|JPG|JPEG|PNG))["'][^>]*>/gi;
    const imageSrcPattern = /<img[^>]+src=["']([^"']+\.(jpg|jpeg|png|JPG|JPEG|PNG))["'][^>]*>/gi;
    const pdfViewerPattern = /\{pdfviewer\s+file\s*=\s*([^\s}\"]+\.(pdf|jpg|jpeg|png|PDF|JPG|JPEG|PNG))\s*\}/gi;
    
    const foundAttachments = new Set();
    const matches = htmlContent.matchAll(attachmentPattern);
    
    for (const match of matches) {
        let attachmentUrl = match[1];
        
        // ถ้าเป็น full URL ให้แปลงเป็น relative path
        if (attachmentUrl.includes('pakkretcity.go.th')) {
            attachmentUrl = attachmentUrl.replace(/^https?:\/\/(www\.)?pakkretcity\.go\.th\/?/i, '');
        }
        
        foundAttachments.add(attachmentUrl);
    }

    // รองรับ Joomla plugin tag: {pdfviewer file=/images/pdf67/wd102.pdf }
    const pdfViewerMatches = htmlContent.matchAll(pdfViewerPattern);
    for (const match of pdfViewerMatches) {
        let attachmentUrl = match[1];

        if (attachmentUrl.includes('pakkretcity.go.th')) {
            attachmentUrl = attachmentUrl.replace(/^https?:\/\/(www\.)?pakkretcity\.go\.th\/?/i, '');
        }

        foundAttachments.add(attachmentUrl);
    }

    // สำหรับ activities: ถ้าไม่มี <a href> ให้ fallback ใช้รูปแรกจาก <img src>
    if (includeImageSrcFallback && foundAttachments.size === 0) {
        const imageMatch = imageSrcPattern.exec(htmlContent);
        if (imageMatch && imageMatch[1]) {
            let imageUrl = imageMatch[1];
            if (imageUrl.includes('pakkretcity.go.th')) {
                imageUrl = imageUrl.replace(/^https?:\/\/(www\.)?pakkretcity\.go\.th\/?/i, '');
            }
            foundAttachments.add(imageUrl);
        }
    }

    // คัดลอกไฟล์แนบแต่ละอัน
    let attachmentIndex = 0;
    let primaryAttachmentUrl = null; // ไฟล์แนบหลักสำหรับปุ่ม "อ่านรายละเอียด"

    for (const attachmentUrl of foundAttachments) {
        try {
            // สร้าง source path
            let relativePath = attachmentUrl;
            if (relativePath.startsWith('/')) {
                relativePath = relativePath.substring(1);
            }
            
            const sourcePath = path.join(joomlaBasePath, relativePath);
            
            // ดึง extension
            const fileExt = path.extname(attachmentUrl).toLowerCase();
            const newFilename = `attachment_${timestamp}_${attachmentIndex}${fileExt}`;
            const destPath = path.join(npakkretAttachmentsPath, newFilename);

            // เช็คว่าไฟล์ต้นทางมีอยู่จริง
            try {
                await fs.access(sourcePath);
                
                // สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
                await fs.mkdir(npakkretAttachmentsPath, { recursive: true });
                
                // คัดลอกไฟล์
                await fs.copyFile(sourcePath, destPath);
                
                const newPath = `${attachmentUploadPrefix}/${newFilename}`;
                
                copiedAttachments.push({
                    original: attachmentUrl,
                    copied: newPath,
                    newFilename: newFilename,
                    fileExt: fileExt
                });

                // เก็บไฟล์แรกเป็น primary attachment
                if (!primaryAttachmentUrl) {
                    primaryAttachmentUrl = newPath;
                }
                
                attachmentIndex++;
                
            } catch (accessError) {
                errors.push({
                    url: attachmentUrl,
                    error: 'Source file not found',
                    details: accessError.message
                });
            }
            
        } catch (error) {
            errors.push({
                url: attachmentUrl,
                error: 'Copy failed',
                details: error.message
            });
        }
    }

    return { 
        attachmentUrl: primaryAttachmentUrl, 
        copiedAttachments, 
        errors 
    };
};

const mapJoomlaCategoryToNews = (joomlaCategoryName = '') => {
    if (joomlaCategoryName.includes('ข่าว')) return 'ข่าวประชาสัมพันธ์';
    return 'ข่าวประชาสัมพันธ์';
};

const resolveDestinationCategory = (destinationMenu, joomlaCategoryName) => {
    if (destinationMenu && DESTINATION_MENU_MAP[destinationMenu]) {
        return DESTINATION_MENU_MAP[destinationMenu];
    }
    return mapJoomlaCategoryToNews(joomlaCategoryName);
};

const generateMigrationSummaryDescription = ({ title = '', introtext = '', fulltext = '', publishUp = null }) => {
    const stripHtml = (value = '') => String(value)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim();

    const cleanTitle = stripHtml(title);
    const introText = stripHtml(introtext);
    const fullText = stripHtml(fulltext);
    const mergedText = `${introText} ${fullText}`.replace(/\s+/g, ' ').trim();

    const chunks = mergedText
        .split(/[\n\r]+|\s{2,}|(?<=[.!?])\s+/)
        .map(part => part.trim())
        .filter(part => part.length >= 20);

    const toFormalLine = (value = '') => {
        let text = String(value)
            .replace(/^([»>\-•\s])+/, '')
            .replace(/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*/g, '')
            .trim();

        if (!text) return '';
        if (!/[.!?…ฯ]$/.test(text)) {
            text = `${text}.`;
        }

        return text;
    };

    const normalizeForCompare = (value = '') => String(value)
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[\s\u00A0]+/g, '')
        .replace(/[.,!?…ฯ:;"'“”‘’()\[\]{}\-_/\\]/g, '')
        .trim();

    const isDuplicateLine = (a = '', b = '') => {
        const left = normalizeForCompare(a);
        const right = normalizeForCompare(b);
        return !!left && !!right && left === right;
    };

    const fallbackLine2Patterns = [
        'เทศบาลนครปากเกร็ดขอประชาสัมพันธ์ข้อมูลข่าวสารเพื่อการรับทราบโดยทั่วกัน.',
        'เทศบาลนครปากเกร็ดขอเชิญชวนประชาชนรับทราบข้อมูลและร่วมให้ความสนใจในรายละเอียดของข่าวนี้.',
        'ทางเทศบาลนครปากเกร็ดขอแจ้งข้อมูลดังกล่าวเพื่อประโยชน์ในการรับทราบของประชาชนทั่วไป.',
        'เทศบาลนครปากเกร็ดขอเผยแพร่ข้อมูลนี้เพื่อให้ประชาชนได้รับทราบและสามารถติดตามรายละเอียดเพิ่มเติมได้.',
        'ประชาชนสามารถติดตามรายละเอียดเพิ่มเติมได้จากข้อมูลที่เทศบาลนครปากเกร็ดเผยแพร่.'
    ];
    const randomFallback = fallbackLine2Patterns[Math.floor(Math.random() * fallbackLine2Patterns.length)];

    let line2 = chunks[0]
        ? toFormalLine(chunks[0].length > 180 ? `${chunks[0].slice(0, 177)}...` : chunks[0])
        : randomFallback;

    const line1 = cleanTitle || 'ข่าวประชาสัมพันธ์';

    if (isDuplicateLine(line1, line2)) {
        const alternativeLine2 = chunks
            .map(item => toFormalLine(item.length > 180 ? `${item.slice(0, 177)}...` : item))
            .find(item => item && !isDuplicateLine(line1, item));

        line2 = alternativeLine2 || randomFallback;
    }

    let line3 = chunks.find((part, index) => index > 0 && part !== line2) || '';
    if (line3 && line3.length > 180) {
        line3 = `${line3.slice(0, 177)}...`;
    }
    line3 = toFormalLine(line3);

    if (isDuplicateLine(line3, line1) || isDuplicateLine(line3, line2)) {
        line3 = '';
    }

    const postDate = publishUp ? new Date(publishUp) : null;
    const dateLabel = postDate && !Number.isNaN(postDate.getTime())
        ? postDate.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })
        : null;

    if (!line3) {
        line3 = dateLabel
            ? `ประกาศ ณ วันที่ ${dateLabel}.`
            : 'ขอให้ประชาชนติดตามรายละเอียดเพิ่มเติมจากภาพประกอบหรือไฟล์แนบของข่าวนี้.';
    }

    return `<p>${line1}</p><p>${line2}</p><p>${line3}</p>`;
};

const adminController = {
    // หน้า Dashboard หลัก
    getDashboard: (req, res) => {
        res.render('admin/dashboard', { 
            title: 'ระบบจัดการ - N-Pakkret Admin',
            currentPage: 'dashboard'
        });
    },

    // จัดการ Partials
    getPartialsList: async (req, res) => {
        try {
            const partialsDir = path.join(__dirname, '../views/partials');
            const files = await fs.readdir(partialsDir);
            const ejsFiles = files.filter(file => file.endsWith('.ejs'));
            
            res.render('admin/partials-list', { 
                title: 'จัดการ Partials',
                currentPage: 'partials',
                partials: ejsFiles 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถอ่านไฟล์ Partials ได้');
        }
    },

    // แสดงเนื้อหา Partial
    getPartialContent: async (req, res) => {
        try {
            const filename = req.params.filename;
            const filePath = path.join(__dirname, '../views/partials', filename);
            const content = await fs.readFile(filePath, 'utf8');
            
            res.render('admin/partial-edit', { 
                title: `แก้ไข ${filename}`,
                currentPage: 'partials',
                filename,
                content 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถอ่านไฟล์ได้');
        }
    },

    // บันทึก Partial
    updatePartial: async (req, res) => {
        try {
            const filename = req.params.filename;
            const { content } = req.body;
            const filePath = path.join(__dirname, '../views/partials', filename);
            
            await fs.writeFile(filePath, content, 'utf8');
            res.redirect('/admin/partials');
        } catch (error) {
            res.status(500).send('ไม่สามารถบันทึกไฟล์ได้');
        }
    },

    // จัดการ Models
    getModelsList: async (req, res) => {
        try {
            const modelsDir = path.join(__dirname, '../models');
            const files = await fs.readdir(modelsDir);
            const jsFiles = files.filter(file => file.endsWith('.js'));
            
            res.render('admin/models-list', { 
                title: 'จัดการ Models',
                currentPage: 'models',
                models: jsFiles 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถอ่านไฟล์ Models ได้');
        }
    },

    // แสดงเนื้อหา Model
    getModelContent: async (req, res) => {
        try {
            const filename = req.params.filename;
            const filePath = path.join(__dirname, '../models', filename);
            const content = await fs.readFile(filePath, 'utf8');
            
            res.render('admin/model-edit', { 
                title: `แก้ไข ${filename}`,
                currentPage: 'models',
                filename,
                content 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถอ่านไฟล์ได้');
        }
    },

    // บันทึก Model
    updateModel: async (req, res) => {
        try {
            const filename = req.params.filename;
            const { content } = req.body;
            const filePath = path.join(__dirname, '../models', filename);
            
            await fs.writeFile(filePath, content, 'utf8');
            res.redirect('/admin/models');
        } catch (error) {
            res.status(500).send('ไม่สามารถบันทึกไฟล์ได้');
        }
    },

    // ========== จัดการข่าวประชาสัมพันธ์ ==========
    // รายการข่าวทั้งหมด
    getNewsList: async (req, res) => {
        try {
            // ดึงค่า limit จาก query parameter (default: 30)
            let limitParam = req.query.limit || '30';
            const searchQuery = (req.query.q || '').trim();
            let limit = null;
            
            // แปลงค่า limit
            if (limitParam === 'all') {
                limit = null; // ไม่มี limit
            } else {
                limit = parseInt(limitParam, 10) || 30;
            }
            
            const news = await News.getAll(limit, 0, searchQuery);
            const homepageNews = await News.getHomepageNews(5); // ดึงข่าวที่แสดงในหน้า Home
            const categories = await News.getCategories();
            const totalCount = await News.getCount('all');
            const filteredCount = await News.countByTitle(searchQuery);
            const publishedCount = await News.getCount('published');
            const draftCount = await News.getCount('draft');
            const featuredCount = await News.getCount('featured');

            const newsForView = news.map((item) => ({
                ...item,
                image_preview_url: normalizeImageUrlForDisplay(item.image_url)
            }));
            
            res.render('admin/news-list', { 
                title: 'จัดการข่าวประชาสัมพันธ์',
                currentPage: 'news',
                newsList: newsForView,
                homepageNews: homepageNews, // ส่งข่าวหน้า Home ไปแสดงด้วย
                categories,
                searchQuery,
                currentLimit: limitParam === 'all' ? 'all' : parseInt(limitParam, 10) || 30,
                statistics: {
                    total: totalCount,
                    filteredTotal: filteredCount,
                    published: publishedCount,
                    draft: draftCount,
                    featured: featuredCount
                }
            });
        } catch (error) {
            console.error('Error fetching news:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูลข่าวได้');
        }
    },

    // หน้าเพิ่มข่าวใหม่
    getNewsAddForm: async (req, res) => {
        try {
            const categories = await News.getCategories();
            res.render('admin/news-add', { 
                title: 'เพิ่มข่าวประชาสัมพันธ์ใหม่',
                currentPage: 'news',
                errorMessage: '',
                categories,
                formData: {}
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    // บันทึกข่าวใหม่
    createNews: async (req, res) => {
        try {
            const { title, description, news_category, date_posted, is_published } = req.body;
            const imageUrl = req.uploadedImage || '';
            const attachmentUrl = req.uploadedAttachment || '';

            if (!title) {
                const categories = await News.getCategories();
                return res.status(400).render('admin/news-add', {
                    title: 'เพิ่มข่าวประชาสัมพันธ์ใหม่',
                    currentPage: 'news',
                    errorMessage: 'กรุณากรอกหัวข้อข่าว',
                    categories,
                    formData: req.body
                });
            }

            const createdBy = 'Admin'; // สามารถแก้เป็น user account ได้ในอนาคต
            const newsDate = date_posted || new Date();
            
            await News.create(
                title,
                description || '',
                imageUrl,
                attachmentUrl,
                news_category || null,
                newsDate,
                is_published ? 1 : 0,
                createdBy
            );

            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error creating news:', error);
            const categories = await News.getCategories();
            res.status(500).render('admin/news-add', {
                title: 'เพิ่มข่าวประชาสัมพันธ์ใหม่',
                currentPage: 'news',
                errorMessage: 'เกิดข้อผิดพลาดในการบันทึกข่าว',
                categories,
                formData: req.body
            });
        }
    },

    // หน้าแก้ไขข่าว
    getNewsEditForm: async (req, res) => {
        try {
            const id = req.params.id;
            const news = await News.getById(id);
            const categories = await News.getCategories();
            
            if (!news) {
                return res.status(404).send('ไม่พบข่าวขนี้');
            }

            const newsForView = {
                ...news,
                image_preview_url: normalizeImageUrlForDisplay(news.image_url)
            };
            
            res.render('admin/news-edit', { 
                title: 'แก้ไขข่าว',
                currentPage: 'news',
                errorMessage: '',
                news: newsForView,
                categories
            });
        } catch (error) {
            console.error('Error fetching news:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูลข่าวได้');
        }
    },

    // อัพเดทข่าว
    updateNews: async (req, res) => {
        try {
            const id = req.params.id;
            const { title, description, news_category, date_posted, is_published, is_featured } = req.body;
            
            const existingNews = await News.getById(id);
            if (!existingNews) {
                return res.status(404).send('ไม่พบข่าวนี้');
            }

            if (!title) {
                const categories = await News.getCategories();
                return res.status(400).render('admin/news-edit', {
                    title: 'แก้ไขข่าว',
                    currentPage: 'news',
                    errorMessage: 'กรุณากรอกหัวข้อข่าว',
                    news: { ...existingNews, ...req.body },
                    categories
                });
            }

            const imageUrl = req.uploadedImage || existingNews.image_url;
            const attachmentUrl = req.uploadedAttachment || existingNews.attachment_url || '';
            const newsDate = date_posted || existingNews.date_posted;

            await News.update(
                id,
                title,
                description || '',
                imageUrl,
                attachmentUrl,
                news_category || null,
                newsDate,
                is_published ? 1 : 0,
                is_featured ? 1 : 0
            );

            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error updating news:', error);
            const id = req.params.id;
            const existingNews = await News.getById(id);
            const categories = await News.getCategories();
            res.status(500).render('admin/news-edit', {
                title: 'แก้ไขข่าว',
                currentPage: 'news',
                errorMessage: 'เกิดข้อผิดพลาดในการอัพเดทข่าว',
                news: existingNews,
                categories
            });
        }
    },

    // ลบข่าว
    deleteNews: async (req, res) => {
        try {
            const id = req.params.id;
            const news = await News.getById(id);
            
            if (!news) {
                return res.status(404).send('ไม่พบข่าวนี้');
            }

            // ลบไฟล์รูปภาพเฉพาะปลายทางเท่านั้น (/public/uploads/news)
            if (news.image_url) {
                const destinationImagePath = resolveDestinationNewsImagePath(news.image_url);
                if (destinationImagePath) {
                    try {
                        await fs.unlink(destinationImagePath);
                        console.log(`Deleted destination image: ${destinationImagePath}`);
                    } catch (fileError) {
                        console.warn(`Warning: Could not delete destination image for news ${id}:`, fileError);
                    }
                } else {
                    console.log(`Skip deleting source image for news ${id}: ${news.image_url}`);
                }
            }

            await News.delete(id);
            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error deleting news:', error);
            res.status(500).send('ไม่สามารถลบข่าวได้');
        }
    },

    // ลบข่าวหลายรายการ (AJAX)
    deleteNewsMultiple: async (req, res) => {
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ต้องระบุ ID ของข่าวที่ต้องการลบ'
                });
            }

            let deletedCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const id of ids) {
                try {
                    const news = await News.getById(id);
                    if (!news) {
                        errorCount++;
                        errors.push({ id, error: 'ไม่พบข่าวนี้' });
                        continue;
                    }

                    // ลบไฟล์รูปภาพเฉพาะปลายทางเท่านั้น (/public/uploads/news)
                    if (news.image_url) {
                        const destinationImagePath = resolveDestinationNewsImagePath(news.image_url);
                        if (!destinationImagePath) {
                            console.log(`Skip deleting source image for news ${id}: ${news.image_url}`);
                        } else {
                        try {
                                await fs.unlink(destinationImagePath);
                                console.log(`Deleted destination image: ${destinationImagePath}`);
                        } catch (fileError) {
                                console.warn(`Warning: Could not delete destination image for news ${id}:`, fileError);
                            }
                        }
                    }

                    // ลบจากในฐานข้อมูล
                    await News.delete(id);
                    deletedCount++;
                } catch (err) {
                    errorCount++;
                    errors.push({ id, error: err.message });
                    console.error(`Error deleting news ${id}:`, err);
                }
            }

            res.json({
                success: true,
                message: `ลบสำเร็จ ${deletedCount} รายการ${errorCount > 0 ? `, ล้มเหลว ${errorCount} รายการ` : ''}`,
                deletedCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error) {
            console.error('Error in deleteNewsMultiple:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลบข่าว',
                error: error.message
            });
        }
    },

    // เปลี่ยนสถานะเผยแพร่
    toggleNewsPublish: async (req, res) => {
        try {
            const id = req.params.id;
            await News.togglePublish(id);
            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error toggling publish status:', error);
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // เปลี่ยนสถานะข่าวเด่น
    toggleNewsFeatured: async (req, res) => {
        try {
            const id = req.params.id;
            await News.toggleFeatured(id);
            res.redirect('/admin/news');
        } catch (error) {
            console.error('Error toggling featured status:', error);
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // ========== จัดการ Sliders ==========
    // รายการ Slider ทั้งหมด
    getSlidersList: async (req, res) => {
        try {
            const sliders = await Slider.getAll();
            res.render('admin/sliders-list', { 
                title: 'จัดการ Slider',
                currentPage: 'sliders',
                sliders 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถโหลดข้อมูล Slider ได้');
        }
    },

    // หน้าเพิ่ม Slider ใหม่
    getSliderAddForm: (req, res) => {
        res.render('admin/slider-add', { 
            title: 'เพิ่ม Slider ใหม่',
            currentPage: 'sliders',
            errorMessage: '',
            formData: {}
        });
    },

    // บันทึก Slider ใหม่
    createSlider: async (req, res) => {
        try {
            if (req.uploadError) {
                return res.status(400).render('admin/slider-add', {
                    title: 'เพิ่ม Slider ใหม่',
                    currentPage: 'sliders',
                    errorMessage: req.uploadError,
                    formData: req.body
                });
            }

            const { title, subtitle, image_url, link_url, badge_text, display_order } = req.body;

            const uploadedImageUrl = req.file ? `/uploads/sliders/${req.file.filename}` : '';
            // ถ้ามีไฟล์ใหม่ ให้ใช้ไฟล์นั้นเท่านั้น (ไม่สนใจ URL field)
            const finalImageUrl = uploadedImageUrl || image_url;

            if (!finalImageUrl) {
                return res.status(400).render('admin/slider-add', {
                    title: 'เพิ่ม Slider ใหม่',
                    currentPage: 'sliders',
                    errorMessage: 'กรุณาใส่ URL รูปภาพ หรืออัปโหลดไฟล์รูปภาพอย่างน้อย 1 อย่าง',
                    formData: req.body
                });
            }

            await Slider.create(title, subtitle, finalImageUrl, link_url, badge_text, display_order || 0);
            res.redirect('/admin/sliders');
        } catch (error) {
            res.status(500).send('ไม่สามารถบันทึก Slider ได้');
        }
    },

    // หน้าแก้ไข Slider
    getSliderEditForm: async (req, res) => {
        try {
            const id = req.params.id;
            const slider = await Slider.getById(id);
            
            if (!slider) {
                return res.status(404).send('ไม่พบ Slider นี้');
            }
            
            res.render('admin/slider-edit', { 
                title: 'แก้ไข Slider',
                currentPage: 'sliders',
                errorMessage: '',
                slider 
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถโหลดข้อมูล Slider ได้');
        }
    },

    // อัพเดท Slider
    updateSlider: async (req, res) => {
        try {
            const id = req.params.id;
            const existingSlider = await Slider.getById(id);

            if (!existingSlider) {
                return res.status(404).send('ไม่พบ Slider นี้');
            }

            if (req.uploadError) {
                return res.status(400).render('admin/slider-edit', {
                    title: 'แก้ไข Slider',
                    currentPage: 'sliders',
                    errorMessage: req.uploadError,
                    slider: {
                        ...existingSlider,
                        ...req.body
                    }
                });
            }

            const { title, subtitle, image_url, link_url, badge_text, display_order } = req.body;
            const uploadedImageUrl = req.file ? `/uploads/sliders/${req.file.filename}` : '';
            // ถ้ามีไฟล์ใหม่ ให้ใช้ไฟล์นั้นเท่านั้น (ไม่สนใจ URL field)
            const finalImageUrl = uploadedImageUrl || image_url || existingSlider.image_url;

            await Slider.update(id, title, subtitle, finalImageUrl, link_url, badge_text, display_order);
            res.redirect('/admin/sliders');
        } catch (error) {
            res.status(500).send('ไม่สามารถอัพเดท Slider ได้');
        }
    },

    // ลบ Slider
    deleteSlider: async (req, res) => {
        try {
            const id = req.params.id;
            await Slider.delete(id);
            res.redirect('/admin/sliders');
        } catch (error) {
            res.status(500).send('ไม่สามารถลบ Slider ได้');
        }
    },

    // สลับสถานะ active/inactive
    toggleSliderStatus: async (req, res) => {
        try {
            const id = req.params.id;
            await Slider.toggleActive(id);
            res.redirect('/admin/sliders');
        } catch (error) {
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // ================================
    // DATA MIGRATION FROM JOOMLA
    // ================================

    // หน้าแสดง Migration Dashboard
    getMigrationDashboard: async (req, res) => {
        try {
            const joomlaStats = await JoomlaDB.getDbStats();
            const currentNewsCount = await News.getCount('all');
            const categories = await JoomlaDB.getAllCategories();

            res.render('admin/migration-dashboard', {
                title: 'Data Migration - Joomla to N-Pakkret',
                currentPage: 'migration',
                joomlaStats,
                currentNewsCount,
                categories
            });
        } catch (error) {
            console.error('Error loading migration dashboard:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูล Migration ได้');
        }
    },

    previewMigrationNewsFromJoomla: async (req, res) => {
        try {
            const {
                limit = 10,
                offset = 0,
                categoryName = 'ข่าวประชาสัมพันธ์ | News',
                destinationMenu = 'news'
            } = req.body;
            const numericLimit = parseInt(limit, 10) || 10;
            const numericOffset = parseInt(offset, 10) || 0;

            const joomlaArticles = await JoomlaDB.getAllArticles(null, 0, 1);
            const filteredArticles = categoryName
                ? joomlaArticles.filter(art => art.category_name === categoryName)
                : joomlaArticles;

            const articlesToPreview = filteredArticles.slice(numericOffset, numericOffset + numericLimit);
            const willAdd = [];
            const willSkip = [];

            for (const article of articlesToPreview) {
                const newsCategory = resolveDestinationCategory(destinationMenu, article.category_name);

                const postedDate = new Date(article.publish_up);
                const alreadyExists = await News.existsForMigration(
                    article.title,
                    postedDate,
                    newsCategory
                );

                const item = {
                    articleId: article.id,
                    title: article.title,
                    categoryName: newsCategory,
                    datePosted: postedDate,
                    joomlaCategory: article.category_name || '',
                    destinationMenu
                };

                if (alreadyExists) {
                    willSkip.push(item);
                } else {
                    willAdd.push(item);
                }
            }

            res.json({
                success: true,
                message: `Preview completed: will add ${willAdd.length}, will skip ${willSkip.length}`,
                statistics: {
                    totalChecked: articlesToPreview.length,
                    willAddCount: willAdd.length,
                    willSkipCount: willSkip.length,
                    destinationCategory: resolveDestinationCategory(destinationMenu, categoryName)
                },
                preview: {
                    willAdd,
                    willSkip
                }
            });
        } catch (error) {
            console.error('Migration preview error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ preview ข้อมูล',
                error: error.message
            });
        }
    },

    // Migrate ข่าวจาก Joomla (AJAX)
    migrateNewsFromJoomla: async (req, res) => {
        try {
            const {
                limit = 10,
                offset = 0,
                categoryName = 'ข่าวประชาสัมพันธ์ | News',
                destinationMenu = 'news',
                useAiSummary = true,
                retryExisting = false,
                articleIds = []
            } = req.body;
            const numericLimit = parseInt(limit, 10) || 10;
            const numericOffset = parseInt(offset, 10) || 0;
            const shouldRetryExisting = retryExisting === true || retryExisting === 'true';
            const selectedArticleIds = Array.isArray(articleIds)
                ? articleIds
                    .map((value) => parseInt(value, 10))
                    .filter((value) => Number.isInteger(value) && value > 0)
                : [];

            // 1. ดึงข่าวจาก Joomla DB
            const joomlaArticles = await JoomlaDB.getAllArticles(null, 0, 1);

            // กรองเฉพาะหมวดที่ต้องการ
            const filteredArticles = categoryName 
                ? joomlaArticles.filter(art => art.category_name === categoryName)
                : joomlaArticles;

            const scopedArticles = selectedArticleIds.length > 0
                ? filteredArticles.filter((art) => selectedArticleIds.includes(art.id))
                : filteredArticles.slice(numericOffset, numericOffset + numericLimit);

            const articlesToMigrate = scopedArticles;

            // 2. แปลงและบันทึกเข้า pkc_nodeweb_db
            let successCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            let updatedCount = 0;
            const errors = [];
            const allCopiedImages = [];
            const allImageErrors = [];
            const allCopiedAttachments = [];
            const allAttachmentErrors = [];

            for (const article of articlesToMigrate) {
                try {
                    // แปลง Joomla images JSON
                    let imageUrl = null;
                    if (article.images) {
                        try {
                            const imagesData = JSON.parse(article.images);
                            imageUrl = imagesData.image_intro || imagesData.image_fulltext || null;
                        } catch (e) {
                            // ถ้า parse ไม่ได้ ให้เป็น null
                        }
                    }

                    const newsCategory = resolveDestinationCategory(destinationMenu, article.category_name);

                    // สร้างข่าวใหม่ - รวม introtext และ fulltext
                    const rawDescription = `${article.introtext || ''}\n\n${article.fulltext || ''}`.trim();
                    const postedDate = new Date(article.publish_up);
                    const existingBySource = await News.getByMigrationSource(article.id);

                    // ป้องกันการ Migration ซ้ำ (title + date_posted + category)
                    const alreadyExists = existingBySource || await News.existsForMigration(
                        article.title,
                        postedDate,
                        newsCategory
                    );

                    if (alreadyExists && !shouldRetryExisting) {
                        skippedCount++;
                        continue;
                    }

                    // 🖼️ คัดลอกรูปภาพจาก Joomla และแก้ไข path พร้อมเปลี่ยนชื่อเป็น timestamp
                    const imageCopyResult = await copyImagesFromJoomla(rawDescription, postedDate);
                    const summaryDescription = generateMigrationSummaryDescription({
                        title: article.title,
                        introtext: article.introtext,
                        fulltext: article.fulltext,
                        publishUp: article.publish_up
                    });
                    const finalDescription = useAiSummary === false || useAiSummary === 'false'
                        ? imageCopyResult.updatedContent
                        : summaryDescription;

                    // 🖼️ คัดลอก Thumbnail หัวข้อข่าว จาก Joomla ไปยัง destination
                    let finalImageUrl = null;
                    if (imageUrl) {
                        finalImageUrl = await copyThumbnailFromJoomla(imageUrl, postedDate);
                    }

                    // 📎 ดึงและคัดลอกไฟล์แนบ (PDF, JPG, PNG) จาก HTML content
                    const attachmentResult = await extractAndCopyAttachmentsFromJoomla(rawDescription, postedDate, {
                        destinationMenu: 'budgettransfer'
                    });
                    let finalAttachmentUrl = attachmentResult.attachmentUrl || null;

                    // 🔄 ลำดับความสำคัญ attachment:
                    // 1️⃣ PDF/JPG link จาก <a href> tags
                    // 2️⃣ รูปที่ 2+ จากคอนเทนต์ (inline images) - ไม่ใช่รูปที่ 1 (thumbnail)
                    // 3️⃣ Fallback: ใช้ thumbnail เท่านั้น
                    if (!finalAttachmentUrl && imageCopyResult.copiedImages && imageCopyResult.copiedImages.length > 1) {
                        // ถ้ามีรูปที่ 2+ ให้ใช้รูปสุดท้าย (ไม่ใช่อันแรก/thumbnail)
                        finalAttachmentUrl = imageCopyResult.copiedImages[imageCopyResult.copiedImages.length - 1].copied;
                    } else if (!finalAttachmentUrl && finalImageUrl) {
                        // Fallback สุดท้าย: ใช้ thumbnail
                        finalAttachmentUrl = finalImageUrl;
                    }

                    // เก็บสถิติการคัดลอกรูป
                    if (imageCopyResult.copiedImages.length > 0) {
                        allCopiedImages.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            images: imageCopyResult.copiedImages
                        });
                    }
                    if (imageCopyResult.errors.length > 0) {
                        allImageErrors.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            errors: imageCopyResult.errors
                        });
                    }

                    // เก็บสถิติการคัดลอกไฟล์แนบ
                    if (attachmentResult.copiedAttachments.length > 0) {
                        allCopiedAttachments.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            attachments: attachmentResult.copiedAttachments
                        });
                    }
                    if (attachmentResult.errors.length > 0) {
                        allAttachmentErrors.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            errors: attachmentResult.errors
                        });
                    }
                    
                    if (existingBySource && shouldRetryExisting) {
                        await News.updateMigratedFields(
                            existingBySource.id,
                            finalDescription,
                            finalImageUrl || existingBySource.image_url,
                            finalAttachmentUrl || existingBySource.attachment_url
                        );
                        updatedCount++;
                    } else {
                        await News.create(
                            article.title,
                            finalDescription, // ใช้ content ที่แก้ไข path แล้ว
                            finalImageUrl,    // ใช้ image URL ที่ชี้ไปยัง destination
                            finalAttachmentUrl, // ไฟล์แนบสำหรับปุ่ม "อ่านรายละเอียด"
                            newsCategory,
                            postedDate,
                            1, // is_published
                            `joomla:${article.id}`
                        );

                        successCount++;
                    }
                } catch (err) {
                    errorCount++;
                    errors.push({
                        articleId: article.id,
                        title: article.title,
                        error: err.message
                    });
                    console.error(`Error migrating article ${article.id}:`, err);
                }
            }

            // คำนวณสถิติรูปภาพและไฟล์แนบ
            const totalImagesCopied = allCopiedImages.reduce((sum, item) => sum + item.images.length, 0);
            const totalImageErrors = allImageErrors.reduce((sum, item) => sum + item.errors.length, 0);
            const totalAttachmentsCopied = allCopiedAttachments.reduce((sum, item) => sum + item.attachments.length, 0);
            const totalAttachmentErrors = allAttachmentErrors.reduce((sum, item) => sum + item.errors.length, 0);

            res.json({
                success: true,
                message: `Migration completed: ${successCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors | Images: ${totalImagesCopied} copied, ${totalImageErrors} errors | Attachments: ${totalAttachmentsCopied} copied, ${totalAttachmentErrors} errors`,
                statistics: {
                    totalProcessed: articlesToMigrate.length,
                    successCount,
                    updatedCount,
                    skippedCount,
                    errorCount,
                    errors,
                    destinationMenu,
                    destinationCategory: resolveDestinationCategory(destinationMenu, categoryName),
                    imagesCopied: totalImagesCopied,
                    imageErrors: totalImageErrors,
                    attachmentsCopied: totalAttachmentsCopied,
                    attachmentErrors: totalAttachmentErrors,
                    retryExisting: shouldRetryExisting,
                    selectedArticleIds
                },
                imageDetails: {
                    copiedImages: allCopiedImages,
                    imageErrors: allImageErrors
                },
                attachmentDetails: {
                    copiedAttachments: allCopiedAttachments,
                    attachmentErrors: allAttachmentErrors
                }
            });

        } catch (error) {
            console.error('Migration error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ migrate ข้อมูล',
                error: error.message
            });
        }
    },

    // ตรวจสอบสถานะ Joomla DB (AJAX)
    checkJoomlaConnection: async (req, res) => {
        try {
            const connectionTest = await JoomlaDB.testConnection();
            const stats = await JoomlaDB.getDbStats();

            res.json({
                success: true,
                connection: connectionTest,
                statistics: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'ไม่สามารถเชื่อมต่อ Joomla DB ได้',
                error: error.message
            });
        }
    },

    // ========================================
    // ACTIVITIES / ข่าวกิจกรรม
    // ========================================

    // ดึงรายการข่าวกิจกรรมจาก Joomla (Category ID: 19)
    getActivitiesList: async (req, res) => {
        try {
            // ดึงค่า limit จาก query parameter (default: 30)
            let limitParam = req.query.limit || '30';
            const searchQuery = (req.query.q || '').trim();
            let limit = null;
            
            // แปลงค่า limit
            if (limitParam === 'all') {
                limit = null; // ไม่มี limit
            } else {
                limit = parseInt(limitParam, 10) || 30;
            }
            
            const activities = await Activity.getAll(limit, 0, searchQuery);
            const homepageActivities = await Activity.getHomepageActivities(6); // ดึงข่าวที่แสดงในหน้า Home
            const totalCount = await Activity.getCount('all');
            const filteredCount = await Activity.countByTitle(searchQuery);
            const publishedCount = await Activity.getCount('published');
            const draftCount = await Activity.getCount('draft');
            const featuredCount = await Activity.getCount('featured');

            const activitiesForView = activities.map((item) => ({
                ...item,
                image_preview_url: normalizeImageUrlForDisplay(item.image_url)
            }));
            
            res.render('admin/activities-list', { 
                title: 'จัดการข่าวกิจกรรม',
                currentPage: 'activities',
                activitiesList: activitiesForView,
                homepageActivities: homepageActivities, // ส่งข่าวหน้า Home ไปแสดงด้วย
                searchQuery,
                currentLimit: limitParam === 'all' ? 'all' : parseInt(limitParam, 10) || 30,
                statistics: {
                    total: totalCount,
                    filteredTotal: filteredCount,
                    published: publishedCount,
                    draft: draftCount,
                    featured: featuredCount
                }
            });
        } catch (error) {
            console.error('Error fetching activities:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูลข่าวกิจกรรมได้');
        }
    },

    // ดึงข้อมูลข่าวกิจกรรม 1 รายการ
    getActivityDetail: async (req, res) => {
        try {
            const { id } = req.params;
            const article = await JoomlaDB.getArticleById(id);

            if (!article) {
                return res.status(404).render('admin/admin-panel', {
                    title: 'Not Found',
                    currentPage: 'activities',
                    error: 'ไม่พบข่าวกิจกรรมที่ต้องการ'
                });
            }

            // ทำความสะอาด image URLs
            const activity = {
                ...article,
                display_image: normalizeImageUrlForDisplay(article.images),
                clean_images: cleanImageUrl(article.images)
            };

            res.render('admin/activity-view', {
                title: 'ดูรายละเอียดข่าวกิจกรรม',
                currentPage: 'activities',
                activity
            });
        } catch (error) {
            console.error('Error fetching activity detail:', error);
            res.status(500).render('admin/admin-panel', {
                title: 'Error',
                currentPage: 'activities',
                error: 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + error.message
            });
        }
    },

    // ========================================
    // ACTIVITIES CRUD
    // ========================================

    // หน้าเพิ่มข่าวกิจกรรมใหม่
    getActivityAddForm: async (req, res) => {
        try {
            res.render('admin/activities-add', { 
                title: 'เพิ่มข่าวกิจกรรมใหม่',
                currentPage: 'activities',
                errorMessage: '',
                formData: {}
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    // บันทึกข่าวกิจกรรมใหม่
    createActivity: async (req, res) => {
        try {
            const { title, description, date_posted, is_published } = req.body;
            const imageUrl = req.uploadedImage || '';
            const attachmentUrl = req.uploadedAttachment || '';

            if (!title) {
                return res.status(400).render('admin/activities-add', {
                    title: 'เพิ่มข่าวกิจกรรมใหม่',
                    currentPage: 'activities',
                    errorMessage: 'กรุณากรอกหัวข้อข่าวกิจกรรม',
                    formData: req.body
                });
            }

            const createdBy = 'Admin';
            const activityDate = date_posted || new Date();
            
            await Activity.create(
                title,
                description || '',
                imageUrl,
                attachmentUrl,
                activityDate,
                is_published ? 1 : 0,
                createdBy,
                'ข่าวกิจกรรม'
            );

            res.redirect('/admin/activities');
        } catch (error) {
            console.error('Error creating activity:', error);
            res.status(500).render('admin/activities-add', {
                title: 'เพิ่มข่าวกิจกรรมใหม่',
                currentPage: 'activities',
                errorMessage: 'เกิดข้อผิดพลาดในการบันทึกข่าวกิจกรรม',
                formData: req.body
            });
        }
    },

    // หน้าแก้ไขข่าวกิจกรรม
    getActivityEditForm: async (req, res) => {
        try {
            const id = req.params.id;
            const activity = await Activity.getById(id);
            
            if (!activity) {
                return res.status(404).send('ไม่พบข่าวกิจกรรมนี้');
            }

            const activityForView = {
                ...activity,
                image_preview_url: normalizeImageUrlForDisplay(activity.image_url)
            };
            
            res.render('admin/activities-edit', { 
                title: 'แก้ไขข่าวกิจกรรม',
                currentPage: 'activities',
                errorMessage: '',
                activity: activityForView
            });
        } catch (error) {
            console.error('Error fetching activity:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูลข่าวกิจกรรมได้');
        }
    },

    // อัพเดทข่าวกิจกรรม
    updateActivity: async (req, res) => {
        try {
            const id = req.params.id;
            const { title, description, date_posted, is_published, is_featured } = req.body;
            
            const existingActivity = await Activity.getById(id);
            if (!existingActivity) {
                return res.status(404).send('ไม่พบข่าวกิจกรรมนี้');
            }

            if (!title) {
                return res.status(400).render('admin/activities-edit', {
                    title: 'แก้ไขข่าวกิจกรรม',
                    currentPage: 'activities',
                    errorMessage: 'กรุณากรอกหัวข้อข่าวกิจกรรม',
                    activity: { ...existingActivity, ...req.body }
                });
            }

            const imageUrl = req.uploadedImage || existingActivity.image_url;
            const attachmentUrl = req.uploadedAttachment || existingActivity.attachment_url || '';
            const activityDate = date_posted || existingActivity.date_posted;

            await Activity.update(
                id,
                title,
                description || '',
                imageUrl,
                attachmentUrl,
                activityDate,
                is_published ? 1 : 0,
                is_featured ? 1 : 0,
                'ข่าวกิจกรรม'
            );

            res.redirect('/admin/activities');
        } catch (error) {
            console.error('Error updating activity:', error);
            const id = req.params.id;
            const existingActivity = await Activity.getById(id);
            res.status(500).render('admin/activities-edit', {
                title: 'แก้ไขข่าวกิจกรรม',
                currentPage: 'activities',
                errorMessage: 'เกิดข้อผิดพลาดในการอัพเดทข่าวกิจกรรม',
                activity: existingActivity
            });
        }
    },

    // ลบข่าวกิจกรรม
    deleteActivity: async (req, res) => {
        try {
            const id = req.params.id;
            const activity = await Activity.getById(id);
            
            if (!activity) {
                return res.status(404).send('ไม่พบข่าวกิจกรรมนี้');
            }

            // ลบไฟล์รูปภาพเฉพาะปลายทางเท่านั้น (/public/uploads/news)
            if (activity.image_url) {
                const destinationImagePath = resolveDestinationNewsImagePath(activity.image_url);
                if (destinationImagePath) {
                    try {
                        await fs.unlink(destinationImagePath);
                        console.log(`Deleted destination image: ${destinationImagePath}`);
                    } catch (fileError) {
                        console.warn(`Warning: Could not delete destination image for activity ${id}:`, fileError);
                    }
                }
            }

            await Activity.delete(id);
            res.redirect('/admin/activities');
        } catch (error) {
            console.error('Error deleting activity:', error);
            res.status(500).send('ไม่สามารถลบข่าวกิจกรรมได้');
        }
    },

    // ลบข่าวกิจกรรมหลายรายการ (AJAX)
    deleteActivitiesMultiple: async (req, res) => {
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ต้องระบุ ID ของข่าวกิจกรรมที่ต้องการลบ'
                });
            }

            let deletedCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const id of ids) {
                try {
                    const activity = await Activity.getById(id);
                    if (!activity) {
                        errorCount++;
                        errors.push({ id, error: 'ไม่พบข่าวกิจกรรมนี้' });
                        continue;
                    }

                    // ลบไฟล์รูปภาพเฉพาะปลายทางเท่านั้น
                    if (activity.image_url) {
                        const destinationImagePath = resolveDestinationNewsImagePath(activity.image_url);
                        if (destinationImagePath) {
                            try {
                                await fs.unlink(destinationImagePath);
                                console.log(`Deleted destination image: ${destinationImagePath}`);
                            } catch (fileError) {
                                console.warn(`Warning: Could not delete destination image for activity ${id}:`, fileError);
                            }
                        }
                    }

                    await Activity.delete(id);
                    deletedCount++;
                } catch (err) {
                    errorCount++;
                    errors.push({ id, error: err.message });
                    console.error(`Error deleting activity ${id}:`, err);
                }
            }

            res.json({
                success: true,
                message: `ลบสำเร็จ ${deletedCount} รายการ${errorCount > 0 ? `, ล้มเหลว ${errorCount} รายการ` : ''}`,
                deletedCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error) {
            console.error('Error in deleteActivitiesMultiple:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลบข่าวกิจกรรม',
                error: error.message
            });
        }
    },

    // เปลี่ยนสถานะเผยแพร่
    toggleActivityPublish: async (req, res) => {
        try {
            const id = req.params.id;
            await Activity.togglePublish(id);
            res.redirect('/admin/activities');
        } catch (error) {
            console.error('Error toggling publish status:', error);
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // เปลี่ยนสถานะข่าวกิจกรรมเด่น
    toggleActivityFeatured: async (req, res) => {
        try {
            const id = req.params.id;
            await Activity.toggleFeatured(id);
            res.redirect('/admin/activities');
        } catch (error) {
            console.error('Error toggling featured status:', error);
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // ========================================
    // ACTIVITIES MIGRATION
    // ========================================

    // Preview: ดึงข่าวกิจกรรมจาก Joomla ก่อน migrate
    previewMigrationActivitiesFromJoomla: async (req, res) => {
        try {
            const {
                limit = 10,
                offset = 0,
                categoryName = 'ข่าวกิจกรรม | Activity'
            } = req.body;
            const destinationMenu = 'activities';
            const numericLimit = parseInt(limit, 10) || 10;
            const numericOffset = parseInt(offset, 10) || 0;

            const joomlaArticles = await JoomlaDB.getAllArticles(null, 0, 1);
            const filteredArticles = categoryName
                ? joomlaArticles.filter(art => art.category_name === categoryName)
                : joomlaArticles;

            const articlesToPreview = filteredArticles.slice(numericOffset, numericOffset + numericLimit);
            const willAdd = [];
            const willSkip = [];

            for (const article of articlesToPreview) {
                const newsCategory = resolveDestinationCategory(destinationMenu, article.category_name);

                const postedDate = new Date(article.publish_up);
                // Use Activity model instead of News model for activities
                const alreadyExists = await Activity.existsForMigration(
                    article.title,
                    postedDate
                );

                const item = {
                    articleId: article.id,
                    title: article.title,
                    categoryName: newsCategory,
                    datePosted: postedDate,
                    joomlaCategory: article.category_name || '',
                    destinationMenu
                };

                if (alreadyExists) {
                    willSkip.push(item);
                } else {
                    willAdd.push(item);
                }
            }

            res.json({
                success: true,
                message: `Preview completed: will add ${willAdd.length}, will skip ${willSkip.length}`,
                statistics: {
                    totalChecked: articlesToPreview.length,
                    willAddCount: willAdd.length,
                    willSkipCount: willSkip.length,
                    destinationCategory: resolveDestinationCategory(destinationMenu, categoryName)
                },
                preview: {
                    willAdd,
                    willSkip
                }
            });
        } catch (error) {
            console.error('Migration preview error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ preview ข้อมูล',
                error: error.message
            });
        }
    },

    // Migrate: ย้ายข่าวกิจกรรมจาก Joomla มาระบบใหม่
    migrateActivitiesFromJoomla: async (req, res) => {
        try {
            const {
                limit = 10,
                offset = 0,
                categoryName = 'ข่าวกิจกรรม | Activity',
                useAiSummary = true,
                retryExisting = false,
                articleIds = []
            } = req.body;
            const destinationMenu = 'activities';
            const numericLimit = parseInt(limit, 10) || 10;
            const numericOffset = parseInt(offset, 10) || 0;
            const shouldRetryExisting = retryExisting === true || retryExisting === 'true';
            const selectedArticleIds = Array.isArray(articleIds)
                ? articleIds
                    .map((value) => parseInt(value, 10))
                    .filter((value) => Number.isInteger(value) && value > 0)
                : [];

            // 1. ดึงข่าวจาก Joomla DB
            const joomlaArticles = await JoomlaDB.getAllArticles(null, 0, 1);
            const filteredArticles = categoryName
                ? joomlaArticles.filter(art => art.category_name === categoryName)
                : joomlaArticles;
            const articlesToMigrate = selectedArticleIds.length > 0
                ? filteredArticles.filter(art => selectedArticleIds.includes(art.id))
                : filteredArticles.slice(numericOffset, numericOffset + numericLimit);

            const successCount = { value: 0 };
            const updatedCount = { value: 0 };
            const skippedCount = { value: 0 };
            const errorCount = { value: 0 };
            const errors = [];
            const allCopiedImages = [];
            const allImageErrors = [];
            const allCopiedAttachments = [];
            const allAttachmentErrors = [];

            // 2. Migrate แบบ batch (หลายรายการพร้อมกัน)
            const BATCH_SIZE = 5;
            const totalBatches = Math.ceil(articlesToMigrate.length / BATCH_SIZE);

            for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
                const batchStart = batchIdx * BATCH_SIZE;
                const batchEnd = Math.min(batchStart + BATCH_SIZE, articlesToMigrate.length);
                const batchArticles = articlesToMigrate.slice(batchStart, batchEnd);

                const batchPromises = batchArticles.map(async (article) => {
                    try {
                        const newsCategory = resolveDestinationCategory(destinationMenu, article.category_name);
                        const postedDate = new Date(article.publish_up);

                        const existingBySource = await Activity.getByMigrationSource(article.id);
                        const alreadyExists = await Activity.existsForMigration(
                            article.title,
                            postedDate
                        );

                        if (alreadyExists && !shouldRetryExisting) {
                            skippedCount.value++;
                            return;
                        }

                        // 🖼️ คัดลอกรูปภาพจาก Joomla และแก้ไข path พร้อมเปลี่ยนชื่อเป็น timestamp
                        const rawDescription = article.fulltext || article.introtext || '';
                        const imageCopyResult = await copyImagesFromJoomla(rawDescription, postedDate);
                        const finalDescription = imageCopyResult.updatedContent || '';
                        let finalImageUrl = null;
                        
                        // ✨ ใช้ copyThumbnailFromJoomlaForActivities สำหรับ activities แทน copyThumbnailFromJoomla
                        // Extract image path from JSON object if article.images is an object or string
                        if (article.images) {
                            let imageUrlToProcess = article.images;
                            
                            // Handle JSON object format from Joomla (with image_intro, image_fulltext, etc.)
                            if (typeof article.images === 'object' && article.images !== null) {
                                if (article.images.image_intro) {
                                    imageUrlToProcess = article.images.image_intro;
                                }
                            } else if (typeof article.images === 'string') {
                                // If it's a string JSON, parse it
                                try {
                                    const parsed = JSON.parse(article.images);
                                    if (parsed.image_intro) {
                                        imageUrlToProcess = parsed.image_intro;
                                    }
                                } catch (e) {
                                    // If parsing fails, use the raw string
                                }
                            }
                            
                            finalImageUrl = await copyThumbnailFromJoomlaForActivities(imageUrlToProcess, postedDate);
                        }

                        const attachmentResult = await extractAndCopyAttachmentsFromJoomla(rawDescription, postedDate, {
                            destinationMenu: 'activities',
                            includeImageSrcFallback: true
                        });
                        let finalAttachmentUrl = attachmentResult.attachmentUrl || null;

                        if (!finalAttachmentUrl && imageCopyResult.copiedImages && imageCopyResult.copiedImages.length > 1) {
                            finalAttachmentUrl = imageCopyResult.copiedImages[imageCopyResult.copiedImages.length - 1].copied;
                        }

                        if (imageCopyResult.copiedImages.length > 0) {
                            allCopiedImages.push({
                                articleId: article.id,
                                articleTitle: article.title,
                                images: imageCopyResult.copiedImages
                            });
                        }
                        if (imageCopyResult.errors.length > 0) {
                            allImageErrors.push({
                                articleId: article.id,
                                articleTitle: article.title,
                                errors: imageCopyResult.errors
                            });
                        }

                        if (attachmentResult.copiedAttachments.length > 0) {
                            allCopiedAttachments.push({
                                articleId: article.id,
                                articleTitle: article.title,
                                attachments: attachmentResult.copiedAttachments
                            });
                        }
                        if (attachmentResult.errors.length > 0) {
                            allAttachmentErrors.push({
                                articleId: article.id,
                                articleTitle: article.title,
                                errors: attachmentResult.errors
                            });
                        }

                        if (existingBySource && shouldRetryExisting) {
                            await Activity.updateMigratedFields(
                                existingBySource.id,
                                finalDescription,
                                finalImageUrl || existingBySource.image_url,
                                finalAttachmentUrl || existingBySource.attachment_url
                            );
                            updatedCount.value++;
                        } else {
                            await Activity.create(
                                article.title,
                                finalDescription,
                                finalImageUrl,
                                finalAttachmentUrl,
                                postedDate,
                                1, // is_published
                                `joomla:${article.id}`
                            );

                            successCount.value++;
                        }
                    } catch (err) {
                        errorCount.value++;
                        errors.push({
                            articleId: article.id,
                            title: article.title,
                            error: err.message
                        });
                        console.error(`Error migrating article ${article.id}:`, err);
                    }
                });

                await Promise.all(batchPromises);
            }

            const totalImagesCopied = allCopiedImages.reduce((sum, item) => sum + item.images.length, 0);
            const totalImageErrors = allImageErrors.reduce((sum, item) => sum + item.errors.length, 0);
            const totalAttachmentsCopied = allCopiedAttachments.reduce((sum, item) => sum + item.attachments.length, 0);
            const totalAttachmentErrors = allAttachmentErrors.reduce((sum, item) => sum + item.errors.length, 0);

            res.json({
                success: true,
                message: `Migration completed: ${successCount.value} created, ${updatedCount.value} updated, ${skippedCount.value} skipped, ${errorCount.value} errors | Images: ${totalImagesCopied} copied, ${totalImageErrors} errors | Attachments: ${totalAttachmentsCopied} copied, ${totalAttachmentErrors} errors`,
                statistics: {
                    totalProcessed: articlesToMigrate.length,
                    successCount: successCount.value,
                    updatedCount: updatedCount.value,
                    skippedCount: skippedCount.value,
                    errorCount: errorCount.value,
                    errors,
                    destinationMenu,
                    destinationCategory: resolveDestinationCategory(destinationMenu, categoryName),
                    imagesCopied: totalImagesCopied,
                    imageErrors: totalImageErrors,
                    attachmentsCopied: totalAttachmentsCopied,
                    attachmentErrors: totalAttachmentErrors,
                    retryExisting: shouldRetryExisting,
                    selectedArticleIds
                },
                imageDetails: {
                    copiedImages: allCopiedImages,
                    imageErrors: allImageErrors
                },
                attachmentDetails: {
                    copiedAttachments: allCopiedAttachments,
                    attachmentErrors: allAttachmentErrors
                }
            });

        } catch (error) {
            console.error('Migration error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ migrate ข้อมูล',
                error: error.message
            });
        }
    },

    // ========== Budget Transfer Migration ==========
    // Preview Migration สำหรับ Budget Transfer
    previewMigrationBudgetTransferFromJoomla: async (req, res) => {
        try {
            const {
                limit = 10,
                offset = 0,
                categoryName = 'การโอนงบประมาณรายจ่ายประจำปี | New',
                destinationMenu = 'budgettransfer'
            } = req.body;
            const numericLimit = parseInt(limit, 10) || 10;
            const numericOffset = parseInt(offset, 10) || 0;

            const joomlaArticles = await JoomlaDB.getAllArticles(null, 0, 1);
            const filteredArticles = categoryName
                ? joomlaArticles.filter(art => art.category_name === categoryName)
                : joomlaArticles;

            const articlesToPreview = filteredArticles.slice(numericOffset, numericOffset + numericLimit);
            const willAdd = [];
            const willSkip = [];

            for (const article of articlesToPreview) {
                const categoryForDb = resolveDestinationCategory(destinationMenu, article.category_name);

                const postedDate = new Date(article.publish_up);
                const alreadyExists = await BudgetTransfer.existsForMigration(
                    article.title,
                    postedDate,
                    categoryForDb
                );

                const item = {
                    articleId: article.id,
                    title: article.title,
                    categoryName: categoryForDb,
                    datePosted: postedDate,
                    joomlaCategory: article.category_name || '',
                    destinationMenu
                };

                if (alreadyExists) {
                    willSkip.push(item);
                } else {
                    willAdd.push(item);
                }
            }

            res.json({
                success: true,
                message: `Preview completed: will add ${willAdd.length}, will skip ${willSkip.length}`,
                statistics: {
                    totalChecked: articlesToPreview.length,
                    willAddCount: willAdd.length,
                    willSkipCount: willSkip.length,
                    destinationCategory: resolveDestinationCategory(destinationMenu, categoryName)
                },
                preview: {
                    willAdd,
                    willSkip
                }
            });
        } catch (error) {
            console.error('Migration preview error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ preview ข้อมูล',
                error: error.message
            });
        }
    },

    // Migrate Budget Transfer จาก Joomla
    migrateBudgetTransferFromJoomla: async (req, res) => {
        try {
            const {
                limit = 10,
                offset = 0,
                categoryName = 'การโอนงบประมาณรายจ่ายประจำปี | New',
                destinationMenu = 'budgettransfer',
                useAiSummary = true,
                retryExisting = false,
                articleIds = []
            } = req.body;
            const numericLimit = parseInt(limit, 10) || 10;
            const numericOffset = parseInt(offset, 10) || 0;
            const shouldRetryExisting = retryExisting === true || retryExisting === 'true';
            const selectedArticleIds = Array.isArray(articleIds)
                ? articleIds
                    .map((value) => parseInt(value, 10))
                    .filter((value) => Number.isInteger(value) && value > 0)
                : [];

            // 1. ดึงข่าวจาก Joomla DB
            const joomlaArticles = await JoomlaDB.getAllArticles(null, 0, 1);

            // กรองเฉพาะหมวดที่ต้องการ
            const filteredArticles = categoryName 
                ? joomlaArticles.filter(art => art.category_name === categoryName)
                : joomlaArticles;

            const scopedArticles = selectedArticleIds.length > 0
                ? filteredArticles.filter((art) => selectedArticleIds.includes(art.id))
                : filteredArticles.slice(numericOffset, numericOffset + numericLimit);

            const articlesToMigrate = scopedArticles;

            // 2. แปลงและบันทึกเข้า pkc_nodeweb_db
            let successCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            let updatedCount = 0;
            const errors = [];
            const allCopiedImages = [];
            const allImageErrors = [];
            const allCopiedAttachments = [];
            const allAttachmentErrors = [];

            for (const article of articlesToMigrate) {
                try {
                    // แปลง Joomla images JSON
                    let imageUrl = null;
                    if (article.images) {
                        try {
                            const imagesData = JSON.parse(article.images);
                            imageUrl = imagesData.image_intro || imagesData.image_fulltext || null;
                        } catch (e) {
                            // ถ้า parse ไม่ได้ ให้เป็น null
                        }
                    }

                    const categoryForDb = resolveDestinationCategory(destinationMenu, article.category_name);

                    // สร้างข่าว - รวม introtext และ fulltext
                    const rawDescription = `${article.introtext || ''}\n\n${article.fulltext || ''}`.trim();
                    const postedDate = new Date(article.publish_up);
                    const existingBySource = await BudgetTransfer.getByMigrationSource(article.id);

                    // ป้องกันการ Migration ซ้ำ
                    const alreadyExists = existingBySource || await BudgetTransfer.existsForMigration(
                        article.title,
                        postedDate,
                        categoryForDb
                    );

                    if (alreadyExists && !shouldRetryExisting) {
                        skippedCount++;
                        continue;
                    }

                    // 🖼️ คัดลอกรูปภาพจาก Joomla
                    const imageCopyResult = await copyImagesFromJoomla(rawDescription, postedDate);
                    const summaryDescription = generateMigrationSummaryDescription({
                        title: article.title,
                        introtext: article.introtext,
                        fulltext: article.fulltext,
                        publishUp: article.publish_up
                    });
                    const finalDescription = useAiSummary === false || useAiSummary === 'false'
                        ? imageCopyResult.updatedContent
                        : summaryDescription;

                    // 🖼️ คัดลอก Thumbnail
                    let finalImageUrl = null;
                    if (imageUrl) {
                        finalImageUrl = await copyThumbnailFromJoomla(imageUrl, postedDate);
                    }

                    // 📎 ดึงและคัดลอกไฟล์แนบ
                    const attachmentResult = await extractAndCopyAttachmentsFromJoomla(rawDescription, postedDate, {
                        destinationMenu: 'budgettransfer'
                    });
                    let finalAttachmentUrl = attachmentResult.attachmentUrl || null;

                    // ลำดับความสำคัญ attachment
                    if (!finalAttachmentUrl && imageCopyResult.copiedImages && imageCopyResult.copiedImages.length > 1) {
                        finalAttachmentUrl = imageCopyResult.copiedImages[imageCopyResult.copiedImages.length - 1].copied;
                    } else if (!finalAttachmentUrl && finalImageUrl) {
                        finalAttachmentUrl = finalImageUrl;
                    }

                    // เก็บสถิติการคัดลอก
                    if (imageCopyResult.copiedImages.length > 0) {
                        allCopiedImages.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            images: imageCopyResult.copiedImages
                        });
                    }
                    if (imageCopyResult.errors.length > 0) {
                        allImageErrors.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            errors: imageCopyResult.errors
                        });
                    }

                    if (attachmentResult.copiedAttachments.length > 0) {
                        allCopiedAttachments.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            attachments: attachmentResult.copiedAttachments
                        });
                    }
                    if (attachmentResult.errors.length > 0) {
                        allAttachmentErrors.push({
                            articleId: article.id,
                            articleTitle: article.title,
                            errors: attachmentResult.errors
                        });
                    }
                    
                    if (existingBySource && shouldRetryExisting) {
                        await BudgetTransfer.updateMigratedFields(
                            existingBySource.id,
                            finalDescription,
                            finalImageUrl || existingBySource.image_url,
                            finalAttachmentUrl || existingBySource.attachment_url
                        );
                        updatedCount++;
                    } else {
                        await BudgetTransfer.create(
                            article.title,
                            finalDescription,
                            finalImageUrl,
                            finalAttachmentUrl,
                            categoryForDb,
                            postedDate,
                            1, // is_published
                            `joomla:${article.id}`
                        );

                        successCount++;
                    }
                } catch (err) {
                    errorCount++;
                    errors.push({
                        articleId: article.id,
                        title: article.title,
                        error: err.message
                    });
                    console.error(`Error migrating article ${article.id}:`, err);
                }
            }

            const totalImagesCopied = allCopiedImages.reduce((sum, item) => sum + item.images.length, 0);
            const totalImageErrors = allImageErrors.reduce((sum, item) => sum + item.errors.length, 0);
            const totalAttachmentsCopied = allCopiedAttachments.reduce((sum, item) => sum + item.attachments.length, 0);
            const totalAttachmentErrors = allAttachmentErrors.reduce((sum, item) => sum + item.errors.length, 0);

            res.json({
                success: true,
                message: `Migration completed: ${successCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors | Images: ${totalImagesCopied} copied, ${totalImageErrors} errors | Attachments: ${totalAttachmentsCopied} copied, ${totalAttachmentErrors} errors`,
                statistics: {
                    totalProcessed: articlesToMigrate.length,
                    successCount,
                    updatedCount,
                    skippedCount,
                    errorCount,
                    errors,
                    destinationMenu,
                    destinationCategory: resolveDestinationCategory(destinationMenu, categoryName),
                    imagesCopied: totalImagesCopied,
                    imageErrors: totalImageErrors,
                    attachmentsCopied: totalAttachmentsCopied,
                    attachmentErrors: totalAttachmentErrors
                },
                imageDetails: {
                    copiedImages: allCopiedImages,
                    imageErrors: allImageErrors
                },
                attachmentDetails: {
                    copiedAttachments: allCopiedAttachments,
                    attachmentErrors: allAttachmentErrors
                }
            });

        } catch (error) {
            console.error('Migration error:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการ migrate ข้อมูล',
                error: error.message
            });
        }
    },

    // ========================================
    // BUDGET TRANSFER CRUD
    // ========================================

    // ดึงรายการโอนงบประมาณทั้งหมด
    getBudgetTransferList: async (req, res) => {
        try {
            let limitParam = req.query.limit || '30';
            const searchQuery = (req.query.q || '').trim();
            let limit = null;
            
            if (limitParam === 'all') {
                limit = null;
            } else {
                limit = parseInt(limitParam, 10) || 30;
            }
            
            const budgetTransfers = await BudgetTransfer.getAll(limit, 0, searchQuery);
            const totalCount = await BudgetTransfer.getCount('all');
            const filteredCount = await BudgetTransfer.countByTitle(searchQuery);
            const publishedCount = await BudgetTransfer.getCount('published');
            const draftCount = await BudgetTransfer.getCount('draft');
            const featuredCount = await BudgetTransfer.getCount('featured');

            const budgetTransfersForView = budgetTransfers.map((item) => ({
                ...item,
                image_preview_url: normalizeImageUrlForDisplay(item.image_url)
            }));
            
            res.render('admin/budgettransfer-list', { 
                title: 'จัดการการโอนงบประมาณรายจ่าย',
                currentPage: 'budgettransfer',
                budgetTransferList: budgetTransfersForView,
                searchQuery,
                currentLimit: limitParam === 'all' ? 'all' : parseInt(limitParam, 10) || 30,
                statistics: {
                    total: totalCount,
                    filteredTotal: filteredCount,
                    published: publishedCount,
                    draft: draftCount,
                    featured: featuredCount
                }
            });
        } catch (error) {
            console.error('Error fetching budget transfers:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูลการโอนงบประมาณได้');
        }
    },

    // หน้าเพิ่มการโอนงบประมาณใหม่
    getBudgetTransferAddForm: async (req, res) => {
        try {
            res.render('admin/budgettransfer-add', { 
                title: 'เพิ่มการโอนงบประมาณรายจ่ายใหม่',
                currentPage: 'budgettransfer',
                errorMessage: '',
                formData: {}
            });
        } catch (error) {
            res.status(500).send('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    // บันทึกการโอนงบประมาณใหม่
    createBudgetTransfer: async (req, res) => {
        try {
            const { title, reference_number, category, description, date_posted, is_published, is_featured } = req.body;
            const imageUrl = req.uploadedImage || '';
            const attachmentUrl = req.uploadedAttachment || '';

            if (!title) {
                return res.status(400).render('admin/budgettransfer-add', {
                    title: 'เพิ่มการโอนงบประมาณรายจ่ายใหม่',
                    currentPage: 'budgettransfer',
                    errorMessage: 'กรุณากรอกหัวข้อ/ชื่อรายการ',
                    formData: req.body
                });
            }

            const createdBy = 'Admin';
            const transferDate = date_posted || new Date();
            
            await BudgetTransfer.create(
                title,
                description || '',
                imageUrl,
                attachmentUrl,
                category || '',
                transferDate,
                is_published ? 1 : 0,
                createdBy,
                reference_number || ''
            );

            res.redirect('/admin/budgettransfer');
        } catch (error) {
            console.error('Error creating budget transfer:', error);
            res.status(500).render('admin/budgettransfer-add', {
                title: 'เพิ่มการโอนงบประมาณรายจ่ายใหม่',
                currentPage: 'budgettransfer',
                errorMessage: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                formData: req.body
            });
        }
    },

    // หน้าแก้ไขการโอนงบประมาณ
    getBudgetTransferEditForm: async (req, res) => {
        try {
            const id = req.params.id;
            const budgetTransfer = await BudgetTransfer.getById(id);
            
            if (!budgetTransfer) {
                return res.status(404).send('ไม่พบข้อมูลการโอนงบประมาณนี้');
            }

            const budgetTransferForView = {
                ...budgetTransfer,
                image_preview_url: normalizeImageUrlForDisplay(budgetTransfer.image_url)
            };
            
            res.render('admin/budgettransfer-edit', { 
                title: 'แก้ไขการโอนงบประมาณรายจ่าย',
                currentPage: 'budgettransfer',
                errorMessage: '',
                budgetTransfer: budgetTransferForView
            });
        } catch (error) {
            console.error('Error fetching budget transfer:', error);
            res.status(500).send('ไม่สามารถโหลดข้อมูลได้');
        }
    },

    // อัพเดทการโอนงบประมาณ
    updateBudgetTransfer: async (req, res) => {
        try {
            const id = req.params.id;
            const { title, reference_number, category, description, date_posted, is_published, is_featured } = req.body;
            
            const existingBudgetTransfer = await BudgetTransfer.getById(id);
            if (!existingBudgetTransfer) {
                return res.status(404).send('ไม่พบข้อมูลการโอนงบประมาณนี้');
            }

            if (!title) {
                return res.status(400).render('admin/budgettransfer-edit', {
                    title: 'แก้ไขการโอนงบประมาณรายจ่าย',
                    currentPage: 'budgettransfer',
                    errorMessage: 'กรุณากรอกหัวข้อ/ชื่อรายการ',
                    budgetTransfer: { ...existingBudgetTransfer, ...req.body }
                });
            }

            const imageUrl = req.uploadedImage || existingBudgetTransfer.image_url;
            const attachmentUrl = req.uploadedAttachment || existingBudgetTransfer.attachment_url || '';
            const transferDate = date_posted || existingBudgetTransfer.date_posted;

            await BudgetTransfer.update(
                id,
                title,
                description || '',
                imageUrl,
                attachmentUrl,
                category || '',
                transferDate,
                is_published ? 1 : 0,
                is_featured ? 1 : 0,
                reference_number || ''
            );

            res.redirect('/admin/budgettransfer');
        } catch (error) {
            console.error('Error updating budget transfer:', error);
            const id = req.params.id;
            const existingBudgetTransfer = await BudgetTransfer.getById(id);
            res.status(500).render('admin/budgettransfer-edit', {
                title: 'แก้ไขการโอนงบประมาณรายจ่าย',
                currentPage: 'budgettransfer',
                errorMessage: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล',
                budgetTransfer: existingBudgetTransfer
            });
        }
    },

    // ลบการโอนงบประมาณ
    deleteBudgetTransfer: async (req, res) => {
        try {
            const id = req.params.id;
            const budgetTransfer = await BudgetTransfer.getById(id);
            
            if (!budgetTransfer) {
                return res.status(404).send('ไม่พบข้อมูลการโอนงบประมาณนี้');
            }

            // ลบไฟล์รูปภาพ
            if (budgetTransfer.image_url) {
                const destinationImagePath = resolveBudgetTransferImagePath(budgetTransfer.image_url);
                if (destinationImagePath) {
                    try {
                        await fs.unlink(destinationImagePath);
                        console.log(`Deleted budget transfer image: ${destinationImagePath}`);
                    } catch (fileError) {
                        console.warn(`Warning: Could not delete image for budget transfer ${id}:`, fileError);
                    }
                }
            }

            await BudgetTransfer.delete(id);
            res.redirect('/admin/budgettransfer');
        } catch (error) {
            console.error('Error deleting budget transfer:', error);
            res.status(500).send('ไม่สามารถลบข้อมูลได้');
        }
    },

    // ลบการโอนงบประมาณหลายรายการ (AJAX)
    deleteBudgetTransfersMultiple: async (req, res) => {
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ต้องระบุ ID ของรายการที่ต้องการลบ'
                });
            }

            let deletedCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const id of ids) {
                try {
                    const budgetTransfer = await BudgetTransfer.getById(id);
                    if (!budgetTransfer) {
                        errorCount++;
                        errors.push({ id, error: 'ไม่พบข้อมูลนี้' });
                        continue;
                    }

                    // ลบไฟล์รูปภาพ
                    if (budgetTransfer.image_url) {
                        const destinationImagePath = resolveBudgetTransferImagePath(budgetTransfer.image_url);
                        if (destinationImagePath) {
                            try {
                                await fs.unlink(destinationImagePath);
                                console.log(`Deleted budget transfer image: ${destinationImagePath}`);
                            } catch (fileError) {
                                console.warn(`Warning: Could not delete image for budget transfer ${id}:`, fileError);
                            }
                        }
                    }

                    await BudgetTransfer.delete(id);
                    deletedCount++;
                } catch (err) {
                    errorCount++;
                    errors.push({ id, error: err.message });
                    console.error(`Error deleting budget transfer ${id}:`, err);
                }
            }

            res.json({
                success: true,
                message: `ลบสำเร็จ ${deletedCount} รายการ${errorCount > 0 ? `, ล้มเหลว ${errorCount} รายการ` : ''}`,
                deletedCount,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            });
        } catch (error) {
            console.error('Error in deleteBudgetTransfersMultiple:', error);
            res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการลบข้อมูล',
                error: error.message
            });
        }
    },

    // เปลี่ยนสถานะเผยแพร่
    toggleBudgetTransferPublish: async (req, res) => {
        try {
            const id = req.params.id;
            await BudgetTransfer.togglePublish(id);
            res.redirect('/admin/budgettransfer');
        } catch (error) {
            console.error('Error toggling publish status:', error);
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    },

    // เปลี่ยนสถานะปักหมุด
    toggleBudgetTransferFeatured: async (req, res) => {
        try {
            const id = req.params.id;
            await BudgetTransfer.toggleFeatured(id);
            res.redirect('/admin/budgettransfer');
        } catch (error) {
            console.error('Error toggling featured status:', error);
            res.status(500).send('ไม่สามารถเปลี่ยนสถานะได้');
        }
    }

    // Helper function to resolve budget transfer image path
    // This prevents duplicating code by using the budget_transfer uploads path

};

// Helper function definitions outside the controller object
const resolveBudgetTransferImagePath = (imageUrl) => {
    if (!imageUrl) return null;
    const cleanUrl = decodeURIComponent(String(imageUrl).split('#')[0].trim());
    if (!cleanUrl) return null;

    // If it's already an absolute URL, return as-is for deletion
    if (/^https?:\/\//i.test(cleanUrl)) {
        try {
            const urlPath = new URL(cleanUrl).pathname;
            const localPath = path.join(process.cwd(), 'public', urlPath.startsWith('/') ? urlPath.slice(1) : urlPath);
            return localPath;
        } catch (error) {
            console.warn('Could not parse image URL:', cleanUrl);
            return null;
        }
    }

    // Otherwise treat as relative path
    const relativePath = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;
    return path.join(process.cwd(), 'public', relativePath);
};

module.exports = adminController;
