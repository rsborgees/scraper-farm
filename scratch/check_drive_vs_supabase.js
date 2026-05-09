const { getExistingIdsFromDrive } = require('../driveManager');
const { supabase } = require('../supabaseClient');
const { normalizeId } = require('../historyManager');
require('dotenv').config();

async function check() {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const driveItems = await getExistingIdsFromDrive(folderId);
    const novidades = driveItems.filter(item => (item.novidade || item.isNovidade) && !item.bazar);
    
    console.log(`📂 Novidades no Drive: ${novidades.length}`);
    
    const { data, error } = await supabase.from('produtos').select('id');
    if (error) {
        console.error('Erro Supabase:', error);
        return;
    }
    
    const supabaseIds = new Set(data.map(p => normalizeId(p.id)));
    console.log(`📊 IDs no Supabase: ${supabaseIds.size}`);
    
    const notInSupabase = novidades.filter(item => !supabaseIds.has(normalizeId(item.id)));
    console.log(`🎯 Novidades no Drive NÃO no Supabase: ${notInSupabase.length}`);
    
    if (notInSupabase.length > 0) {
        console.log('Exemplos:');
        notInSupabase.slice(0, 5).forEach(item => console.log(`- ${item.id} (${item.store})`));
    }
}

check();
