/* =========================================================
 * 프로젝트 서몬 프로토타입 — ui.js
 * Canvas 렌더링 + 드래그 입력 + DOM 화면 구성
 * ========================================================= */
(function (global) {
  'use strict';
  var D = global.DATA, L = global.LOGIC;
  var G = D.GEOM;
  var canvas, ctx, cbs;
  var CELL_W = 94, CELL_H = 56;

  // ---- 화면 스케일 맞춤 ----
  function fitApp() {
    var app = document.getElementById('app');
    var s = Math.min(window.innerWidth / 405, window.innerHeight / 720) * 0.98;
    app.style.transform = 'scale(' + s + ')';
  }

  function showScreen(name) {
    ['main', 'game', 'result'].forEach(function (n) {
      document.getElementById('screen-' + n).classList.toggle('on', n === name);
    });
  }

  // ---- 메인 화면: 챕터 1~9 세로 목록 + 별점 ----
  function starStr(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < n ? '⭐' : '☆';
    return s;
  }
  function buildMain(progress, onChapter, onReset) {
    var root = document.getElementById('screen-main');
    root.innerHTML = '<h1>프로젝트 서몬</h1><div class="sub">덱빌딩 머지 디펜스 — 프로토타입</div>';
    D.CHAPTERS.forEach(function (ch, ci) {
      var stars = progress.stars[ch.id] || 0;
      var unlocked = ci === 0 || (progress.stars[ch.id - 1] || 0) >= 1;
      var btn = document.createElement('button');
      btn.className = 'ch-row';
      btn.disabled = !unlocked;
      btn.innerHTML =
        '<span class="ch-info"><h2>' + (unlocked ? '' : '🔒 ') + '챕터 ' + ch.id + ' · ' + ch.name + '</h2>' +
        '<span class="desc">' + ch.desc + '</span></span>' +
        '<span class="ch-stars">' + (unlocked ? starStr(stars) : '') + '</span>';
      btn.onclick = function () { onChapter(ci); };
      root.appendChild(btn);
    });
    var reset = document.createElement('button');
    reset.id = 'reset-save';
    reset.textContent = '진행도 초기화';
    reset.onclick = onReset;
    root.appendChild(reset);
  }

  // ---- 하단 패널 ----
  function setPanelMsg(msg) { document.getElementById('panel-msg').textContent = msg; }
  function setTopbar(stageLabel, waveLabel) {
    document.getElementById('tb-stage').textContent = stageLabel;
    document.getElementById('tb-wave').textContent = waveLabel;
  }
  function setGold(g) { document.getElementById('tb-gold').textContent = '💰 ' + g; }
  function setLives(n) {
    var s = '';
    for (var i = 0; i < D.LIVES; i++) s += i < n ? '❤️' : '🖤';
    document.getElementById('tb-lives').textContent = s;
  }
  // ---- 상점 4슬롯 렌더 (v0.5) ----
  function showShop(slots, canBuy, onBuy) {
    var row = document.getElementById('draft-cards');
    row.innerHTML = '';
    slots.forEach(function (slot, i) {
      var el = document.createElement('div');
      if (slot.sold) {
        el.className = 'card sold';
        el.innerHTML = '<div class="em">✔</div>';
        row.appendChild(el);
        return;
      }
      var buyable = canBuy(slot);
      var body;
      if (slot.kind === 'unit') {
        var u = D.UNITS[slot.unitId], cl = D.CLASSES[u.cls];
        body = '<div class="em">' + u.emoji + '</div>' +
          '<div class="nm">' + u.name + '</div>' +
          '<div class="cl' + (u.tier === 2 ? ' tier2' : '') + '">' +
          cl.icon + ' ' + cl.name + (u.tier === 2 ? ' · T2' : '') + '</div>';
        el.className = 'card' + (buyable ? '' : ' off');
      } else {
        var isT2 = slot.kind === 'randT2';
        body = '<div class="em">❓</div>' +
          '<div class="nm">랜덤 유닛</div>' +
          '<div class="cl' + (isT2 ? ' tier2' : '') + '">' + (isT2 ? 'Tier 2' : 'Tier 1') + '</div>';
        el.className = 'card rand' + (buyable ? '' : ' off');
      }
      el.innerHTML = body + '<div class="price">💰 ' + slot.price + 'G</div>';
      if (buyable) el.onclick = function () { onBuy(i); };
      row.appendChild(el);
    });
  }
  function clearShop() { document.getElementById('draft-cards').innerHTML = ''; }
  function setButtons(showStart, showReroll, showLock) {
    document.getElementById('btn-start').classList.toggle('hidden', !showStart);
    document.getElementById('btn-reroll').classList.toggle('hidden', !showReroll);
    document.getElementById('btn-lock').classList.toggle('hidden', !showLock);
  }
  function setLock(locked) {
    var b = document.getElementById('btn-lock');
    b.textContent = locked ? '🔒' : '🔓';
    b.classList.toggle('locked', locked);
  }
  function setStartLabel(sec) {
    document.getElementById('btn-start').textContent =
      sec === null ? '전투 시작' : '전투 시작 (' + sec + ')';
  }

  function showResult(win, waveReached, label, stars) {
    showScreen('result');
    var t = document.getElementById('result-title');
    t.textContent = win ? starStr(stars) : '패배...';
    t.className = win ? 'win' : 'lose';
    document.getElementById('result-sub').textContent = win
      ? label + ' 클리어! — 남은 목숨 ' + stars + '개 = 별 ' + stars + '개'
      : label + ' — 웨이브 ' + waveReached + '에서 목숨 소진';
  }

  // ---- Canvas 렌더링 ----
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBar(x, y, w, h, frac, color) {
    ctx.fillStyle = '#000a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  }

  function drawUnitSprite(x, y, unitId, star, opts) {
    var u = D.UNITS[unitId], cl = D.CLASSES[u.cls];
    opts = opts || {};
    var S = opts.size || 52;
    // 몸체
    roundRect(x - S / 2, y - S / 2, S, S, 10);
    ctx.fillStyle = cl.color;
    ctx.fill();
    ctx.lineWidth = u.tier === 2 ? 3 : 1.5;
    ctx.strokeStyle = u.tier === 2 ? '#ffd76a' : '#ffffff55';
    ctx.stroke();
    // 머지 힌트 반짝임
    if (opts.hint) {
      var pulse = 0.5 + 0.5 * Math.sin(opts.time * 6);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255, 215, 106, ' + (0.35 + 0.6 * pulse) + ')';
      roundRect(x - S / 2 - 4, y - S / 2 - 4, S + 8, S + 8, 13);
      ctx.stroke();
    }
    // 보호막
    if (opts.shield > 0) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#9fd8ff';
      ctx.beginPath();
      ctx.arc(x, y, S / 2 + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 아이콘 + 성급 (텍스트형 이모지 대비: 컬러 이모지 폰트 + 흰색 폴백)
    ctx.font = Math.round(S * 0.5) + 'px "Segoe UI Emoji", "Apple Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(u.emoji, x, y + 1);
    ctx.font = 'bold ' + (S < 45 ? 9 : 11) + 'px sans-serif';
    ctx.fillStyle = '#ffd76a';
    var stars = '';
    for (var i = 0; i < star; i++) stars += '★';
    ctx.fillText(stars, x, y - S / 2 - 9);
    // HP/마나 바 (전투 중)
    if (opts.hpFrac !== undefined) {
      drawBar(x - S / 2, y + S / 2 + 3, S, 5, opts.hpFrac, '#63c04f');
      drawBar(x - S / 2, y + S / 2 + 9, S, 3, opts.manaFrac, '#5aa2e8');
    }
  }

  // ---- 정령 (소환수) — 본체와 확실히 구분되는 소형 원형 ----
  function drawSpirit(u) {
    ctx.beginPath();
    ctx.arc(u.x, u.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = u.frenzyT > 0 ? '#3ec9a0' : '#2fa08b';
    ctx.fill();
    ctx.lineWidth = u.frenzyT > 0 ? 2.5 : 1.5;
    ctx.strokeStyle = u.frenzyT > 0 ? '#ffb46a' : '#bfe8dc';
    ctx.stroke();
    ctx.font = '12px "Segoe UI Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(u.emoji, u.x, u.y + 1);
    drawBar(u.x - 11, u.y - 18, 22, 3, u.hp / u.maxHp, '#63c04f');
  }

  // ---- 전투 이펙트 (형태 = 아키타입, 색 = 클래스) ----
  function lerp(a, b, p) { return a + (b - a) * p; }
  function drawFx(f) {
    var k = Math.max(0, f.t / f.dur); // 1 → 0
    var p = 1 - k;                    // 진행도 0 → 1
    var col = f.color || '#ffffff';
    ctx.save();
    if (f.type === 'hit') {
      ctx.globalAlpha = k * 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(f.x, f.y, 5, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === 'arrow') {
      // 투사체: 화살 — 직선 비행 + 궤적
      var ax = lerp(f.x, f.x1, p), ay = lerp(f.y, f.y1, p);
      var rot = Math.atan2(f.y1 - f.y, f.x1 - f.x);
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax - Math.cos(rot) * 14, ay - Math.sin(rot) * 14);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ax, ay, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === 'bolt') {
      // 투사체: 마탄 — 빛나는 구체
      var bx = lerp(f.x, f.x1, p), by = lerp(f.y, f.y1, p);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === 'slash') {
      // 참격 호 — 근접 계열
      var R = f.big ? 34 : (f.small ? 16 : 24);
      ctx.globalAlpha = k;
      ctx.strokeStyle = col; ctx.lineWidth = f.big ? 6 : 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(f.x, f.y, R, f.rot - 1.0 + p * 0.6, f.rot + 1.0 + p * 0.6);
      ctx.stroke();
    } else if (f.type === 'burst') {
      // 폭발 — 광역 마법 (범위가 눈에 보이도록)
      ctx.globalAlpha = k * 0.45;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(f.x, f.y, p * (f.r || 42), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = k;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, p * (f.r || 42), 0, Math.PI * 2); ctx.stroke();
    } else if (f.type === 'heal') {
      // 치유 십자 — 위로 떠오름
      var hy = f.y - p * 20;
      ctx.globalAlpha = k;
      ctx.strokeStyle = '#7ce07c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.x - 6, hy); ctx.lineTo(f.x + 6, hy);
      ctx.moveTo(f.x, hy - 6); ctx.lineTo(f.x, hy + 6);
      ctx.stroke();
    } else if (f.type === 'healbeam') {
      ctx.globalAlpha = k * 0.6;
      ctx.strokeStyle = '#7ce07c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x1, f.y1); ctx.stroke();
    } else if (f.type === 'blink') {
      // 로그 도약 잔상
      ctx.globalAlpha = k * 0.7;
      ctx.strokeStyle = '#565d70'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x1, f.y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#565d70';
      ctx.beginPath(); ctx.arc(f.x, f.y, 8 * k, 0, Math.PI * 2); ctx.fill();
    } else if (f.type === 'summon') {
      // 소환진
      ctx.globalAlpha = k;
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, 6 + p * 18, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = k * 0.5;
      ctx.beginPath(); ctx.arc(f.x, f.y, 3 + p * 9, 0, Math.PI * 2); ctx.stroke();
    } else if (f.type === 'skill') {
      // 스킬 시전 링 — 금테 + 클래스색 내부 링
      ctx.globalAlpha = k;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(f.x, f.y, p * 55 + 10, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, p * 38 + 8, 0, Math.PI * 2); ctx.stroke();
    } else if (f.type === 'eslash') {
      // 적의 타격 — 붉은 발톱
      ctx.globalAlpha = k * 0.8;
      ctx.strokeStyle = '#e05656'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 14, f.rot - 0.7, f.rot + 0.7);
      ctx.stroke();
    } else if (f.type === 'die') {
      ctx.globalAlpha = k * 0.5;
      ctx.fillStyle = '#96969f';
      ctx.beginPath(); ctx.arc(f.x, f.y, p * 20 + 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.lineWidth = e.isBoss ? 3 : 1;
    ctx.strokeStyle = e.isBoss ? '#ffd76a' : '#00000055';
    ctx.stroke();
    if (e.isBoss) {
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👹', e.x, e.y);
    }
    drawBar(e.x - e.r, e.y - e.r - 8, e.r * 2, 4, e.hp / e.maxHp, '#e05656');
  }

  // ---- 벤치 줄 + 판매 존 (전장 아래 y≈490 한 줄) ----
  var BENCH_Y = 490, BENCH_SLOT = 38, SELL_X = 382;
  function benchX(i) { return 28 + 44 * i; }

  function drawBenchRow(view) {
    var battle = view.mode === 'battle';
    ctx.save();
    ctx.globalAlpha = battle ? 0.4 : 1;
    for (var i = 0; i < 8; i++) {
      roundRect(benchX(i) - BENCH_SLOT / 2, BENCH_Y - BENCH_SLOT / 2, BENCH_SLOT, BENCH_SLOT, 6);
      ctx.fillStyle = '#ffffff0a';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = (view.dropZone && view.dropZone.type === 'bench' && view.dropZone.slot === i)
        ? '#ffd76a' : '#ffffff1e';
      ctx.stroke();
    }
    // 판매 존
    var hot = view.dropZone && view.dropZone.type === 'sell';
    roundRect(SELL_X - 20, BENCH_Y - 20, 40, 40, 6);
    ctx.fillStyle = hot ? '#b1832f55' : '#e0565511';
    ctx.fill();
    ctx.lineWidth = hot ? 2 : 1;
    ctx.strokeStyle = hot ? '#ffd76a' : '#e0565566';
    ctx.stroke();
    ctx.font = '18px "Segoe UI Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💰', SELL_X, BENCH_Y + 1);
    // 벤치 유닛
    view.bench.forEach(function (b) {
      if (view.drag && view.drag.uid === b.uid) return;
      drawUnitSprite(benchX(b.slot), BENCH_Y, b.unitId, b.star,
        { size: 36, hint: !battle && view.hints.has('u' + b.uid), time: view.time });
    });
    ctx.restore();
  }

  function render(view) {
    var t = view.time;
    ctx.clearRect(0, 0, 405, 720);
    // 전장 배경
    var grad = ctx.createLinearGradient(0, 0, 0, G.FIELD_H);
    grad.addColorStop(0, '#2a2331');
    grad.addColorStop(1, '#232838');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 405, G.FIELD_H);
    // 보드 슬롯 — 준비 단계에만 표시 (전투 중엔 전장만 보이도록 숨김)
    if (view.mode !== 'battle') {
      for (var r = 0; r < G.ROWS; r++) for (var c = 0; c < G.COLS; c++) {
        roundRect(G.cellX(c) - CELL_W / 2, G.cellY(r) - CELL_H / 2, CELL_W, CELL_H, 8);
        ctx.fillStyle = '#ffffff0a';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = (view.dropZone && view.dropZone.type === 'cell' &&
          view.dropZone.col === c && view.dropZone.row === r)
          ? '#ffd76a' : '#ffffff22';
        ctx.stroke();
      }
    }

    if (view.mode === 'battle' && view.battle) {
      view.battle.enemies.forEach(function (e) { if (e.alive) drawEnemy(e); });
      view.battle.units.forEach(function (u) {
        if (!u.alive) return;
        if (u.isSpirit) { drawSpirit(u); return; }
        drawUnitSprite(u.x, u.y, u.unitId, u.star, {
          hpFrac: u.hp / u.maxHp, manaFrac: u.mana / u.manaMax,
          shield: u.shield, time: t
        });
      });
      view.battle.fx.forEach(drawFx);
    } else {
      // 준비 모드: 보드 유닛
      view.board.forEach(function (b) {
        if (view.drag && view.drag.uid === b.uid) return;
        drawUnitSprite(G.cellX(b.col), G.cellY(b.row), b.unitId, b.star,
          { hint: view.hints.has('u' + b.uid), time: t });
      });
    }

    drawBenchRow(view);

    // 드래그 중 유닛
    if (view.drag) {
      var d = view.drag;
      ctx.globalAlpha = 0.85;
      drawUnitSprite(d.x, d.y, d.unitId, d.star, { time: t });
      ctx.globalAlpha = 1;
    }
  }

  // ---- 입력 (드래그) ----
  function canvasPos(ev) {
    var rect = canvas.getBoundingClientRect();
    var cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
    var cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);
    return { x: (cx - rect.left) / rect.width * 405, y: (cy - rect.top) / rect.height * 720 };
  }
  function cellAt(x, y) {
    for (var r = 0; r < G.ROWS; r++) for (var c = 0; c < G.COLS; c++) {
      if (Math.abs(x - G.cellX(c)) <= CELL_W / 2 && Math.abs(y - G.cellY(r)) <= CELL_H / 2 + 6) {
        return { col: c, row: r };
      }
    }
    return null;
  }

  // 포인터 위치 → 상호작용 존 (보드 칸 / 벤치 슬롯 / 판매)
  function zoneAt(x, y) {
    var cell = cellAt(x, y);
    if (cell) return { type: 'cell', col: cell.col, row: cell.row };
    if (Math.abs(y - BENCH_Y) <= 24) {
      if (Math.abs(x - SELL_X) <= 24) return { type: 'sell' };
      for (var i = 0; i < 8; i++) {
        if (Math.abs(x - benchX(i)) <= 22) return { type: 'bench', slot: i };
      }
    }
    return null;
  }

  function initInput(canvasEl, callbacks) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    cbs = callbacks;
    function down(ev) {
      var p = canvasPos(ev);
      cbs.onDragStart(zoneAt(p.x, p.y), p);
      if (ev.cancelable) ev.preventDefault();
    }
    function move(ev) {
      var p = canvasPos(ev);
      cbs.onDragMove(p, zoneAt(p.x, p.y));
      if (ev.touches && ev.cancelable) ev.preventDefault();
    }
    function up(ev) {
      var p = ev.changedTouches
        ? canvasPos({ touches: ev.changedTouches })
        : canvasPos(ev);
      cbs.onDragEnd(p, zoneAt(p.x, p.y));
    }
    canvas.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', up);
    window.addEventListener('resize', fitApp);
    fitApp();
  }

  global.UI = {
    initInput: initInput, render: render, fitApp: fitApp,
    drawUnitSprite: drawUnitSprite,
    showScreen: showScreen, buildMain: buildMain,
    setPanelMsg: setPanelMsg, setTopbar: setTopbar, setGold: setGold, setLives: setLives,
    showShop: showShop, clearShop: clearShop,
    setButtons: setButtons, setLock: setLock, setStartLabel: setStartLabel,
    showResult: showResult,
    cellAt: cellAt
  };
}(typeof window !== 'undefined' ? window : globalThis));
