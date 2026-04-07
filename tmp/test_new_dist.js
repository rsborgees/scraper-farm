const { distributeLinks } = require('../distributionEngine');

// Mock data
const allProducts = [];
// 20 Farm Regular
for (let i = 0; i < 20; i++) {
    allProducts.push({ id: `f${i}`, loja: 'farm', nome: `Farm ${i}`, bazar: false });
}
// 5 Farm Bazar
for (let i = 0; i < 5; i++) {
    allProducts.push({ id: `fb${i}`, loja: 'farm', nome: `Farm Bazar ${i}`, bazar: true });
}
// 10 Dress To
for (let i = 0; i < 10; i++) {
    allProducts.push({ id: `d${i}`, loja: 'dressto', nome: `Dress ${i}`, bazar: false });
}

console.log('--- TEST 1: Bazar allowed (remaining > 0) ---');
const dailyRemaining1 = {
    stores: { farm: 100, dressto: 20, kju: 10, zzmall: 5 },
    bazar: 5
};
const quotas1 = { farm: 10, dressto: 2, kju: 0, zzmall: 0 };
const result1 = distributeLinks(allProducts, quotas1, dailyRemaining1);
console.log('Total selected:', result1.length);
console.log('Bazar count:', result1.filter(p => p.bazar).length);
console.log('Stores:', result1.reduce((acc, p) => { acc[p.loja] = (acc[acc[p.loja]] || 0) + 1; return acc; }, {}));

console.log('\n--- TEST 2: Bazar blocked (remaining = 0) ---');
const dailyRemaining2 = {
    stores: { farm: 100, dressto: 20, kju: 10, zzmall: 5 },
    bazar: 0
};
const result2 = distributeLinks(allProducts, quotas1, dailyRemaining2);
console.log('Total selected:', result2.length);
console.log('Bazar count:', result2.filter(p => p.bazar).length);
