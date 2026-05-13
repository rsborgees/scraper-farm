const { supabase } = require('../supabaseClient');

async function findYesterdayRange() {
    try {
        console.log('🔍 Buscando produtos com ID entre 25000 e 26000...');
        const { data, error } = await supabase
            .from('produtos')
            .select('id, nome, hora_entrada')
            .gte('id', 25000)
            .lte('id', 26000)
            .order('id', { ascending: false });

        if (error) throw error;
        
        console.log(`Encontrados ${data.length} itens no range.`);
        const dates = [...new Set(data.map(i => i.hora_entrada.split(' ')[0]))];
        console.log('Datas encontradas:', dates);

        if (data.length > 0) {
            console.log('Exemplos:');
            console.table(data.slice(0, 10));
            console.table(data.slice(-10));
        }
    } catch (err) {
        console.error(err);
    }
}

findYesterdayRange();
