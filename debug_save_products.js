const { getExistingIdsFromDrive } = require('./driveManager');
const { loadHistory, normalizeId } = require('./historyManager');
require('dotenv').config();

async function debugProducts() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    try {
        const allDriveItems = await getExistingIdsFromDrive(folderId);
        const history = loadHistory();
        let candidates = allDriveItems.filter(item => (item.isFavorito || item.novidade) && !item.bazar);
        
        candidates.forEach(item => {
            const normId = normalizeId(item.driveId || item.id);
            const historyEntry = history[normId];
            item._lastSent = historyEntry ? historyEntry.timestamp : 0;
        });

        candidates.sort((a, b) => {
            if (a._lastSent !== b._lastSent) return a._lastSent - b._lastSent;
            return 0;
        });

        const targetItems = candidates.slice(0, 3);
        console.log('--- Target Items from Drive ---');
        console.log(JSON.stringify(targetItems, null, 2));

    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

debugProducts();
