// Direct test by calling the function multiple times
const times = 10;

const fallbackLine2Patterns = [
    'เทศบาลนครปากเกร็ดขอประชาสัมพันธ์ข้อมูลข่าวสารเพื่อการรับทราบโดยทั่วกัน.',
    'เทศบาลนครปากเกร็ดขอเชิญชวนประชาชนรับทราบข้อมูลและร่วมให้ความสนใจในรายละเอียดของข่าวนี้.',
    'ทางเทศบาลนครปากเกร็ดขอแจ้งข้อมูลดังกล่าวเพื่อประโยชน์ในการรับทราบของประชาชนทั่วไป.',
    'เทศบาลนครปากเกร็ดขอเผยแพร่ข้อมูลนี้เพื่อให้ประชาชนได้รับทราบและสามารถติดตามรายละเอียดเพิ่มเติมได้.',
    'ประชาชนสามารถติดตามรายละเอียดเพิ่มเติมได้จากข้อมูลที่เทศบาลนครปากเกร็ดเผยแพร่.'
];

console.log(`Testing random selection ${times} times:\n`);

const counts = {};
fallbackLine2Patterns.forEach((_,  idx) => counts[idx] = 0);

for (let i = 0; i < times; i++) {
    const selected = Math.floor(Math.random() * fallbackLine2Patterns.length);
    counts[selected]++;
    console.log(`Test ${i + 1}: Pattern ${selected + 1} - "${fallbackLine2Patterns[selected].slice(0, 60)}..."`);
}

console.log('\nPattern distribution:');
Object.keys(counts).forEach(idx => {
    console.log(`  Pattern ${parseInt(idx) + 1}: ${counts[idx]} time(s)`);
});
