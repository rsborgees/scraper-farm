const { scrapeZZMall } = require('./scrapers/zzmall');
const { sendToWebhook } = require('./cronScheduler');
const { initBrowser } = require('./browser_setup');

(async () => {
    console.log('🚀 Iniciando coleta DIRETA do site ZZMall (3 produtos)...');

    const { browser, context } = await initBrowser();

    try {
        // Usa o scraper padrão que navega pelas categorias de promoção
        const products = await scrapeZZMall(3, browser);

        console.log(`📦 Coletados ${products.length} produtos.`);

        if (products.length > 0) {
            console.log('📤 Enviando para webhook...');
            await sendToWebhook(products);
            console.log('✅ Envio concluído com sucesso!');
        } else {
            console.log('❌ Nenhum produto encontrado nas páginas de promoção.');
        }

    } catch (err) {
        console.error('❌ Erro na coleta direta:', err.message);
    } finally {
        await browser.close();
        process.exit(0);
    }
})();
