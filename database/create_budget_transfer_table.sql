-- ตารางสำหรับจัดเก็บข้อมูลการโอนงบประมาณรายจ่ายประจำปี
-- Table for Budget Transfer (Transfer of Annual Expenditure Budget)

CREATE TABLE IF NOT EXISTS `budget_transfer` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL COMMENT 'เรื่อง/หัวข้อการโอนงบประมาณ',
  `description` longtext COMMENT 'รายละเอียดการโอนงบประมาณ',
  `image_url` varchar(1000) DEFAULT NULL COMMENT 'URL รูปภาพหรือเอกสาร',
  `attachment_url` varchar(1000) DEFAULT NULL COMMENT 'ไฟล์แนบเพื่ออ่านรายละเอียด (PDF/JPG/PNG)',
  `category` varchar(100) DEFAULT 'การโอนงบประมาณรายจ่ายประจำปี' COMMENT 'หมวดหมู่',
  `date_posted` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'วันที่ลงประกาศ',
  `date_updated` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'วันที่แก้ไข',
  `is_published` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'สถานะเผยแพร่ (1=เผยแพร่, 0=ร่าง)',
  `is_featured` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'สถานะหลัก (1=หลัก, 0=ปกติ)',
  `view_count` int(11) NOT NULL DEFAULT 0 COMMENT 'จำนวนครั้งที่ดู',
  `created_by` varchar(100) DEFAULT NULL COMMENT 'ผู้สร้าง',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `date_posted` (`date_posted`),
  KEY `is_published` (`is_published`),
  KEY `is_featured` (`is_featured`),
  KEY `category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางจัดเก็บข้อมูลการโอนงบประมาณรายจ่ายประจำปี';
