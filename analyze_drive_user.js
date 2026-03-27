const { getExistingIdsFromDrive } = require('./driveManager');
require('dotenv').config();

async function analyzeDrive() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log(` Analyzing Drive Folder: ${folderId}\n`);

    const items = await getExistingIdsFromDrive(folderId);
    const farmItems = items.filter(i => i.store === 'farm');

    console.log(`Total Farm items: ${farmItems.length}`);
    const favoritos = farmItems.filter(i => i.isFavorito);
    console.log(`Total Favoritos: ${favoritos.length}`);

    console.log('\n--- List of Favoritos (First 20) ---');
    favoritos.slice(0, 20).forEach((f, i) => {
        console.log(`${i + 1}. ${f.id} - ${f.name}`);
    });

    const userIds = [
        '358001',
        '356090',
        '355078',
        '356023',
        '356094',
        '356024',
        '358356',
        '358015'
    ];

    console.log('\n--- User IDs Status in Drive ---');
    userIds.forEach(uid => {
        const item = farmItems.find(fi => fi.ids.includes(uid) || fi.id === uid);
        if (item) {
            const seasonFlags = [
                item.verao ? '☀️ Verão' : null,
                item.altoVerao ? '🔥 Alto Verão' : null,
                item.inverno ? '❄️ Inverno' : null,
                item.altoInverno ? '🌬️ Alto Inverno' : null
            ].filter(Boolean).join(', ');
            
            console.log(`✅ ${uid}: Found in Drive. Favorito: ${item.isFavorito ? 'YES' : 'NO'}. Name: ${item.name} | Flags: ${seasonFlags || 'None'}`);
        } else {
            console.log(`❌ ${uid}: NOT FOUND in Drive folder.`);
        }
    });
    console.log('\n--- Seasonal Flags Detection Check ---');
    const seasons = ['verao', 'altoVerao', 'inverno', 'altoInverno'];
    seasons.forEach(s => {
        const found = items.find(item => item[s]);
        if (found) {
            console.log(`✅ Flag [${s}] works: Found "${found.name}"`);
        } else {
            console.log(`⚠️ Flag [${s}] not found in any filename in this folder.`);
        }
    });
}

analyzeDrive();
