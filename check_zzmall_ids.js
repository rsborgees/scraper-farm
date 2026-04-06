const { getExistingIdsFromDrive } = require('./driveManager');

(async () => {
    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            console.error('GOOGLE_DRIVE_FOLDER_ID não configurada.');
            return;
        }

        const items = await getExistingIdsFromDrive(folderId);
        const zzmall = items.filter(i => i.store === 'zzmall');

        console.log(`\n📦 Total de itens ZZMall no Drive: ${zzmall.length}`);
        
        zzmall.slice(0, 10).forEach(i => {
            console.log(` - Item: "${i.name}" -> ID capturado: "${i.id}" (driveId: "${i.driveId}")`);
        });

    } catch (e) {
        console.error('Erro ao listar itens:', e.message);
    }
})();
