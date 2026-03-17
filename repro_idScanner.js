const { initBrowser } = require('./browser_setup');
const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');

(async () => {
    const { browser, context } = await initBrowser();
    const driveItems = [
        { id: '360662', store: 'farm', isFavorito: false, novidade: false, bazar: false },
        { id: '362254', store: 'farm', isFavorito: false, novidade: false, bazar: false }
    ];
    try {
        const result = await scrapeSpecificIds(context, driveItems, 999, { maxAgeHours: 0 });
        console.log(JSON.stringify(result, null, 2));
    } finally {
        await browser.close();
    }
})();
