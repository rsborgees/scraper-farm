const { distributeLinks } = require('./distributionEngine');

// Mock data based on the log
const allProducts = [];
for (let i = 0; i < 25; i++) allProducts.push({ id: `F${i}`, loja: 'farm', nome: `Farm Item ${i}`, category: 'vestido' });
for (let i = 0; i < 25; i++) allProducts.push({ id: `K${i}`, loja: 'kju', nome: `Kju Item ${i}`, category: 'outros' });
for (let i = 0; i < 16; i++) allProducts.push({ id: `Z${i}`, loja: 'zzmall', nome: `ZZMall Item ${i}`, category: 'outros', novidade: true }); // ZZMall usually comes from Drive (novidade)
for (let i = 0; i < 11; i++) allProducts.push({ id: `L${i}`, loja: 'live', nome: `Live Item ${i}`, category: 'conjunto' });
for (let i = 0; i < 10; i++) allProducts.push({ id: `D${i}`, loja: 'dressto', nome: `DressTo Item ${i}`, category: 'vestido' });

const runQuotas = {
    farm: 7,
    dressto: 2,
    kju: 1,
    live: 1,
    zzmall: 1
};

const dailyRemaining = {
    stores: {
        farm: 100,
        dressto: 10,
        kju: 3,
        live: 10,
        zzmall: 3
    }
};

console.log('--- Testing DistributeLinks ---');
const result = distributeLinks(allProducts, runQuotas, dailyRemaining);

console.log('Selected Stores Count:');
const counts = {};
result.forEach(p => {
    counts[p.loja] = (counts[p.loja] || 0) + 1;
});
console.log(counts);

console.log('Selected Items:');
result.forEach(p => console.log(` - ${p.loja.toUpperCase()}: ${p.nome} (Novidade: ${!!p.novidade})`));
