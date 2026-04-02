const { runAllScrapers } = require('./orchestrator');
const { sendToWebhook } = require('./cronScheduler');
require('dotenv').config();

async function send10DressTo() {
    console.log('🚀 ENVIO MANUAL: 10 ITENS DRESS TO PRO WEBHOOK');

    // Força apenas Dress To com quota 10
    const overrideQuotas = {
        farm: 0,
        dressto: 10,
        kju: 0,
        live: 0,
        zzmall: 0
    };

    try {
        const allProducts = await runAllScrapers(overrideQuotas);
        
        console.log(`\n📦 Produtos coletados: ${allProducts.length}`);
        
        if (allProducts.length > 0) {
            console.log('📤 Enviando para o webhook...');
            const result = await sendToWebhook(allProducts);
            if (result.success) {
                console.log('✅ 10 itens da Dress To enviados com sucesso ao webhook!');
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

send10DressTo();
