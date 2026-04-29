const { getExistingIdsFromDrive } = require('../driveManager');
require('dotenv').config();

async function test() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log(`Testing folder: ${folderId}`);
    const items = await getExistingIdsFromDrive(folderId);
    
    const targets = ['356095', '356956'];
    const found = items.filter(i => targets.includes(i.id));
    
    console.log(`Found ${found.length} target items:`);
    found.forEach(i => {
        console.log(`- ID: ${i.id}`);
        console.log(`  Name: ${i.name}`);
        console.log(`  Inverno: ${i.inverno}`);
        console.log(`  Verao: ${i.verao}`);
    });
}

test().catch(console.error);
