const { getExistingIdsFromDrive } = require('./driveManager');
const { scrapeSpecificIdsGeneric } = require('./scrapers/idScanner');
const { sendToWebhook } = require('./cronScheduler');
const { initBrowser } = require('./browser_setup');

(async () => {
    console.log('🚀 Iniciando coleta de 3 produtos ZZMall do DRIVE...');

    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const driveItems = await getExistingIdsFromDrive(folderId);
        const zzmallDriveItems = driveItems.filter(i => i.store === 'zzmall');

        console.log(`📂 Encontrados ${zzmallDriveItems.length} itens ZZMall no Drive.`);

        if (zzmallDriveItems.length === 0) {
            console.log('❌ Nenhum item ZZMall encontrado no Drive.');
            return;
        }

        const { browser, context } = await initBrowser();

        // Tenta coletar 3 itens (aumentamos um pouco a amostragem se necessário)
        const result = await scrapeSpecificIdsGeneric(context, zzmallDriveItems, 'zzmall', 3);

        console.log(`📦 Coletados ${result.products.length} produtos do Drive.`);

        if (result.products.length > 0) {
            console.log('📤 Enviando para webhook...');
            await sendToWebhook(result.products);
            console.log('✅ Envio concluído!');
        } else {
            console.log('❌ Nenhum produto ZZMall do Drive pôde ser coletado do site.');
        }

        await browser.close();

    } catch (err) {
        console.error('❌ Erro na operação:', err.message);
    } finally {
        process.exit(0);
    }
})();
