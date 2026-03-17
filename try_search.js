const { initBrowser } = require('./browser_setup');

(async () => {
    const { browser, context } = await initBrowser();
    const page = await context.newPage();
    try {
        console.log("Navigating...");
        await page.goto('https://www.farmrio.com.br/360662', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const url = page.url();
        console.log("Redirected to:", url);
    } catch(e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
