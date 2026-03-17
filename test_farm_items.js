const { getExistingIdsFromDrive } = require('./driveManager');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function checkURL(id) {
    try {
        const response = await axios.get(`https://www.farmrio.com.br/api/catalog_system/pub/products/search?ft=${id}`, { timeout: 10000 });
        if (response.data && response.data.length > 0 && response.data[0].productName) {
            return response.data[0].productName;
        }
    } catch (e) { }
    
    try {
        const response2 = await axios.get(`https://www.farmrio.com.br/api/catalog_system/pub/products/search?fq=productId:${id}`, { timeout: 10000 });
        if (response2.data && response2.data.length > 0 && response2.data[0].productName) {
            return response2.data[0].productName;
        }
    } catch (e) { }
    return null;
}

async function f() {
    const allDriveItems = await getExistingIdsFromDrive(process.env.GOOGLE_DRIVE_FOLDER_ID);
    const farmItems = allDriveItems.filter(item => 
        item.store === 'farm' && 
        !item.isFavorito && 
        !item.novidade && 
        !item.bazar
    );
    console.log("Checking", farmItems.length, "items...");
    const working = [];
    for (let i = 0; i < farmItems.length; i++) {
        const id = farmItems[i].id;
        process.stdout.write(`\rChecking ${i+1}/${farmItems.length}: ${id}...`);
        const name = await checkURL(id);
        if (name) {
            console.log(`\nFOUND: ${id} - ${name}`);
            working.push({id, name});
        }
        if (working.length >= 10) break;
    }
    console.log("\nFound working:", working.length);
}
f();
