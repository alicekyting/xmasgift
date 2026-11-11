// POST /api/gift  { action: 'status' | 'submit' | 'reveal' | 'reset', slot, pin, adjs, key }
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const N = parseInt(process.env.PLAYERS || '8', 10);
const KEY = 'xmas-gift-swap';

async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify(cmd) });
  return (await r.json()).result;
}
const load = async () => { const v = await redis(['GET', KEY]); return v ? JSON.parse(v) : { subs: {}, draw: null }; };
const save = (s) => redis(['SET', KEY, JSON.stringify(s)]);

// random derangement: nobody gets their own adjectives
function derange(ids) {
  let p;
  do {
    p = [...ids];
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  } while (p.some((x, i) => x === ids[i]));
  return Object.fromEntries(ids.map((id, i) => [id, p[i]])); // giver -> whose adjectives they receive
}

module.exports = async (req, res) => {
  try {
    if (!URL_ || !TOKEN) return res.status(500).json({ error: '未連接 Upstash Redis（睇 README）' });
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const s = await load();

    if (b.action === 'reset') {
      if (!process.env.RESET_KEY || b.key !== process.env.RESET_KEY) return res.status(403).json({ error: '無權限' });
      await save({ subs: {}, draw: null });
      return res.json({ ok: true });
    }

    const slot = String(parseInt(b.slot, 10));
    const pin = String(b.pin || '');
    const valid = +slot >= 1 && +slot <= N;
    const me = valid ? s.subs[slot] : null;
    const authed = !!me && me.pin === pin;

    if (b.action === 'submit') {
      if (!valid) return res.status(400).json({ error: '號碼唔啱' });
      if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN 要 4 個數字' });
      if (s.draw) return res.status(403).json({ error: '已經抽咗，唔可以再改' });
      if (me && !authed) return res.status(403).json({ error: '呢個號碼已有人用，PIN 唔啱' });
      const adjs = (Array.isArray(b.adjs) ? b.adjs : []).map((x) => String(x).trim().slice(0, 20));
      if (adjs.length !== 3 || adjs.some((x) => !x)) return res.status(400).json({ error: '要填滿 3 個形容詞' });
      s.subs[slot] = { pin, adjs };
      await save(s);
    }

    let got = null;
    if (b.action === 'reveal') {
      if (!authed) return res.status(403).json({ error: '先用你嘅號碼同 PIN 提交形容詞' });
      if (Object.keys(s.subs).length < N && !s.draw) return res.status(400).json({ error: '仲未齊人' });
      if (!s.draw) { s.draw = derange(Object.keys(s.subs).sort((a, c) => a - c)); await save(s); }
    }
    if (s.draw && authed) got = s.subs[s.draw[slot]].adjs;

    res.json({ n: N, done: Object.keys(s.subs).map(Number), drawn: !!s.draw, mine: authed ? me.adjs : null, got });
  } catch (e) {
    res.status(500).json({ error: '伺服器出事：' + e.message });
  }
};
