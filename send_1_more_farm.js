require('dotenv').config();
const { getExistingIdsFromDrive } = require('./driveManager');
const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');
const { sendToWebhook } = require('./cronScheduler');
const { initBrowser } = require('./browser_setup');
const { isDuplicate, normalizeId, markAsSent } = require('./historyManager');

async function run() {
    console.log('🚀 [FARM] Buscando 1 produto adicional para completar 10...');
    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const allDriveItems = await getExistingIdsFromDrive(folderId);
        
        // Filtra itens normais da farm que não foram enviados recentemente
        const farmItems = allDriveItems.filter(i => 
            i.store === 'farm' && 
            !i.bazar && 
            !isDuplicate(normalizeId(i.id))
        );

        if (farmItems.length === 0) {
            console.log('❌ [FARM] Nenhum item adicional encontrado no Drive.');
            return;
        }

        // Pega o primeiro
        const candidate = farmItems[0];
        console.log(`🔍 [FARM] Candidato selecionado: ${candidate.id}`);

        const { browser, context } = await initBrowser();
        try {
            const scrapeResult = await scrapeSpecificIds(context, [candidate], 1, { maxAgeHours: 0 });
            const products = scrapeResult.products || [];

            if (products.length > 0) {
                console.log(`✅ [FARM] 1 produto adicional encontrado: ${products[0].nome}`);
                const result = await sendToWebhook(products);
                if (result.success) {
                    markAsSent([normalizeId(products[0].id)]);
                    console.log('✅ [FARM] Produto adicional enviado com sucesso!');
                }
            } else {
                console.log('❌ [FARM] Falha ao coletar dados do produto adicional.');
            }
        } finally {
            await browser.close();
        }
    } catch (err) {
        console.error('❌ [FARM] Erro:', err.message);
    }
}

run();
