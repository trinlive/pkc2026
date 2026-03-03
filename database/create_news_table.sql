-- สร้างตาราง news สำหรับจัดการข่าวประชาสัมพันธ์
CREATE TABLE IF NOT EXISTS `news` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL COMMENT 'หัวข้อข่าว',
  `description` longtext COMMENT 'รายละเอียดข่าว/ข้อความประชาสัมพันธ์',
  `image_url` varchar(1000) DEFAULT NULL COMMENT 'URL รูปภาพหัวข้อข่าว',
  `news_category` varchar(100) DEFAULT NULL COMMENT 'หมวดหมู่ข่าว (ข่าวประชาสัมพันธ์, ติดตามการบริหาร, เก็บเงิน, บริการประชาชน ฯลฯ)',
  `date_posted` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่ลงข่าว',
  `date_updated` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไข',
  `is_published` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'สถานะเผยแพร่ (1=เผยแพร่, 0=ร่าง)',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'สถานะข่าวเด่น (1=เด่น, 0=ปกติ)',
  `view_count` int(11) NOT NULL DEFAULT 0 COMMENT 'จำนวนครั้งที่ดู',
  `created_by` varchar(100) DEFAULT NULL COMMENT 'ผู้สร้าง',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `date_posted` (`date_posted`),
  KEY `is_published` (`is_published`),
  KEY `is_featured` (`is_featured`),
  KEY `news_category` (`news_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางจัดเก็บข้อมูลข่าวประชาสัมพันธ์';

-- เพิ่มข้อมูลตัวอย่าง
INSERT INTO `news` (`title`, `description`, `news_category`, `is_published`, `is_featured`) VALUES 
('ปณิธานประจำปี 2569', 'เทศบาลนครปากเกร็ด มุ่งมั่นพัฒนาคุณภาพชีวิตประชาชนให้มีความสุขและมั่นคง', 'ข่าวประชาสัมพันธ์', 1, 1),
('โครงการสะอาด สะปะอาด', 'โครงการจัดทำความสะอาดท้องถิ่นเพื่อสร้างสภาพแวดล้อมที่ดี', 'โครงการพิเศษ', 1, 0),
('การให้บริการประชาชน', 'บริการออนไลน์เพื่อความสะดวกของประชาชนทุกหนทุกแห่ง', 'บริการประชาชน', 1, 0);
