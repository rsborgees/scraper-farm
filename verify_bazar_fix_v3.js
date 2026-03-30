const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');
const { initBrowser } = require('./browser_setup');

async function verify() {
    const { browser, context } = await initBrowser();
    
    try {
        // Test Cases
        const testItems = [
            {
                id: '350634_07431', // Real Bazar item
                bazar: true,
                name: 'Bazar + Site OK'
            },
            {
                id: '357038_09040', // Real Regular item
                bazar: true,
                name: 'Bazar in Drive + Non-Bazar Site (Should be FALSE)'
            },
            {
                id: '350634_07431', // Real Bazar item
                bazar: false,
                name: 'Regular in Drive + Bazar Site (Should be FALSE)'
            }
        ];

        console.log('🚀 Starting Verification...\n');

        const { products } = await scrapeSpecificIds(context, testItems, 10);

        console.log('\n📊 RESULTS:');
        products.forEach((p) => {
            const originalItem = testItems.find(it => {
                const normP = p.id.replace(/\D/g, '');
                const normIt = it.id.replace(/\D/g, '');
                return normP.includes(normIt) || normIt.includes(normP);
            });
            
            if (!originalItem) return;

            console.log(`- Test Case: ${originalItem.name}`);
            console.log(`  Input Drive Bazar: ${originalItem.bazar}`);
            console.log(`  Site isBazarFarm: ${!!p.isBazarFarm}`);
            console.log(`  Final Result Bazar Flag: ${!!p.bazar}`);
            
            const expectedBazar = !!(originalItem.bazar && p.isBazarFarm);
            if (!!p.bazar === expectedBazar) {
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
