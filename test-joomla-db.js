#!/usr/bin/env node

/**
 * Test Script for Joomla Database Connection
 * ทดสอบการเชื่อมต่อกับ Joomla Database เก่า
 */

const JoomlaDB = require('./models/joomla-db');

async function runTests() {
    console.log('🔍 ทดสอบการเชื่อมต่อ Joomla Database...\n');

    // ===== Test 1: Connection Test =====
    console.log('📌 Test 1: ทดสอบการเชื่อมต่อ');
    const connTest = await JoomlaDB.testConnection();
    console.log(connTest);
    console.log('---\n');

    // ===== Test 2: Database Statistics =====
    console.log('📌 Test 2: สถิติฐานข้อมูล');
    const stats = await JoomlaDB.getDbStats();
    console.log(stats);
    console.log('---\n');

    // ===== Test 3: Get All Categories =====
    console.log('📌 Test 3: ดึงหมวดหมู่ทั้งหมด');
    const categories = await JoomlaDB.getAllCategories();
    console.log(`พบหมวดหมู่: ${categories.length} รายการ`);
    if (categories.length > 0) {
        console.log('ตัวอย่าง 3 รายการแรก:');
        categories.slice(0, 3).forEach((cat, idx) => {
            console.log(`  ${idx + 1}. [${cat.id}] ${cat.title} (${cat.alias})`);
        });
    }
    console.log('---\n');

    // ===== Test 4: Get All Articles =====
    console.log('📌 Test 4: ดึงบทความทั้งหมด (ไม่จำกัดจำนวน)');
    const articles = await JoomlaDB.getAllArticles(null, 0, 1);
    console.log(`พบบทความ: ${articles.length} รายการ`);
    if (articles.length > 0) {
        console.log('ตัวอย่าง 3 รายการแรก:');
        articles.slice(0, 3).forEach((art, idx) => {
            console.log(`  ${idx + 1}. [${art.id}] ${art.title}`);
            console.log(`     หมวด: ${art.category_name || 'ไม่ระบุ'}`);
            console.log(`     ผู้เขียน: ${art.author_name || 'Unknown'}`);
            console.log(`     วันที่: ${new Date(art.publish_up).toLocaleDateString('th-TH')}`);
        });
    }
    console.log('---\n');

    // ===== Test 5: Get Users =====
    console.log('📌 Test 5: ดึงข้อมูลผู้ใช้');
    const users = await JoomlaDB.getAllUsers();
    console.log(`พบผู้ใช้: ${users.length} ราย`);
    if (users.length > 0) {
        console.log('ตัวอย่าง 3 คนแรก:');
        users.slice(0, 3).forEach((user, idx) => {
            console.log(`  ${idx + 1}. ${user.name} (${user.username})`);
            console.log(`     Email: ${user.email}`);
            console.log(`     สมัครสมาชิก: ${new Date(user.registerDate).toLocaleDateString('th-TH')}`);
        });
    }
    console.log('---\n');

    // ===== Test 6: Get Menu Items =====
    console.log('📌 Test 6: ดึง Menu Items');
    const menus = await JoomlaDB.getMenuItems();
    console.log(`พบ Menu Items: ${menus.length} รายการ`);
    if (menus.length > 0) {
        console.log('ตัวอย่าง Menu Items:');
        menus.slice(0, 5).forEach((menu, idx) => {
            console.log(`  ${idx + 1}. [${menu.menutype}] ${menu.title} -> ${menu.link}`);
        });
    }
    console.log('---\n');

    // ===== Test 7: Get Menu Types =====
    console.log('📌 Test 7: ดึง Menu Types');
    const menuTypes = await JoomlaDB.getMenuTypes();
    console.log(`พบ Menu Types: ${menuTypes.length} รายการ`);
    menuTypes.forEach(mt => {
        console.log(`  - ${mt.menutype}`);
    });
    console.log('---\n');

    // ===== Test 8: Count Articles =====
    console.log('📌 Test 8: นับจำนวนบทความ');
    const articleCount = await JoomlaDB.countArticles();
    console.log(`รวมบทความที่เผยแพร่: ${articleCount} รายการ`);
    console.log('---\n');

    console.log('✅ ทดสอบเสร็จสิ้น');
    console.log('\n📝 หมายเหตุ:');
    console.log('- สามารถใช้ JoomlaDB ใน controller ได้โดยการ require ./models/joomla-db');
    console.log('- ตัวอย่าง: const JoomlaDB = require(\'./models/joomla-db\');');
    console.log('- พร้อมใช้สำหรับ Data Migration ได้แล้ว');
}

// Run tests
runTests().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
