// ============================================================
//  NekoChain —— 浏览器里的小小区块链喵
//  0 gas · 不用钱包 · SHA-256 工作量证明 · 数据只存在你自己的浏览器里
// ============================================================
(function (global) {
  'use strict';

  var cryptoObj = (typeof crypto !== 'undefined' && crypto.subtle)
    ? crypto
    : (typeof require !== 'undefined' ? require('crypto').webcrypto : null);

  function sha256hex(str) {
    var buf = cryptoObj.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return buf.then(function (arr) {
      var bytes = new Uint8Array(arr);
      var out = '';
      for (var i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
      return out;
    });
  }

  // 确定性随机数喵:同一块哈希永远生出同一只猫娘
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function headerString(b) {
    return b.i + '|' + b.p + '|' + b.t + '|' + b.n + '|' + JSON.stringify(b.tx);
  }

  function clamp(v, lo, hi) {
    lo = lo == null ? 0 : lo;
    hi = hi == null ? 100 : hi;
    return Math.max(lo, Math.min(hi, Math.round(v)));
  }

  // ---------- IndexedDB 小仓库喵 ----------
  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('nekonya', 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('chain')) db.createObjectStore('chain', { keyPath: 'i' });
        if (!db.objectStoreNames.contains('cats')) db.createObjectStore('cats', { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  var NekoChain = {
    DIFFICULTY: 3,   // 哈希前导零个数(16进制)喵,3个≈平均挖4096次
    GAS_PRICE: 0,    // 喵,穷人的快乐:0 gas
    blocks: [],
    cats: {},
    selectedId: null,

    // ---------- 创世块喵 ----------
    async genesis() {
      if (this.blocks.length > 0) return this.blocks[0];
      var b = {
        i: 0,
        p: '0'.repeat(64),
        t: Date.now(),
        n: 0,
        tx: { t: 'genesis', msg: '第一窝小猫娘诞生啦' }
      };
      b.h = await sha256hex(headerString(b));
      this.blocks.push(b);
      await this.save();
      return b;
    },

    last() { return this.blocks[this.blocks.length - 1]; },

    // ---------- 挖矿(工作量证明)喵 ----------
    async mine(tx, onProgress) {
      var prev = this.last();
      var i = prev.i + 1;
      var target = '0'.repeat(this.DIFFICULTY);
      var n = 0, guard = 0;
      while (true) {
        n++; guard++;
        var cand = { i: i, p: prev.h, t: Date.now(), n: n, tx: tx };
        var h = await sha256hex(headerString(cand));
        if (onProgress && n % 64 === 0) onProgress(n);
        if (h.indexOf(target) === 0) {
          cand.h = h;
          this.blocks.push(cand);
          await this.save();
          return cand;
        }
        if (guard > 500000) throw new Error('挖矿超时喵…(50万nonce还没挖到)');
      }
    },

    // ---------- 由块哈希派生猫娘基因(确定性喵) ----------
    genomeFromHash(h) {
      var N = global.NEKO_NAMES;
      var rnd = mulberry32(parseInt(h.slice(0, 8), 16));
      var pick = function (arr) { return arr[Math.floor(rnd() * arr.length)]; };
      var r = parseInt(h.slice(16, 20), 16) / 65535;
      var rarity = r < 0.80 ? 'common' : r < 0.92 ? 'rare' : r < 0.985 ? 'epic' : 'legend';
      var name = pick(N.ATTRS) + pick(N.ENTITY) + pick(N.SUFFIXES);
      return {
        name: name,
        hair: pick(N.PALETTE.hair),
        eyes: pick(N.PALETTE.eyes),
        outfit: pick(N.PALETTE.outfit),
        accent: pick(N.PALETTE.accent),
        blush: pick(N.PALETTE.blush),
        bg: pick(N.PALETTE.bg),
        accessory: pick(N.ACCESORIES),
        trait: pick(N.TRAITS),
        personality: pick(N.PERSONALITIES),
        rarity: rarity,
        seed: h.slice(0, 8)
      };
    },

    // ---------- 出生喵:挖一块,生一只 ----------
    async birth(onProgress) {
      var block = await this.mine({ t: 'birth' }, onProgress);
      var g = this.genomeFromHash(block.h);
      var cat = {
        id: block.h.slice(0, 12),
        name: g.name,
        born: block.i,
        genome: g,
        stats: { full: 80, love: 0, mood: 90, clean: 100 },
        actions: 0,
        level: 1
      };
      this.cats[cat.id] = cat;
      this.selectedId = cat.id;
      await this.save();
      return { block: block, cat: cat };
    },

    ACTION_EFFECTS: {
      feed:  { full: +30, mood: +8,  love: +2, clean: 0,   label: '喂食' },
      pet:   { full: 0,   mood: +6,  love: +8, clean: 0,   label: '摸摸' },
      play:  { full: -8,  mood: +12, love: +5, clean: -4,  label: '玩耍' },
      bathe: { full: 0,   mood: +4,  love: +3, clean: +35, label: '洗澡' },
      sleep: { full: +20, mood: +15, love: +3, clean: -2,  label: '睡觉' }
    },

    // 每出一个块,所有猫娘都会饿一点点、心情降一点点喵
    decayAll() {
      for (var id in this.cats) {
        var s = this.cats[id].stats;
        s.full = clamp(s.full - 5);
        s.mood = clamp(s.mood - 4);
        s.clean = clamp(s.clean - 3);
      }
    },

    // ---------- 养猫娘喵:每种动作都是一笔上链交易 ----------
    async act(action, onProgress) {
      var cat = this.cats[this.selectedId];
      if (!cat) throw new Error('先生一只小猫娘喵!');
      var eff = this.ACTION_EFFECTS[action];
      if (!eff) throw new Error('未知动作喵');
      var block = await this.mine(
        { t: 'act', cat: cat.id, a: action, n: cat.name },
        onProgress
      );
      this.decayAll();
      var s = cat.stats;
      s.full = clamp(s.full + eff.full);
      s.mood = clamp(s.mood + eff.mood);
      s.love = clamp(s.love + eff.love, 0, 9999);
      s.clean = clamp(s.clean + eff.clean);
      cat.actions++;
      cat.level = 1 + Math.floor(Math.sqrt(s.love) / 2);
      await this.save();
      return { block: block, cat: cat };
    },

    // ---------- 改名喵(也是一笔上链交易) ----------
    async rename(newName, onProgress) {
      var cat = this.cats[this.selectedId];
      if (!cat) throw new Error('先生一只小猫娘喵!');
      var block = await this.mine(
        { t: 'rename', cat: cat.id, n: newName },
        onProgress
      );
      cat.name = String(newName).slice(0, 12);
      this.decayAll();
      await this.save();
      return { block: block, cat: cat };
    },

    titleFor(level) {
      if (level <= 2) return '奶猫';
      if (level <= 5) return '少女';
      if (level <= 9) return '大小姐';
      if (level <= 14) return '猫娘大人';
      return '传说猫娘';
    },

    // ---------- 验链喵:重算每一块哈希 ----------
    async verify() {
      for (var i = 1; i < this.blocks.length; i++) {
        var b = this.blocks[i], prev = this.blocks[i - 1];
        var h = await sha256hex(headerString(b));
        if (h !== b.h) return { ok: false, at: i, why: 'hash' };
        if (b.p !== prev.h) return { ok: false, at: i, why: 'prev' };
      }
      return { ok: true, len: this.blocks.length };
    },

    // ---------- 持久化喵 ----------
    async save() {
      if (typeof indexedDB === 'undefined') return;
      var db = await openDb();
      var tx = db.transaction(['chain', 'cats'], 'readwrite');
      var chainStore = tx.objectStore('chain');
      var catStore = tx.objectStore('cats');
      for (var i = 0; i < this.blocks.length; i++) chainStore.put(this.blocks[i]);
      for (var id in this.cats) catStore.put(this.cats[id]);
      await new Promise(function (res, rej) {
        tx.oncomplete = res;
        tx.onerror = function () { rej(tx.error); };
      });
    },

    async load() {
      if (typeof indexedDB === 'undefined') return false;
      var db = await openDb();
      var tx = db.transaction(['chain', 'cats'], 'readonly');
      var blocks = await reqToPromise(tx.objectStore('chain').getAll());
      var catList = await reqToPromise(tx.objectStore('cats').getAll());
      this.blocks = blocks.sort(function (a, b) { return a.i - b.i; });
      this.cats = {};
      catList.forEach(function (c) { this.cats[c.id] = c; }, this);
      if (catList.length) this.selectedId = catList[catList.length - 1].id;
      return this.blocks.length > 0;
    },

    async reset() {
      if (typeof indexedDB !== 'undefined') {
        var db = await openDb();
        var tx = db.transaction(['chain', 'cats'], 'readwrite');
        tx.objectStore('chain').clear();
        tx.objectStore('cats').clear();
        await new Promise(function (res, rej) {
          tx.oncomplete = res;
          tx.onerror = function () { rej(tx.error); };
        });
      }
      this.blocks = [];
      this.cats = {};
      this.selectedId = null;
      await this.genesis();
    }
  };

  global.NekoChain = NekoChain;
  global.__sha256hex = sha256hex; // 测试用喵
})(typeof window !== 'undefined' ? window : globalThis);