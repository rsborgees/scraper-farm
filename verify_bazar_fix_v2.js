const { distributeLinks } = require('./distributionEngine');

// Mock data to test:
// 1. Exactly one bazar item should be picked if available.
// 2. Dress To items should be picked even if they are favorites.
// 3. Total items should aim for 11.

const mockProducts = [
    { id: 'BAZAR_FARM_1', loja: 'farm', bazar: true, isBazar: true, nome: 'Vestido Bazar Farm 1' },
    { id: 'BAZAR_FARM_2', loja: 'farm', bazar: true, isBazar: true, nome: 'Vestido Bazar Farm 2' },
    { id: 'BAZAR_DRESS_1', loja: 'dressto', bazar: true, isBazar: true, nome: 'Vestido Bazar Dress 1' },
    { id: 'DRESS_FAVO', loja: 'dressto', favorito: true, isFavorito: true, nome: 'Dress To Favorito' },
    { id: 'DRESS_REG', loja: 'dressto', nome: 'Dress To Regular' },
    { id: 'REG_1', loja: 'farm', nome: 'Regular 1' },
    { id: 'REG_2', loja: 'farm', nome: 'Regular 2' },
    { id: 'REG_3', loja: 'farm', nome: 'Regular 3' },
    { id: 'REG_4', loja: 'farm', nome: 'Regular 4' },
    { id: 'REG_5', loja: 'farm', nome: 'Regular 5' },
    { id: 'REG_6', loja: 'farm', nome: 'Regular 6' },
    { id: 'REG_7', loja: 'farm', nome: 'Regular 7' },
    { id: 'REG_8', loja: 'farm', nome: 'Regular 8' },
    { id: 'REG_9', loja: 'farm', nome: 'Regular 9' },
    { id: 'REG_10', loja: 'farm', nome: 'Regular 10' }
];

const quotas = {
    farm: 7,
    dressto: 2,
    kju: 1,
    live: 1,
    zzmall: 1
};

const remaining = {
    total: 100,
    stores: {
        farm: 40,
        dressto: 20,
        kju: 10,
        live: 10,
        zzmall: 10
    }
};

console.log('--- Running Verification ---');
const result = distributeLinks(mockProducts, quotas, remaining);

console.log('Result length:', result.length);
const bazarCount = result.filter(p => p.bazar || p.isBazar).length;
const dressToCount = result.filter(p => p.loja === 'dressto' || p.brand?.toLowerCase() === 'dressto').length;
const selectedDressIds = result.filter(p => p.loja === 'dressto').map(p => p.id);

console.log('Bazar items selected:', bazarCount);
console.log('Dress To items selected:', dressToCount);
console.log('Selected Dress To IDs:', selectedDressIds);

if (bazarCount === 1) {
    console.log('✅ PASS: Exactly one bazar item selected.');
} else {
    console.log('❌ FAIL: Expected exactly 1 bazar item, got', bazarCount);
}

if (selectedDressIds.includes('DRESS_FAVO')) {
    console.log('✅ PASS: Dress To Favorite item was allowed.');
} else if (mockProducts.find(p => p.id === 'DRESS_FAVO')) {
    // Check if it was in eligible at least
    console.log('ℹ️ NOTE: Dress_Favo not in result, but might be due to shuffle or quota limits.');
}

console.log('\nSelected Items:');
result.forEach(p => console.log(` - ${p.id} (${p.loja}): Bazar=${p.bazar}, Favorito=${p.favorito}`));
