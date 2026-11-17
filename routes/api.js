'use strict';
const crypto = require('crypto');

const likes = {};  // shortcut: bellekte tutulur, kalıcılık gerekirse veritabanına taşı
const voters = {}; // sembol -> anonim (hash'lenmiş) IP kümesi

const anon = ip => crypto.createHash('sha256').update(String(ip)).digest('hex');

async function price(symbol) {
  const r = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`);
  const j = await r.json();
  return typeof j.latestPrice === 'number' ? j.latestPrice : null;
}

async function info(symbol, like, ip) {
  symbol = symbol.toUpperCase();
  likes[symbol] = likes[symbol] || 0;
  voters[symbol] = voters[symbol] || new Set();
  if (like && !voters[symbol].has(anon(ip))) {
    voters[symbol].add(anon(ip));
    likes[symbol]++;
  }
  return { stock: symbol, price: await price(symbol), likes: likes[symbol] };
}

module.exports = function (app) {
  app.route('/api/stock-prices').get(async (req, res) => {
    try {
      const like = req.query.like === 'true' || req.query.like === true;
      const ip = req.ip;
      const q = req.query.stock;
      if (Array.isArray(q)) {
        const [a, b] = await Promise.all(q.slice(0, 2).map(s => info(s, like, ip)));
        return res.json({ stockData: [
          { stock: a.stock, price: a.price, rel_likes: a.likes - b.likes },
          { stock: b.stock, price: b.price, rel_likes: b.likes - a.likes }] });
      }
      if (!q) return res.status(400).json({ error: 'stock required' });
      res.json({ stockData: await info(q, like, ip) });
    } catch (e) {
      res.status(500).json({ error: 'server error' });
    }
  });
};
