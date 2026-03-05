-- เพิ่มคอลัมน์ news_category ให้ Table news_activity เหมือน Table news

ALTER TABLE `news_activity` 
ADD COLUMN `news_category` varchar(100) DEFAULT 'ข่าวกิจกรรม' COMMENT 'หมวดหมู่ข่าว (ข่าวกิจกรรม)' AFTER `attachment_url`,
ADD INDEX `news_category` (`news_category`);

-- อัพเดทข้อมูลเดิมให้มีค่า news_category
UPDATE `news_activity` SET `news_category` = 'ข่าวกิจกรรม' WHERE `news_category` IS NULL;
