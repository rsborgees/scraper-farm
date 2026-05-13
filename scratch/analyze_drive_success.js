const { getExistingIdsFromDrive } = require('../driveManager');
const { scrapeSpecificIds } = require('../scrapers/farm/idScanner');
const { initBrowser } = require('../browser_setup');
require('dotenv').config();

async function analyze() {
    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const allItems = await getExistingIdsFromDrive(folderId);
        
        // Candidates: Fav or Nov, not Bazar
        const candidates = allItems.filter(item => (item.isFavorito || item.novidade) && !item.bazar && item.store === 'farm');
        console.log(`Total Farm candidates in Drive: ${candidates.length}`);

        if (candidates.length === 0) return;

        const { browser, context } = await initBrowser();
        try {
            // Check first 20 candidates
            const sample = candidates.slice(0, 20);
            console.log(`Analyzing first 20 candidates...`);
            const result = await scrapeSpecificIds(context, sample, 20, { maxAgeHours: 0 });
            
            console.log(`\n--- RESULTS ---`);
            console.log(`Found: ${result.products.length}`);
            console.log(`Not Found / OOS: ${result.stats.notFound}`);
            console.log(`Duplicates: ${result.stats.duplicates}`);
            console.log(`Errors: ${result.stats.errors}`);

            if (result.stats.notFound > 0) {
                console.log(`\nThe items NOT FOUND are likely out of stock or filtered (Children/Extreme Sizes).`);
            }
        } finally {
            await browser.close();
        }
    } catch (err) {
        console.error(err);
    }
}

analyze();
