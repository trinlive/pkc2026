CREATE TABLE IF NOT EXISTS `news_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL COMMENT 'หัวข้อข่าวกิจกรรม',
  `description` longtext COMMENT 'รายละเอียดข่าวกิจกรรม',
  `image_url` varchar(1000) DEFAULT NULL COMMENT 'URL รูปภาพหัวข้อข่าว',
  `attachment_url` varchar(1000) DEFAULT NULL COMMENT 'ไฟล์แนบสำหรับปุ่มอ่านรายละเอียด (PDF/JPG)',
  `date_posted` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่ลงข่าว',
  `date_updated` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไข',
  `is_published` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'สถานะเผยแพร่ (1=เผยแพร่, 0=ร่าง)',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'สถานะข่าวเด่น (1=เด่น, 0=ปกติ)',
  `view_count` int(11) NOT NULL DEFAULT 0 COMMENT 'จำนวนครั้งที่ดู',
  `created_by` varchar(100) DEFAULT NULL COMMENT 'ผู้สร้าง (เช่น joomla:11051)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `date_posted` (`date_posted`),
  KEY `is_published` (`is_published`),
  KEY `is_featured` (`is_featured`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางจัดเก็บข้อมูลข่าวกิจกรรม';

-- Migration: ย้ายข้อมูลจาก news ที่เป็นข่าวกิจกรรมมาลง news_activity
INSERT INTO `news_activity` (
  `id`, `title`, `description`, `image_url`, `attachment_url`, 
  `date_posted`, `date_updated`, `is_published`, `is_featured`, 
  `view_count`, `created_by`, `created_at`, `updated_at`
)
SELECT 
  `id`, `title`, `description`, `image_url`, `attachment_url`, 
  `date_posted`, `date_updated`, `is_published`, `is_featured`, 
  `view_count`, `created_by`, `created_at`, `updated_at`
FROM `news` 
WHERE `news_category` = 'ข่าวกิจกรรม'
ON DUPLICATE KEY UPDATE 
  `title` = VALUES(`title`),
  `description` = VALUES(`description`),
  `image_url` = VALUES(`image_url`),
  `attachment_url` = VALUES(`attachment_url`),
  `date_posted` = VALUES(`date_posted`),
  `is_published` = VALUES(`is_published`),
  `is_featured` = VALUES(`is_featured`);

-- (Optional) ลบข้อมูลเก่าออกจาก news ถ้าต้องการ
-- DELETE FROM `news` WHERE `news_category` = 'ข่าวกิจกรรม';
