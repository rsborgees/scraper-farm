const { getExistingIdsFromDrive } = require('./driveManager');
require('dotenv').config();

async function count() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log(`📂 Folder: ${folderId}`);
    const allDriveItems = await getExistingIdsFromDrive(folderId);
    console.log(`Total items: ${allDriveItems.length}`);

    const favs = allDriveItems.filter(i => i.isFavorito);
    const novs = allDriveItems.filter(i => i.novidade);
    const bazar = allDriveItems.filter(i => i.bazar);
    const regular = allDriveItems.filter(i => !i.isFavorito && !i.novidade && !i.bazar);

    console.log(`Favoritos (Total): ${favs.length}`);
    console.log(`Novidades (Total): ${novs.length}`);
    console.log(`Bazar (Total): ${bazar.length}`);
    console.log(`Regular (Total): ${regular.length}`);

    const candidates = allDriveItems.filter(item => (item.isFavorito || item.novidade) && !item.bazar);
    console.log(`Candidates (Fav or Nov, not Bazar): ${candidates.length}`);
}

count();
