-- สร้างตาราง sliders สำหรับจัดการ Slider บนหน้าแรก
CREATE TABLE IF NOT EXISTS `sliders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT 'หัวข้อหลัก',
  `subtitle` varchar(500) DEFAULT NULL COMMENT 'หัวข้อรอง',
  `image_url` varchar(1000) NOT NULL COMMENT 'URL รูปภาพ',
  `link_url` varchar(1000) DEFAULT NULL COMMENT 'URL ลิงก์เมื่อคลิก',
  `badge_text` varchar(100) DEFAULT NULL COMMENT 'ข้อความ Badge',
  `display_order` int(11) NOT NULL DEFAULT 0 COMMENT 'ลำดับการแสดง',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'สถานะ (1=แสดง, 0=ซ่อน)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `display_order` (`display_order`),
  KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางจัดเก็บข้อมูล Slider';

-- เพิ่มข้อมูลตัวอย่าง
INSERT INTO `sliders` (`title`, `subtitle`, `image_url`, `link_url`, `badge_text`, `display_order`, `is_active`) VALUES
('เทศบาลนครปากเกร็ด คว้ารางวัลเมืองน่าอยู่', 'มุ่งมั่นพัฒนาคุณภาพชีวิตประชาชนอย่างยั่งยืน สู่เมืองแห่งอนาคต', 'https://picsum.photos/1920/1080?random=1', '#', 'ข่าวเด่น', 0, 1),
('บริการประชาชนด้วยเทคโนโลยีดิจิทัล', 'สะดวก รวดเร็ว โปร่งใส ตรวจสอบได้ทุกที่ทุกเวลา', 'https://picsum.photos/1920/1080?random=2', '#', 'Digital Service', 1, 1),
('โครงการเมืองสะอาด สิ่งแวดล้อมดี', 'ร่วมกันรักษาความสะอาด เพื่อสุขภาพที่ดีของทุกคน', 'https://picsum.photos/1920/1080?random=3', '#', 'Green City', 2, 1);
