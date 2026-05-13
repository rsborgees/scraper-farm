const fs = require('fs');
const path = require('path');

const history = JSON.parse(fs.readFileSync('data/history.json', 'utf8'));
const sent_ids = history.sent_ids;

const yesterdayStart = new Date('2026-05-11T00:00:00Z').getTime();
const yesterdayEnd = new Date('2026-05-11T23:59:59Z').getTime();

let count = 0;
for (const [id, data] of Object.entries(sent_ids)) {
    if (data.timestamp >= yesterdayStart && data.timestamp <= yesterdayEnd) {
        count++;
    }
}

console.log('Items sent on 2026-05-11 in history.json:', count);
