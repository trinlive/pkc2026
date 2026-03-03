const mysql = require('mysql2/promise');
const http = require('http');

function fetch(path, options = {}) {
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

async function test() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'npakkret_user',
        password: '8REaM3nkmmt^t@m2',
        database: 'pkc_nodeweb_db'
    });

    // ลบข่าวทดสอบเก่า
    await conn.execute('DELETE FROM news WHERE news_category = ?', ['ทดสอบ Variety']);
    console.log('Deleted old test news\n');

    const categoryName = 'ทดสอบ Variety';
    const foundOffsets = [];

    // หา 3 offsets ที่สามารถ add ได้
    console.log('Finding available offsets...');
    let checked = 0;
    for (let offset = 0; offset < 1000 && foundOffsets.length < 3; offset++) {
        checked++;
        const response = await fetch('/admin/migration/news/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: 1, offset, categoryName })
        });

        const result = JSON.parse(response);
        if (result.success && result.statistics && result.statistics.willAddCount > 0) {
            foundOffsets.push(offset);
            console.log(`  Found addable offset: ${offset}`);
        }
    }

    console.log(`\nChecked ${checked} offsets, found ${foundOffsets.length} addable articles\n`);

    // migrate แต่ละ offset
    for (const offset of foundOffsets) {
        console.log(`--- Migrating offset ${offset} ---`);
        
        const response = await fetch('/admin/migration/news', {
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
        console.log('Result:', result.message || result.error || 'no message');

        if (result.newNewsIds && result.newNewsIds.length > 0) {
            const newsId = result.newNewsIds[0];
            const [rows] = await conn.execute('SELECT title, description FROM news WHERE id = ?', [newsId]);
            
            if (rows.length > 0) {
                const desc = rows[0].description;
                const title = rows[0].title;
                const lines = desc.match(/<p>(.*?)<\/p>/g) || [];
                
                console.log(`News ID ${newsId}: ${title.slice(0, 60)}`);
                lines.forEach((line, idx) => {
                    const text = line.replace(/<\/?p>/g, '');
                    const displayText = text.slice(0, 100);
                    console.log(`  LINE${idx + 1}: ${displayText}${text.length > 100 ? '...' : ''}`);
                });
            }
        }
        console.log('');
    }

    await conn.end();
}

test().catch(console.error);
