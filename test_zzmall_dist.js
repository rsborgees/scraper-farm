const { distributeLinks } = require('./distributionEngine');

const mockProducts = [
    { id: 'ZZ1', loja: 'zzmall', nome: 'Bolsa ZZMall', novidade: true, category: 'outros' },
    { id: 'F1', loja: 'farm', nome: 'Vestido Farm', category: 'vestido' },
    { id: 'F2', loja: 'farm', nome: 'Saia Farm', category: 'saia' }
];

const runQuotas = {
    zzmall: 1,
    farm: 2
};

const dailyRemaining = {
    stores: {
        zzmall: 3,
        farm: 100
    }
};

const result = distributeLinks(mockProducts, runQuotas, dailyRemaining);

console.log('Final Selection:');
result.forEach(p => console.log(` - ${p.nome} (loja: ${p.loja}, novidade: ${p.novidade})`));
