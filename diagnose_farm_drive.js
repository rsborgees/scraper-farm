const { getExistingIdsFromDrive } = require('./driveManager');
const { loadHistory, normalizeId } = require('./historyManager');
const dotenv = require('dotenv');
dotenv.config();

function getPriorityScore(item, history = {}) {
    let score = 0;
    const now = Date.now();
    const normId = normalizeId(item.id);

    if (item.bazar || item.bazarFavorito) score += 10000;

    if (history[normId]) {
        const lastSentMs = history[normId].timestamp;
        const daysSinceLastSent = (now - lastSentMs) / (1000 * 60 * 60 * 24);
        if (daysSinceLastSent >= 7) score += 5000;
    } else {
        score += 5000;
    }

    if (item.createdTime) {
        const createdDate = new Date(item.createdTime);
        const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 7) score += 2000;
    }

    if (item.novidade || item.isNovidade) score += 1000;
    if (item.isFavorito || item.favorito) score += 500;

    return score;
}

async function diagnose() {
    console.log('--- Farm Drive Diagnosis ---');
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
        console.error('GOOGLE_DRIVE_FOLDER_ID not found');
        return;
    }

    const allDriveItems = await getExistingIdsFromDrive(folderId);
    const farmItems = allDriveItems.filter(i => i.store === 'farm');
    const history = loadHistory();

    console.log(`Total Farm items in Drive: ${farmItems.length}`);

    const bazarItems = farmItems.filter(i => i.bazar);
    const regularItems = farmItems.filter(i => !i.bazar);

    console.log(`Bazar items: ${bazarItems.length}`);
    console.log(`Regular items: ${regularItems.length}`);

    const scoredItems = farmItems.map(item => ({
        id: item.id,
        name: item.name,
        bazar: !!item.bazar,
        score: getPriorityScore(item, history)
    })).sort((a, b) => b.score - a.score);

    console.log('\nTop 30 items by score:');
    scoredItems.slice(0, 30).forEach((item, idx) => {
        console.log(`${idx + 1}. ID: ${item.id} | Bazar: ${item.bazar} | Score: ${item.score} | Name: ${item.name}`);
    });

    const top30BazarCount = scoredItems.slice(0, 30).filter(i => i.bazar).length;
    console.log(`\nItems from Bazar in Top 30: ${top30BazarCount}`);
}

diagnose();
