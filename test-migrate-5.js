const mysql = require('mysql2/promise');
const http = require('http');

function httpRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path,
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function testMigration5Items() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'npakkret_user',
        password: '8REaM3nkmmt^t@m2',
        database: 'pkc_nodeweb_db'
    });

    console.log('🗑️  ลบข่าวทดสอบเก่า...');
    await conn.execute('DELETE FROM news WHERE news_category = ?', ['ทดสอบ Migration']);
    console.log('✅ ลบเรียบร้อย\n');

    const categoryName = 'ข่าวประชาสัมพันธ์ | News';
    
    console.log('📊 ทำการ Migrate 5 รายการโดยตรง...\n');
    console.log('═'.repeat(80));

    // migrate 5 items โดยตรง
    const response = await httpRequest('/admin/migration/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            limit: 5,
            offset: 20,
            categoryName: categoryName,
            useAiSummary: true
        })
    });

    const result = JSON.parse(response);
    console.log(`\n📝 ${result.message || result.error || 'no message'}\n`);

    // ดึงข่าว 5 รายการล่าสุด
    const [newsRows] = await conn.execute('SELECT id, title, description FROM news WHERE news_category = ? ORDER BY id DESC LIMIT 5', [categoryName]);

    if (newsRows.length > 0) {
        console.log(`✅ สำเร็จ: migrate ${newsRows.length} รายการ\n`);
        console.log('═'.repeat(80));
        
        // แสดงรายละเอียดแต่ละรายการ
        for (let i = 0; i < newsRows.length; i++) {
            const row = newsRows[i];
            const newsId = row.id;
            const title = row.title;
            const desc = row.description;
            const lines = desc.match(/<p>(.*?)<\/p>/g) || [];
                
                console.log(`\n[${i + 1}/5] News ID: ${newsId}`);
                console.log(`📌 Title: ${title.slice(0, 80)}${title.length > 80 ? '...' : ''}`);
                
                lines.forEach((line, idx) => {
                    const text = line.replace(/<\/?p>/g, '');
                    const displayText = text.slice(0, 100);
                    console.log(`   LINE${idx + 1}: ${displayText}${text.length > 100 ? '...' : ''}`);
                });
        }
        
        console.log('\n' + '═'.repeat(80));
        console.log('\n📋 สรุป LINE2 แต่ละรายการ (ตรวจสอบความหลากหลาย):\n');
        
        for (let i = 0; i < newsRows.length; i++) {
            const row = newsRows[i];
            const newsId = row.id;
            const desc = row.description;
            const lines = desc.match(/<p>(.*?)<\/p>/g) || [];
            const line2 = lines[1] ? lines[1].replace(/<\/?p>/g, '') : 'N/A';
            
            console.log(`${i + 1}. [ID:${newsId}]`);
            console.log(`   ${line2.slice(0, 85)}${line2.length > 85 ? '...' : ''}\n`);
        }
        
        console.log('✅ ทดสอบเสร็จสิ้น');
    } else {
        console.log('⚠️  ไม่พบรายการที่ migrate ได้');
    }

    await conn.end();
}

testMigration5Items().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
