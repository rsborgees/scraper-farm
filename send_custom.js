const { runAllScrapers } = require('./orchestrator');
const { sendToWebhook } = require('./cronScheduler');
require('dotenv').config();

async function sendCustom() {
    console.log('🚀 ENVIO MANUAL: 3 ZZ Mall e 15 Dress To PRO WEBHOOK');

    const overrideQuotas = {
        farm: 0,
        dressto: 15,
        kju: 0,
        live: 0,
        zzmall: 3
    };

    try {
        const allProducts = await runAllScrapers(overrideQuotas);
        
        console.log(`\n📦 Produtos coletados: ${allProducts.length}`);
        
        if (allProducts.length > 0) {
            console.log('📤 Enviando para o webhook...');
            const result = await sendToWebhook(allProducts);
            if (result && result.success) {
                console.log('✅ Itens enviados com sucesso ao webhook!');
            } else {
                console.log('❌ Falha ao enviar para o webhook.');
            }
        } else {
            console.log('⚠️ Nenhum produto encontrado para enviar.');
        }

    } catch (e) {
        console.error('❌ Erro no envio manual:', e);
    }
}

sendCustom();
