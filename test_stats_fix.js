const { getSupabaseStats } = require('./cronScheduler');
require('dotenv').config();

async function testStats() {
    console.log('🧪 Testando nova lógica de contagem do Supabase...');
    const stats = await getSupabaseStats();
    console.log('\n📊 Estatísticas Reportadas:');
    console.log(`   Total Hoje: ${stats.total}`);
    console.log(`   Por Loja:`, stats.stores);
    process.exit(0);
}

testStats();
