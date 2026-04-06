const { runAllScrapers } = require('./orchestrator');
const { sendToWebhook } = require('./cronScheduler');

(async () => {
    console.log('🚀 Enviando 3 produtos ZZMall para Webhook...');

    // Forçamos a quota de ZZMall para 3 e as outras para 0
    const overrideQuotas = {
        farm: 0,
        dressto: 0,
        kju: 0,
        live: 0,
        zzmall: 3
    };

    // Necessário para o orchestrator não filtrar por saldo diário (ou forçar saldo)
    const remainingOverrides = {
        total: 3,
        stores: {
            farm: 0,
            dressto: 0,
            kju: 0,
            live: 0,
            zzmall: 3
        }
    };

    const products = await runAllScrapers(overrideQuotas, remainingOverrides);

    console.log(`📦 Coletados ${products.length} produtos para envio.`);

    if (products.length > 0) {
        await sendToWebhook(products);
        console.log('✅ Envio concluído!');
    } else {
        console.log('❌ Nenhum produto ZZMall encontrado para enviar.');
    }

    process.exit(0);
})();
