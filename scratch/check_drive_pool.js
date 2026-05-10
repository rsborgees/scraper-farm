const { getExistingIdsFromDrive } = require('../driveManager');
const { loadHistory, normalizeId, isDuplicate } = require('../historyManager');
require('dotenv').config();

async function checkDrivePool() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
        console.error('GOOGLE_DRIVE_FOLDER_ID not set');
        return;
    }

    const allDriveItems = await getExistingIdsFromDrive(folderId);
    const history = loadHistory();
    const now = Date.now();

    const stats = {
        total: 0,
        normal: 0,
        bazar: 0,
        novidade: 0,
        favorito: 0,
        eligible_48h: {
            normal: 0,
            bazar: 0,
            novidade: 0
        },
        eligible_24h: {
            normal: 0,
            bazar: 0,
            novidade: 0
        }
    };

    allDriveItems.forEach(item => {
        if (item.store !== 'farm') return;
        stats.total++;

        const isBaz = !!item.bazar;
        const isNov = !!(item.novidade || item.isNovidade);
        const isFav = !!(item.favorito || item.isFavorito);

        if (isBaz) stats.bazar++;
        else if (isNov || isFav) stats.novidade++;
        else stats.normal++;

        const normId = normalizeId(item.id);
        
        // Check eligibility
        if (!isDuplicate(normId, { maxAgeHours: 48 })) {
            if (isBaz) stats.eligible_48h.bazar++;
            else if (isNov || isFav) stats.eligible_48h.novidade++;
            else stats.eligible_48h.normal++;
        }
        
        if (!isDuplicate(normId, { maxAgeHours: 24 })) {
            if (isBaz) stats.eligible_24h.bazar++;
            else if (isNov || isFav) stats.eligible_24h.novidade++;
            else stats.eligible_24h.normal++;
        }
    });

    console.log('📊 [Drive Pool Stats] FARM:');
    console.log(`Total: ${stats.total}`);
    console.log(`Categorias: Normal=${stats.normal}, Bazar=${stats.bazar}, Novidade/Fav=${stats.novidade}`);
    console.log(`\nElegíveis (Não enviados nas últimas 48h):`);
    console.log(`   Normal: ${stats.eligible_48h.normal}`);
    console.log(`   Bazar: ${stats.eligible_48h.bazar}`);
    console.log(`   Novidade: ${stats.eligible_48h.novidade}`);
    console.log(`\nElegíveis (Não enviados nas últimas 24h):`);
    console.log(`   Normal: ${stats.eligible_24h.normal}`);
    console.log(`   Bazar: ${stats.eligible_24h.bazar}`);
    console.log(`   Novidade: ${stats.eligible_24h.novidade}`);
}

checkDrivePool();
