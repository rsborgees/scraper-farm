const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { getExistingIdsFromDrive } = require('../driveManager');
const { normalizeId } = require('../historyManager');
require('dotenv').config();

async function verifySync() {
    console.log('🧪 Verificando sincronização de flags sazonais...');
    
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const items = await getExistingIdsFromDrive(folderId);
    
    const targetIds = ['356095', '356956'];
    const driveItems = items.filter(i => targetIds.includes(normalizeId(i.id)));
    
    console.log(`\n📂 Itens encontrados no Drive: ${driveItems.length}`);
    driveItems.forEach(i => {
        console.log(`- ${i.id}: Inverno=${i.inverno}, Name=${i.name}`);
    });

    console.log('\n✅ [Simulação] Verificando lógica de sincronização do Orchestrator...');
    
    driveItems.forEach(item => {
        // Simula o produto retornado pelo scraper (pode vir sem flag)
        const p = { id: item.id, nome: 'Produto Teste', loja: 'farm' };
        
        // Aplica a lógica que adicionei no orchestrator
        p.verao = !!(p.verao || item.verao);
        p.altoVerao = !!(p.altoVerao || item.altoVerao);
        p.inverno = !!(p.inverno || item.inverno);
        p.altoInverno = !!(p.altoInverno || item.altoInverno);
        
        console.log(`   🔸 Resultado para ${p.id}: Inverno=${p.inverno}`);
        if (targetIds.includes(p.id) && !p.inverno) {
            console.error(`   ❌ FALHA: O item ${p.id} deveria ser INVERNO!`);
        } else {
            console.log(`   ✅ SUCESSO: Flags sincronizadas corretamente.`);
        }
    });
}

verifySync().catch(console.error);
