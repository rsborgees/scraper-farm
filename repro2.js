const { getExistingIdsFromDrive } = require('./driveManager');
require('dotenv').config();

async function f() {
    const allDriveItems = await getExistingIdsFromDrive(process.env.GOOGLE_DRIVE_FOLDER_ID);
    const farmItems = allDriveItems.filter(item => 
        item.store === 'farm' && 
        !item.isFavorito && 
        !item.novidade && 
        !item.bazar
    );
    console.log(farmItems.slice(0, 10));
}
f();
