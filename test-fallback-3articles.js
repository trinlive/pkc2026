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
    await conn.execute('DELETE FROM news WHERE news_category = ?', ['ทดสอบ Fallback']);
    console.log('Deleted old test news\n');

    // migrate 3 articles ที่แตกต่างกัน
    const offsets = [5000, 5100, 5200];
    
    for (const offset of offsets) {
        console.log(`--- Migrating offset ${offset} ---`);
        
        const response = await fetch('/admin/migration/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 1,
                offset: offset,
                categoryName: 'ทดสอบ Fallback',
                useAiSummary: true
            })
        });

        const result = JSON.parse(response);
        console.log('Result:', result.message || result.error || 'no message');

        if (result.newNewsIds && result.newNewsIds.length > 0) {
            const newsId = result.newNewsIds[0];
            const [rows] = await conn.execute('SELECT description FROM news WHERE id = ?', [newsId]);
            
            if (rows.length > 0) {
                const desc = rows[0].description;
                const lines = desc.match(/<p>(.*?)<\/p>/g) || [];
                
                console.log('News ID:', newsId);
                lines.forEach((line, idx) => {
                    const text = line.replace(/<\/?p>/g, '');
                    console.log(`  LINE${idx + 1}: ${text.slice(0, 120)}${text.length > 120 ? '...' : ''}`);
                });
            }
        }
        console.log('');
    }

    await conn.end();
}

test().catch(console.error);
