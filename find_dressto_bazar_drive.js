const { getExistingIdsFromDrive } = require('./driveManager');
require('dotenv').config();

async function run() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const items = await getExistingIdsFromDrive(folderId);
    const dressto = items.filter(i => i.store === 'dressto');
    const bazares = dressto.filter(i => i.bazar === true);

    console.log(`\n--- DRESS TO BAZAR ITEMS IN DRIVE ---`);
    console.log(`Total dressto items: ${dressto.length}`);
    console.log(`Bazar dressto items: ${bazares.length}`);
    bazares.forEach(b => console.log(`- ${b.name} (ID: ${b.id})`));
    console.log(`-------------------------------------`);
}
run();
