const { sendToWebhook } = require('./cronScheduler');
const { getExistingIdsFromDrive } = require('./driveManager');
const { scrapeSpecificIdsGeneric } = require('./scrapers/idScanner');
const { initBrowser } = require('./browser_setup');
const { buildDressMessage } = require('./messageBuilder');
require('dotenv').config();

async function send10DressToFasted() {
    console.log('🚀 ENVIO MANUAL: 10 ITENS DRESS TO PRO WEBHOOK (FAST)');

    const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    // 1. Pega items do Drive
    console.log('📥 Lendo Drive...');
    const allDriveItems = await getExistingIdsFromDrive(GOOGLE_DRIVE_FOLDER_ID);
    const dressItems = allDriveItems.filter(i => i.store === 'dressto' && !i.bazar && !i.isFavorito && !i.novidade);
    
    // Pegamos os mais recentes do Drive para priorizar
    const candidates = dressItems.slice(0, 50);
    
    const { browser, context } = await initBrowser();
    
    try {
        console.log(`👗 Buscando candidatos Dress To...`);
        // Usamos maxAgeHours: 0 para ignorar o histórico apenas para esse teste/força bruta, 
        // ou 2 para pegar os muito recentes, vamos botar 24 para respeitar o que não foi enviado ontem
        const { products: scrapedItems } = await scrapeSpecificIdsGeneric(context, candidates, 'dressto', 10, { maxAgeHours: 24 });
        
        console.log(`\n📦 Produtos coletados: ${scrapedItems.length}`);
        
        if (scrapedItems.length > 0) {
            // Constrói mensagens
            scrapedItems.forEach(p => {
                p.message = buildDressMessage(p);
                p.loja = 'dressto';
            });

            console.log('📤 Enviando para o webhook...');
            const result = await sendToWebhook(scrapedItems);
            if (result.success) {
                console.log(`✅ ${scrapedItems.length} itens da Dress To enviados com sucesso ao webhook!`);
            } else {
                console.log('❌ Falha ao enviar para o webhook.');
            }
        } else {
            console.log('⚠️ Nenhum produto encontrado para enviar.');
        }
    } finally {
        await browser.close();
    }
}

send10DressToFasted();
