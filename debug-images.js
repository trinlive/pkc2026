/**
 * Debug: Check if Joomla articles have images property
 */

const mysql = require('mysql2');

(async () => {
    try {
        const joomlaPool = mysql.createPool({
            host: 'localhost',
            user: 'pkc_joomla_full',
            password: 'dRy94k$21',
            database: 'pkc_joomla_db'
        }).promise();

        const [articles] = await joomlaPool.query(
            `SELECT id, title, images FROM fn4n2_content 
             WHERE catid = 25 AND state = 1 
             ORDER BY id DESC LIMIT 20`
        );

        await joomlaPool.end();

        console.log(`📊 Found ${articles.length} articles\n`);
        
        console.log('Articles with images:');
        articles.forEach(article => {
            if (article.images) {
                try {
                    const imgObj = typeof article.images === 'string' ? JSON.parse(article.images) : article.images;
                    const imageIntro = imgObj.image_intro || '';
                    console.log(`\nID ${article.id}: ${article.title.substring(0, 40)}...`);
                    console.log(`  image_intro: ${imageIntro.substring(0, 60)}${imageIntro.length > 60 ? '...' : ''}`);
                    console.log(`  Has image_intro: ${!!imgObj.image_intro}`);
                } catch (e) {
                    console.log(`\nID ${article.id}: ${article.title.substring(0, 40)}...`);
                    console.log(`  images (raw): ${typeof article.images} - Parse Error: ${e.message}`);
                }
            } else {
                console.log(`\nID ${article.id}: ${article.title.substring(0, 40)}... - NO IMAGES`);
            }
        });

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
