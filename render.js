// ============================================================
//  猫娘 SVG 渲染喵 —— 用基因(色板/饰物/稀有度)+ 心情画出 Q 版猫娘
//  viewBox 240x240:大头小身体,猫耳,长尾巴,腮红,ω嘴
// ============================================================
(function (global) {
  'use strict';

  function star(cx, cy, r, fill) {
    cx = +cx; cy = +cy; r = +r;
    // 五芒星路径喵
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5;
      var rr = i % 2 === 0 ? r : r * 0.45;
      pts.push((cx + rr * Math.cos(ang)).toFixed(1) + ',' + (cy + rr * Math.sin(ang)).toFixed(1));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + fill + '"/>';
  }

  function accessorySVG(a, accent) {
    if (a === 'ribbon') {
      return '<g>' +
        '<polygon points="152,40 132,27 137,51" fill="' + accent + '"/>' +
        '<polygon points="152,40 172,27 167,51" fill="' + accent + '"/>' +
        '<circle cx="152" cy="40" r="5.5" fill="#fff" stroke="' + accent + '" stroke-width="2"/>' +
        '</g>';
    }
    if (a === 'star') return star(150, 36, 11, accent);
    if (a === 'flower') {
      var petals = '';
      for (var i = 0; i < 5; i++) {
        var ang = -Math.PI / 2 + i * Math.PI * 2 / 5;
        petals += '<circle cx="' + (150 + 8 * Math.cos(ang)).toFixed(1) + '" cy="' + (40 + 8 * Math.sin(ang)).toFixed(1) + '" r="6" fill="' + accent + '" opacity="0.9"/>';
      }
      return petals + '<circle cx="150" cy="40" r="4.5" fill="#fff59d"/>';
    }
    if (a === 'bell') {
      return '<rect x="90" y="158" width="60" height="9" rx="4.5" fill="' + accent + '"/>' +
        '<circle cx="120" cy="170" r="6.5" fill="#ffd166" stroke="#e8a20a" stroke-width="1.5"/>' +
        '<line x1="118" y1="170" x2="122" y2="170" stroke="#e8a20a" stroke-width="1.5"/>';
    }
    return '';
  }

  function eyesSVG(color, mood) {
    if (mood === 'sleepy') {
      return '<path d="M 84 112 Q 96 122 108 112" stroke="#5a3a3a" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M 132 112 Q 144 122 156 112" stroke="#5a3a3a" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<text x="168" y="78" font-size="16" fill="#8d8dab" font-family="sans-serif">z</text>' +
        '<text x="178" y="64" font-size="12" fill="#a9a9c4" font-family="sans-serif">Z</text>';
    }
    return '<ellipse cx="96" cy="112" rx="12" ry="15" fill="' + color + '"/>' +
      '<ellipse cx="144" cy="112" rx="12" ry="15" fill="' + color + '"/>' +
      '<circle cx="101" cy="105" r="5" fill="#fff"/>' +
      '<circle cx="92" cy="117" r="2.5" fill="#fff" opacity="0.85"/>' +
      '<circle cx="141" cy="105" r="4.5" fill="#fff"/>' +
      '<circle cx="149" cy="117" r="2.5" fill="#fff" opacity="0.85"/>';
  }

  function mouthSVG(mood) {
    if (mood === 'eating') {
      return '<ellipse cx="120" cy="138" rx="7" ry="8.5" fill="#7a3b47"/>' +
        '<path d="M 96 132 q 9 -7 18 0 q -9 7 -18 0 Z" fill="#88c0d0" stroke="#5d9fb5" stroke-width="1"/>' +
        '<polygon points="96,132 88,127 88,137" fill="#88c0d0" stroke="#5d9fb5" stroke-width="1"/>';
    }
    if (mood === 'hungry') {
      return '<path d="M 112 141 Q 120 134 128 141" stroke="#b05a6e" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M 158 120 q 4 9 0 13 q -4 -4 0 -13 Z" fill="#8ecae6"/>';
    }
    // happy / normal: ω 猫嘴
    return '<path d="M 111 135 Q 115.5 141 120 135 Q 124.5 141 129 135" stroke="#b05a6e" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
  }

  // cat: {genome:{hair,eyes,outfit,accent,blush,bg,accessory,rarity,seed,name}}, mood: happy|normal|sleepy|eating|hungry
  function catGirlSVG(cat, mood, animate) {
    var g = cat.genome || cat;
    var anim = animate !== false;
    var S = '';
    S += '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-label="' + g.name + '">';
    // 背景
    S += '<rect x="2" y="2" width="236" height="236" rx="30" fill="' + g.bg + '"/>';
    // 背景小星星(按基因种子摆位喵)
    var rndState = parseInt(g.seed || '1234', 16) || 7;
    function rnd() { rndState = (rndState * 1103515245 + 12345) & 0x7fffffff; return rndState / 0x7fffffff; }
    for (var i = 0; i < 5; i++) {
      var sx = 20 + rnd() * 200, sy = 18 + rnd() * 70, sr = 3 + rnd() * 4;
      S += star(sx.toFixed(1), sy.toFixed(1), sr.toFixed(1), 'rgba(255,255,255,0.75)');
    }
    // 传说光晕
    if (g.rarity === 'legend') {
      S += '<ellipse cx="120" cy="110" rx="86" ry="82" fill="#ffd166" opacity="0.28"/>';
    }
    // 尾巴(身体后面喵)
    S += '<path class="tail" d="M 163 196 C 206 188, 214 150, 192 128" stroke="' + g.hair + '" stroke-width="12" fill="none" stroke-linecap="round"/>';
    // 身体
    S += '<ellipse cx="120" cy="189" rx="43" ry="31" fill="' + g.outfit + '"/>';
    S += '<ellipse cx="120" cy="197" rx="25" ry="16" fill="#fff" opacity="0.55"/>';
    // 小手
    S += '<ellipse cx="79" cy="182" rx="10" ry="14" fill="' + g.outfit + '" transform="rotate(18 79 182)"/>';
    S += '<ellipse cx="161" cy="182" rx="10" ry="14" fill="' + g.outfit + '" transform="rotate(-18 161 182)"/>';
    // 头
    S += '<g class="head">';
    // 脑后长发
    S += '<rect x="48" y="58" width="144" height="152" rx="62" fill="' + g.hair + '"/>';
    // 两侧发丝
    S += '<path d="M 54 92 Q 42 168 60 214 Q 76 217 82 190 Q 72 148 76 96 Z" fill="' + g.hair + '" opacity="0.85"/>';
    S += '<path d="M 186 92 Q 198 168 180 214 Q 164 217 158 190 Q 168 148 164 96 Z" fill="' + g.hair + '" opacity="0.85"/>';
    // 脸
    S += '<ellipse cx="120" cy="108" rx="66" ry="58" fill="#ffe8da"/>';
    // 猫耳
    S += '<polygon points="64,64 84,8 120,44" fill="' + g.hair + '"/>';
    S += '<polygon points="74,56 87,24 108,45" fill="#ffb3c0"/>';
    S += '<polygon points="176,64 156,8 120,44" fill="' + g.hair + '"/>';
    S += '<polygon points="166,56 153,24 132,45" fill="#ffb3c0"/>';
    // 刘海
    S += '<path d="M 54 94 Q 50 38 120 34 Q 190 38 186 94 Q 174 74 160 86 Q 156 58 138 72 Q 132 46 120 62 Q 108 46 102 72 Q 84 58 80 86 Q 66 74 54 94 Z" fill="' + g.hair + '"/>';
    // 眼睛
    S += eyesSVG(g.eyes, mood);
    // 腮红
    S += '<ellipse cx="82" cy="134" rx="11" ry="6" fill="' + g.blush + '" opacity="0.85"/>';
    S += '<ellipse cx="158" cy="134" rx="11" ry="6" fill="' + g.blush + '" opacity="0.85"/>';
    // 嘴
    S += mouthSVG(mood);
    // 饰物
    S += accessorySVG(g.accessory, g.accent);
    // 传说小星星
    if (g.rarity === 'legend') {
      S += star(52, 66, 8, '#ffd166') + star(190, 150, 7, '#ffd166') + star(60, 160, 6, '#f9a825');
    }
    S += '</g>';
    S += '</svg>';
    return S;
  }

  global.catGirlSVG = catGirlSVG;
})(typeof window !== 'undefined' ? window : globalThis);