const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');
const { initBrowser } = require('./browser_setup');

async function verify() {
    const { browser, context } = await initBrowser();
    
    try {
        // Test Cases - Using suffixes to ensure uniqueness for reporting
        const testItems = [
            {
                id: '350634_07431_BAZAR_OK',
                driveId: '350634_07431_BAZAR_OK',
                ids: ['350634_07431'],
                bazar: true,
                name: 'Drive=Bazar, Site=Bazar => BAZAR'
            },
            {
                id: '357038_09040_NON_BAZAR',
                driveId: '357038_09040_NON_BAZAR',
                ids: ['357038_09040'],
                bazar: true,
                name: 'Drive=Bazar, Site=Regular => REGULAR'
            },
            {
                id: '350634_07431_DRIVE_REGULAR',
                driveId: '350634_07431_DRIVE_REGULAR',
                ids: ['350634_07431'],
                bazar: false,
                name: 'Drive=Regular, Site=Bazar => REGULAR'
            }
        ];

        console.log('🚀 Starting Final Verification...\n');

        const { products } = await scrapeSpecificIds(context, testItems, 10);

        console.log('\n📊 FINAL RESULTS:');
        testItems.forEach((testItem) => {
            const result = products.find(p => p.id === testItem.id);
            if (!result) {
                console.log(`- Test Case: ${testItem.name}`);
                console.log(`  ❌ NOT FOUND IN RESULTS`);
                return;
            }

            console.log(`- Test Case: ${testItem.name}`);
            console.log(`  Input Drive Bazar: ${testItem.bazar}`);
            console.log(`  Site isBazarFarm: ${!!result.isBazarFarm}`);
            console.log(`  Final Result Bazar Flag: ${!!result.bazar}`);
            
            const expectedBazar = !!(testItem.bazar && result.isBazarFarm);
            if (!!result.bazar === expectedBazar) {
                console.log('  ✅ SUCCESS');
            } else {
                console.log('  ❌ FAILED');
            }
            console.log('');
        });

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

verify();
