require('dotenv').config();
const axios = require('axios');
const { runAllScrapers } = require('./orchestrator');

const WEBHOOK_URL = 'https://n8n-francalheira.vlusgm.easypanel.host/webhook/1959ec08-24d1-4402-b458-8b56b8211caa';

(async () => {
    console.log("Iniciando forçando envio de 15 produtos da Dress To...");
    const overrideQuotas = {
        farm: 0,
        dressto: 15,
        kju: 0,
        live: 0,
        zzmall: 0
    };
    const fakeRemaining = {
        total: 999,
        stores: {
            farm: 0,
            dressto: 99,
            live: 0,
            kju: 0,
            zzmall: 0
        }
    };
    
    try {
        const products = await runAllScrapers(overrideQuotas, fakeRemaining);
        
        if (products.length > 0) {
            console.log(`\n📤 Enviando ${products.length} produtos para webhook...`);
            
            const payload = {
                timestamp: new Date().toISOString(),
                totalProducts: products.length,
                products: products,
                summary: { dressto: products.length }
            };
            
            const res = await axios.post(WEBHOOK_URL, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });
            console.log(`✅ Enviado! Status: ${res.status}`);
        } else {
            console.log(`\n❌ Nenhum produto obtido.`);
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
