const fs = require('fs');

async function downloadCSV() {
    const url = 'https://docs.google.com/spreadsheets/d/1JCv5F3ztLXIjRrAGku7pOyfxtvFAwqG08UrwiImb9w8/export?format=csv&gid=1010205563';
    const res = await fetch(url);
    const text = await res.text();
    return text;
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) continue;
        let result = [];
        let cur = '';
        let inQuote = false;
        for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') inQuote = !inQuote;
            else if (line[j] === ',' && !inQuote) { result.push(cur); cur = ''; }
            else cur += line[j];
        }
        result.push(cur);
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = result[idx] ? result[idx].trim() : ''; });
        obj._rowNum = i + 1;
        rows.push(obj);
    }
    return rows;
}

async function analyze() {
    const text = await downloadCSV();
    const rows = parseCSV(text);
    
    // Group dates to see what exists
    const dates = {};
    const todayStr = '02/04/2026';
    const todaysItems = [];
    
    rows.forEach(row => {
        let dateVal = row.hora_entrada ? row.hora_entrada.split(' ')[0] : 'unknown';
        dates[dateVal] = (dates[dateVal] || 0) + 1;
        if (dateVal.includes('02/04') || row.hora_envio.includes('02/04')) {
            todaysItems.push(row);
        }
    });

    const output = {
        totalRows: rows.length,
        datesAvailable: dates,
        todaysItemsCount: todaysItems.length,
        todaysItems: todaysItems
    };

    fs.writeFileSync('spreadsheet_filter_today.json', JSON.stringify(output, null, 2));
    console.log("Analysis of today's items saved to spreadsheet_filter_today.json");
    console.log("Dates found:", Object.keys(dates));
}

analyze().catch(console.error);
