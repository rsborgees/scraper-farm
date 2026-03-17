require('dotenv').config();
const { scrapeLive } = require('./scrapers/live/index');

async function testLive() {
    console.log('🧪 Iniciando Teste do Scraper: LIVE (Quota: 1)');
    console.log('==================================================');
    
    // Mostra as variáveis de ambiente carregadas para proxy
    console.log('Variáveis de Proxy detectadas (se houver):');
    console.log('PROXY_SERVER:', process.env.PROXY_SERVER ? process.env.PROXY_SERVER : 'Não configurado (IP Direto)');
    console.log('PROXY_USERNAME:', process.env.PROXY_USERNAME ? '***' : 'Não configurado');
    console.log('HEADLESS Mode:', process.env.HEADLESS !== 'false' ? 'Ativado' : 'Desativado');
    console.log('==================================================\n');

    try {
        // Roda o scraper com Quota de 1 produto falso (ignora duplicatas no teste)
        const result = await scrapeLive(1, true);

        console.log('\n✅ RESULTADO DO TESTE:\n');
        
        if (result && result.length > 0) {
            console.log(`Sucesso! Encontrou ${result.length} produto(s).`);
            console.log('Dados do produto extraído:');
            console.log(JSON.stringify(result[0], null, 2));
        } else {
            console.log('❌ Falha ou bloqueio: Nenhum produto foi retornado.');
            console.log('Verifique a pasta "debug" para screenshots do momento do bloqueio.');
        }

    } catch (error) {
        console.error('\n❌ ERRO FATAL DURANTE A EXECUÇÃO:', error.message);
    }
}

testLive();
