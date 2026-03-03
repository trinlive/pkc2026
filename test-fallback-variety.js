const http = require('http');

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: options.method || 'GET',
            headers: options.headers || {}
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function testMultipleMigrations() {
    const testIds = [285, 284, 283];
    
    for (const jid of testIds) {
        const res = await request('/admin/migration/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 1,
                offset: 0,
                categoryName: 'ทดสอบ',
                useAiSummary: true,
                joomlaArticleIds: [jid]
            })
        });
        
        const data = JSON.parse(res.body);
        
        if (data.newNewsIds && data.newNewsIds.length > 0) {
            const id = data.newNewsIds[0];
            
            const detailRes = await request(`/admin/news/${id}/edit`);
            const html = detailRes.body;
            
            const descMatch = html.match(/<textarea[^>]*name="description"[^>]*>([\s\S]*?)<\/textarea>/);
            if (descMatch) {
                const desc = descMatch[1].trim();
                const lines = desc.match(/<p>(.*?)<\/p>/g) || [];
                
                console.log('');
                console.log(`=== Joomla ID ${jid} → News ID ${id} ===`);
                lines.forEach((line, idx) => {
                    const text = line.replace(/<\/?p>/g, '').slice(0, 100);
                    console.log(`LINE${idx+1}: ${text}${text.length === 100 ? '...' : ''}`);
                });
            }
        }
    }
}

testMultipleMigrations().catch(console.error);
