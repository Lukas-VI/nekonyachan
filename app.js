// ============================================================
//  NekoNyaChan 主程序喵 —— 把链、猫娘、界面粘在一起
//  纯原生 JS,无依赖,打开就玩喵
// ============================================================
(function () {
  'use strict';

  var chain = window.NekoChain;
  var RARITY = {
    common:   { zh: '普通',  cls: 'r-common',   star: '☆' },
    rare:     { zh: '稀有',  cls: 'r-rare',     star: '★' },
    epic:     { zh: '史诗',  cls: 'r-epic',     star: '✦' },
    legend:   { zh: '传说',  cls: 'r-legend',   star: '❀' }
  };

  // ---------- 喵叫合成器(WebAudio)喵 ----------
  var meow = {
    ctx: null,
    ensure: function () {
      if (!this.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      return this.ctx;
    },
    play: function (pitch) {
      var ctx = this.ensure();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      var o2 = ctx.createOscillator();
      var g2 = ctx.createGain();
      o.type = 'sawtooth';
      o2.type = 'sine';
      var f = 400 + (pitch || 0) * 300 + Math.random() * 60;
      o.frequency.setValueAtTime(f * 1.4, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.75, t + 0.28);
      o2.frequency.setValueAtTime(f * 2.1, t);
      o2.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.25);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.05, t + 0.04);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(ctx.destination);
      o2.connect(g2).connect(ctx.destination);
      o.start(t); o2.start(t);
      o.stop(t + 0.34); o2.stop(t + 0.24);
    }
  };

  // ---------- DOM 缓存喵 ----------
  var el = {
    svg: document.getElementById('cat-svg'),
    name: document.getElementById('cat-name'),
    title: document.getElementById('cat-title'),
    rarity: document.getElementById('cat-rarity'),
    trait: document.getElementById('cat-trait'),
    personality: document.getElementById('cat-personality'),
    level: document.getElementById('cat-level'),
    actions: document.getElementById('cat-actions'),
    birth: document.getElementById('cat-birth'),
    stats: document.getElementById('stats'),
    actionsBar: document.getElementById('actions'),
    hutch: document.getElementById('hutch-grid'),
    hutchCount: document.getElementById('hutch-count'),
    blocks: document.getElementById('block-list'),
    blockCount: document.getElementById('block-count'),
    hashChain: document.getElementById('hash-chain'),
    birthBtn: document.getElementById('birth-btn'),
    mineInfo: document.getElementById('mine-info'),
    nameLab: document.getElementById('name-lab'),
    nameLabBtn: document.getElementById('name-lab-btn'),
    nameLabCopy: document.getElementById('name-lab-copy'),
    verifyBtn: document.getElementById('verify-btn'),
    verifyResult: document.getElementById('verify-result'),
    resetBtn: document.getElementById('reset-btn'),
    netTag: document.getElementById('net-tag'),
    log: document.getElementById('log')
  };

  // ---------- 状态计算喵 ----------
  function moodOf(cat) {
    var s = cat.stats;
    if (s.mood < 25) return 'sleepy';
    if (s.full < 20) return 'hungry';
    if (s.mood > 85 && s.full > 60) return 'happy';
    return 'normal';
  }

  function fmtBlock(b) {
    return '#' + b.i + '  ' + b.n + ' 次算力  前导零 ' + (b.h.match(/^0+/) || [''])[0].length;
  }

  // ---------- 渲染喵 ----------
  function renderCat(animate) {
    var cat = chain.cats[chain.selectedId];
    if (!cat) {
      el.svg.innerHTML =
        '<div class="empty-cat">' +
        '<div class="empty-cat-ear">▍</div>' +
        '<div class="empty-cat-face">🐱</div>' +
        '<p>窝还是空的喵…</p><p>点下面那颗大大的粉色按钮,</p><p>挖一块区块,生一只小猫娘喵!</p>' +
        '</div>';
      el.name.textContent = '——';
      el.title.textContent = '';
      el.rarity.textContent = '';
      el.trait.textContent = '';
      el.personality.textContent = '';
      el.level.textContent = 'Lv.0';
      el.actions.textContent = '0 次互动';
      el.birth.textContent = '尚未出生';
      el.stats.innerHTML = '';
      el.actionsBar.innerHTML = '';
      return;
    }
    var mood = moodOf(cat);
    el.svg.innerHTML = window.catGirlSVG(cat, mood, animate);
    el.name.textContent = cat.name;
    el.title.textContent = chain.titleFor(cat.level);
    var r = RARITY[cat.genome.rarity] || RARITY.common;
    el.rarity.textContent = r.star + ' ' + r.zh;
    el.rarity.className = 'rarity ' + r.cls;
    el.trait.textContent = '天赋:' + cat.genome.trait;
    el.personality.textContent = '性格:' + cat.genome.personality;
    el.level.textContent = 'Lv.' + cat.level + ' ' + chain.titleFor(cat.level);
    el.actions.textContent = cat.actions + ' 次互动';
    el.birth.textContent = '出生于区块 #' + cat.born;
    el.stats.innerHTML = bar('饱食', cat.stats.full, '#7cc4f5') +
      bar('心情', cat.stats.mood, '#f5a6c9') +
      bar('清洁', cat.stats.clean, '#95d5b2') +
      bar(' affection', cat.stats.love, '#ffd166');
    el.actionsBar.innerHTML =
      actBtn('feed', '🐟 喂食小鱼干', '#7cc4f5') +
      actBtn('pet', '🫳 摸摸头', '#f5a6c9') +
      actBtn('play', '🎀 一起玩耍', '#c9a6f5') +
      actBtn('bathe', '🛁 洗澡', '#95d5b2') +
      actBtn('sleep', '😴 睡觉', '#b8c4e8');
  }

  function bar(label, v, color) {
    return '<div class="stat-row"><span class="stat-label">' + label + '</span>' +
      '<div class="stat-track"><div class="stat-fill" style="width:' + v + '%;background:' + color + '"></div></div>' +
      '<span class="stat-num">' + v + '</span></div>';
  }

  function actBtn(key, label, color) {
    return '<button class="act-btn" data-act="' + key + '" style="--c:' + color + '">' + label + '</button>';
  }

  function renderHutch() {
    var cats = Object.keys(chain.cats).map(function (id) { return chain.cats[id]; })
      .sort(function (a, b) { return a.born - b.born; });
    el.hutchCount.textContent = cats.length;
    if (!cats.length) {
      el.hutch.innerHTML = '<div class="empty-cat small"><p>还没有小猫娘喵</p></div>';
      return;
    }
    el.hutch.innerHTML = cats.map(function (c) {
      var sel = c.id === chain.selectedId ? ' selected' : '';
      var r = RARITY[c.genome.rarity] || RARITY.common;
      return '<div class="hutch-card' + sel + '" data-id="' + c.id + '">' +
        '<div class="hutch-svg">' + window.catGirlSVG(c, 'normal', false) + '</div>' +
        '<div class="hutch-name">' + c.name + '</div>' +
        '<div class="hutch-rarity ' + r.cls + '">' + r.star + '</div>' +
        '<div class="hutch-birth">#' + c.born + '</div>' +
        '</div>';
    }).join('');
  }

  function renderBlocks() {
    var bs = chain.blocks.slice().reverse().slice(0, 20);
    el.blockCount.textContent = chain.blocks.length;
    el.hashChain.textContent = chain.blocks.length
      ? chain.blocks[0].h.slice(0, 10) + ' → ' + chain.blocks[1].h.slice(0, 10) + ' → …'
      : '';
    el.blocks.innerHTML = bs.map(function (b) {
      var tx = b.tx;
      var what = tx.t === 'genesis' ? '🌸 创世' :
        tx.t === 'birth' ? '🐾 生了猫娘' :
        tx.t === 'act' ? ({ feed: '🐟 喂食', pet: '🫳 摸摸', play: '🎀 玩耍', bathe: '🛁 洗澡', sleep: '😴 睡觉' }[tx.a] || '🔧 动作') + ' ' + tx.n :
        '✏️ 改名叫 ' + tx.n;
      return '<div class="block-row">' +
        '<span class="block-i">#' + b.i + '</span>' +
        '<span class="block-tx">' + what + '</span>' +
        '<span class="block-n">n=' + b.n + '</span>' +
        '<span class="block-hash">' + b.h.slice(0, 16) + '…</span>' +
        '</div>';
    }).join('');
  }

  function renderAll(animate) {
    renderCat(animate);
    renderHutch();
    renderBlocks();
  }

  // ---------- 喵语日志喵 ----------
  function logLine(msg, cls) {
    var li = document.createElement('li');
    li.textContent = msg;
    if (cls) li.className = cls;
    el.log.insertBefore(li, el.log.firstChild);
    while (el.log.children.length > 40) el.log.removeChild(el.log.lastChild);
  }

  // ---------- 忙碌锁喵 ----------
  var busy = false;
  function setBusy(v) {
    busy = v;
    el.birthBtn.disabled = v;
    if (el.actionsBar.innerHTML) {
      Array.prototype.forEach.call(el.actionsBar.querySelectorAll('.act-btn'), function (b) { b.disabled = v; });
    }
  }

  function mineProgress(n) {
    el.mineInfo.textContent = '⛏ 第 ' + n + ' 次试挖哈希中…(目标:前导 ' + chain.DIFFICULTY + ' 个 0)';
  }

  // ---------- 出生一只喵 ----------
  el.birthBtn.addEventListener('click', function () {
    if (busy) return;
    setBusy(true);
    chain.birth(mineProgress).then(function (res) {
      var c = res.cat, g = c.genome;
      var r = RARITY[g.rarity] || RARITY.common;
      renderAll(true);
      meow.play(2);
      logLine('✨ 区块 #' + res.block.i + ' 挖通啦!生了一只「' + c.name + '」(' + r.zh + ')喵!', 'good');
      if (g.rarity === 'legend') logLine('🌟 传说猫娘!!!全窝都来看!!', 'legend');
    }).catch(function (e) {
      logLine('⚠ 挖矿失败:' + e.message, 'bad');
    }).finally(function () {
      setBusy(false);
      el.mineInfo.textContent = '';
    });
  });

  // ---------- 养猫娘喵 ----------
  el.actionsBar.addEventListener('click', function (e) {
    var btn = e.target.closest('.act-btn');
    if (!btn || busy) return;
    var act = btn.dataset.act;
    setBusy(true);
    chain.act(act, mineProgress).then(function (res) {
      renderAll(true);
      meow.play(act === 'feed' ? 0 : act === 'pet' ? 1 : act === 'play' ? 3 : act === 'sleep' ? -1 : 1);
      logLine('🧾 区块 #' + res.block.i + ' 上链:' + chain.ACTION_EFFECTS[act].label + '「' + res.cat.name + '」,' +
        '饱食 ' + res.cat.stats.full + ' / 心情 ' + res.cat.stats.mood + ' / 清洁 ' + res.cat.stats.clean, '');
    }).catch(function (err) {
      logLine('⚠ ' + err.message, 'bad');
    }).finally(function () {
      setBusy(false);
      el.mineInfo.textContent = '';
    });
  });

  // ---------- 猫窝点选喵 ----------
  el.hutch.addEventListener('click', function (e) {
    var card = e.target.closest('.hutch-card');
    if (!card) return;
    chain.selectedId = card.dataset.id;
    chain.save();
    renderCat(true);
    renderHutch();
    meow.play(1);
    logLine('🐾 现在在抱「' + chain.cats[chain.selectedId].name + '」喵', '');
  });

  // ---------- 名字实验室喵 ----------
  el.nameLabBtn.addEventListener('click', function () {
    var N = window.NEKO_NAMES;
    var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    var name = pick(N.ATTRS) + pick(N.ENTITY) + pick(N.SUFFIXES);
    el.nameLab.textContent = name;
  });

  el.nameLabCopy.addEventListener('click', function () {
    var name = el.nameLab.textContent;
    if (!name) return;
    var cat = chain.cats[chain.selectedId];
    if (!cat) { logLine('⚠ 先生一只猫娘再改名喵!', 'bad'); return; }
    if (busy) return;
    setBusy(true);
    chain.rename(name, mineProgress).then(function (res) {
      renderAll(true);
      meow.play(1);
      logLine('✏️ 区块 #' + res.block.i + ' 上链:「' + cat.name + '」改名叫「' + res.cat.name + '」了喵!', 'good');
    }).catch(function (e) {
      logLine('⚠ ' + e.message, 'bad');
    }).finally(function () {
      setBusy(false);
      el.mineInfo.textContent = '';
    });
  });

  // ---------- 验链喵 ----------
  el.verifyBtn.addEventListener('click', function () {
    chain.verify().then(function (r) {
      el.verifyResult.textContent = r.ok
        ? '✅ ' + r.len + ' 个区块哈希全部验真喵!链没坏~'
        : '❌ 第 ' + r.at + ' 块哈希对不上(' + r.why + '),链被谁啃坏了喵!';
      el.verifyResult.className = 'verify-result ' + (r.ok ? 'ok' : 'bad');
      logLine(r.ok ? '✅ 验链通过:' + r.len + ' 块全对' : '❌ 验链失败', r.ok ? 'good' : 'bad');
    });
  });

  // ---------- 重开一整条链喵(危险!) ----------
  el.resetBtn.addEventListener('click', function () {
    if (!confirm('喵呜!真的要把整条链和全部猫娘清空重来吗?')) return;
    chain.reset().then(function () {
      renderAll(true);
      logLine('🔄 链已清空,重新挖了创世块喵!', 'good');
    });
  });

  // ---------- 名字空间统计喵 ----------
  (function () {
    var N = window.NEKO_NAMES;
    var span = document.getElementById('name-space');
    if (span) span.textContent = N.NAME_SPACE.toLocaleString('zh-CN');
    el.netTag.textContent = (navigator.onLine === false) ? '离线也能玩喵' : '0 gas · 浏览器本地链 · 可部署到 GitHub Pages';
  })();

  // ---------- 启动喵 ----------
  (async function boot() {
    try {
      var had = await chain.load();
      if (!had && chain.blocks.length === 0) await chain.genesis();
      renderAll(true);
      logLine(had
        ? '📦 从浏览器仓库里捡回了 ' + chain.blocks.length + ' 块链和 ' + Object.keys(chain.cats).length + ' 只猫娘喵,欢迎回来!'
        : '🌱 这是你的第一条 NekoChain!创世块已挖好(0 gas,不用钱包,数据只存在这台浏览器里喵)。', 'good');
    } catch (e) {
      await chain.genesis();
      renderAll(true);
      logLine('⚠ 仓库读取失败,重新挖了创世块:' + e.message, 'bad');
    }
  })();
})();