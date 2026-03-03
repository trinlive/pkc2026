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

    const categoryName = 'ทดสอบ Migration';
    const foundOffsets = [];

    console.log('🔍 กำลังค้นหา offset ที่สามารถ migrate ได้...');
    for (let offset = 0; offset < 300 && foundOffsets.length < 5; offset++) {
        const response = await httpRequest('/admin/migration/news/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 1, offset, categoryName })
        });

        const result = JSON.parse(response);
        if (result.success && result.statistics && result.statistics.willAddCount > 0) {
            foundOffsets.push(offset);
            process.stdout.write(`✓`);
        } else {
            process.stdout.write(`.`);
        }
    }

    console.log(`\n\n📊 พบ ${foundOffsets.length} รายการที่สามารถ migrate ได้\n`);
    console.log('═'.repeat(80));

    // migrate แต่ละ offset
    const results = [];
    for (let i = 0; i < foundOffsets.length; i++) {
        const offset = foundOffsets[i];
        
        console.log(`\n[${i + 1}/5] กำลัง Migrate offset ${offset}...`);
        
        const response = await httpRequest('/admin/migration/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 1,
                offset: offset,
                categoryName: categoryName,
                useAiSummary: true
            })
        });

        const result = JSON.parse(response);
        console.log(`📝 ${result.message || result.error || 'no message'}`);

        if (result.newNewsIds && result.newNewsIds.length > 0) {
            const newsId = result.newNewsIds[0];
            const [rows] = await conn.execute('SELECT title, description FROM news WHERE id = ?', [newsId]);
            
            if (rows.length > 0) {
                const title = rows[0].title;
                const desc = rows[0].description;
                const lines = desc.match(/<p>(.*?)<\/p>/g) || [];
                
                results.push({
                    id: newsId,
                    title,
                    lines: lines.map(l => l.replace(/<\/?p>/g, ''))
                });
                
                console.log(`📰 News ID: ${newsId}`);
                console.log(`📌 Title: ${title.slice(0, 70)}${title.length > 70 ? '...' : ''}`);
                lines.forEach((line, idx) => {
                    const text = line.replace(/<\/?p>/g, '');
                    const displayText = text.slice(0, 90);
                    console.log(`   LINE${idx + 1}: ${displayText}${text.length > 90 ? '...' : ''}`);
                });
            }
        }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📋 สรุปผลการทดสอบ:\n');
    
    results.forEach((r, idx) => {
        console.log(`${idx + 1}. [ID:${r.id}] ${r.title.slice(0, 50)}${r.title.length > 50 ? '...' : ''}`);
        console.log(`   L2: ${r.lines[1] ? r.lines[1].slice(0, 70) + '...' : 'N/A'}`);
    });

    console.log('\n✅ ทดสอบเสร็จสิ้น');
    await conn.end();
}

testMigration5Items().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
