/* =========================================================
 * 프로젝트 서몬 프로토타입 — ui.js
 * Canvas 렌더링 + 드래그 입력 + DOM 화면 구성
 * ========================================================= */
(function (global) {
  'use strict';
  var D = global.DATA, L = global.LOGIC;
  var G = D.GEOM;
  var canvas, ctx, cbs;
  var CELL_W = 126, CELL_H = 56;

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
      var modStr = (ch.mods || []).map(function (k) {
        return D.MODIFIERS[k].icon + D.MODIFIERS[k].name;
      }).join(' ');
      var btn = document.createElement('button');
      btn.className = 'ch-row';
      btn.disabled = !unlocked;
      btn.innerHTML =
        '<span class="ch-info"><h2>' + (unlocked ? '' : '🔒 ') + '챕터 ' + ch.id + ' · ' + ch.name + '</h2>' +
        '<span class="desc">' + ch.desc + (modStr ? ' · <b>' + modStr + '</b>' : '') + '</span></span>' +
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
  // ---- 상점 4슬롯 렌더 (v0.5, v0.7: 선택지별 잠금) ----
  function tierClass(t) { return t === 3 ? ' tier3' : (t === 2 ? ' tier2' : ''); }
  function showShop(slots, canBuy, onBuy, onToggleLock) {
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
          '<div class="cl' + tierClass(u.tier) + '">' +
          cl.icon + ' ' + cl.name + (u.tier > 1 ? ' · T' + u.tier : '') + '</div>';
        el.className = 'card' + (buyable ? '' : ' off');
      } else if (slot.kind === 'ticket') {
        body = '<div class="em">' + D.TICKET.emoji + '</div>' +
          '<div class="nm">' + D.TICKET.name + '</div>' +
          '<div class="cl">유닛 +1레벨</div>';
        el.className = 'card rand' + (buyable ? '' : ' off');
      } else {
        body = '<div class="em">❓</div>' +
          '<div class="nm">랜덤 유닛</div>' +
          '<div class="cl' + tierClass(slot.tier) + '">Tier ' + slot.tier + '</div>';
        el.className = 'card rand' + (buyable ? '' : ' off');
      }
      if (slot.locked) el.className += ' locked';
      el.innerHTML = body + '<div class="price">💰 ' + slot.price + 'G</div>' +
        '<div class="lock-btn' + (slot.locked ? ' on' : '') + '">' + (slot.locked ? '🔒' : '🔓') + '</div>';
      if (buyable) el.onclick = function () { onBuy(i); };
      el.querySelector('.lock-btn').onclick = function (ev) {
        ev.stopPropagation();
        onToggleLock(i);
      };
      // 카드 호버 → 해당 카드 바로 위에 툴팁 (카드 i 중심 x = 59 + 96i)
      var cardX = 59 + 96 * i;
      if (slot.kind === 'unit') { // 확정 카드 = 스탯·스킬
        el.onmouseenter = function () { showUnitTooltip(slot.unitId, 1, cardX, 552); };
      } else if (slot.kind === 'ticket') {
        el.onmouseenter = function () {
          showInfoTooltip(D.TICKET.emoji + ' ' + D.TICKET.name, D.TICKET.desc, cardX, 552);
        };
      } else { // 랜덤 카드 = 규칙 설명
        el.onmouseenter = function () {
          showInfoTooltip('❓ 랜덤 유닛', 'Tier ' + slot.tier +
            ' 유닛 중 하나가 구매 시 무작위로 확정. 같은 티어 확정 카드보다 저렴.', cardX, 552);
        };
      }
      el.onmouseleave = hideTooltip;
      row.appendChild(el);
    });
  }
  function clearShop() { document.getElementById('draft-cards').innerHTML = ''; }
  function setButtons(showStart, showReroll) {
    document.getElementById('btn-start').classList.toggle('hidden', !showStart);
    document.getElementById('btn-reroll').classList.toggle('hidden', !showReroll);
  }

  // ---- 유닛 툴팁 (스탯 + 클래스 스킬) ----
  var ROLE_NAMES = {
    tank: '탱킹', melee: '근접딜', ranged: '원거리딜', aoe: '광역마법',
    support: '지원힐', assassin: '암살처형', summon: '소환'
  };
  function unitTooltipHtml(unitId, lv, live) {
    var u = D.UNITS[unitId], cl = D.CLASSES[u.cls], sk = D.SKILLS[u.cls];
    var s = L.statsFor(unitId, lv);
    var max = D.LV_MAX[u.tier];
    var lvTag = 'Lv.' + lv + '/' + max + (lv >= max ? ' MAX' : '');
    var tierTag = u.tier > 1 ? ' <span class="tt-tier' + u.tier + '">T' + u.tier + '</span>' : '';
    var hp = live ? Math.max(0, Math.round(live.hp)) + '/' + s.hp : s.hp;
    var mana = live ? Math.round(live.mana) + '/' + s.manaMax : s.manaMax;
    var html =
      '<div class="tt-name">' + u.emoji + ' ' + u.name + ' <span style="color:#ffd76a">' + lvTag + '</span>' + tierTag + '</div>' +
      '<div class="tt-role">' + cl.icon + ' ' + cl.name + ' · ' + ROLE_NAMES[u.arch] + '</div>' +
      '<div class="tt-stats">' +
      '<span>❤️ 체력 ' + hp + '</span><span>⚔️ 공격 ' + s.atk + '</span>' +
      '<span>⚡ 공속 ' + s.as + '/초</span><span>📏 사거리 ' + s.range + '칸</span>' +
      '<span>🔹 마나 ' + mana + '</span>' +
      (s.hps ? '<span>💚 초당 힐 ' + s.hps + '</span>' : '') +
      '</div>' +
      '<div class="tt-skill"><b>' + sk.name + '</b> — ' + sk.desc + '</div>';
    // 조합표 (v1.0): 같은 티어 Max끼리 — 이 유닛의 클래스 × 상대 클래스 → 진화 결과
    var evo = D.EVOLUTION[u.tier + 1];
    if (evo) {
      var cells = '';
      ['K', 'W', 'A', 'M', 'C', 'R', 'N'].forEach(function (c2) {
        var key = [u.cls, c2].sort().join('+');
        cells += '<span>' + D.CLASSES[c2].icon + '→' + D.UNITS[evo[key]].name + '</span>';
      });
      html += '<div class="tt-combo"><b>조합표</b> — 같은 티어 Max끼리' +
        '<div class="tt-combo-grid">' + cells + '</div></div>';
    }
    return html;
  }
  function showUnitTooltip(unitId, lv, x, y, live) {
    var el = document.getElementById('tooltip');
    el.innerHTML = unitTooltipHtml(unitId, lv, live);
    el.classList.remove('hidden');
    placeTooltip(el, x, y);
  }
  // 범용 설명 박스 (레벨업권·랜덤 카드 등 비유닛 대상)
  function showInfoTooltip(title, desc, x, y) {
    var el = document.getElementById('tooltip');
    el.innerHTML =
      '<div class="tt-name">' + title + '</div>' +
      '<div class="tt-skill">' + desc + '</div>';
    el.classList.remove('hidden');
    placeTooltip(el, x, y);
  }
  function showTicketTooltip(x, y) {
    showInfoTooltip(D.TICKET.emoji + ' ' + D.TICKET.name, D.TICKET.desc, x, y);
  }
  function placeTooltip(el, x, y) {
    var w = 188, h = el.offsetHeight;
    var px = Math.max(5, Math.min(405 - w - 5, x - w / 2));
    var py = y - h - 42;
    if (py < 40) py = Math.min(720 - h - 5, y + 42);
    el.style.left = px + 'px';
    el.style.top = py + 'px';
  }
  function hideTooltip() { document.getElementById('tooltip').classList.add('hidden'); }
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

  function drawUnitSprite(x, y, unitId, lv, opts) {
    var u = D.UNITS[unitId], cl = D.CLASSES[u.cls];
    opts = opts || {};
    var S = opts.size || 52;
    // 몸체
    roundRect(x - S / 2, y - S / 2, S, S, 10);
    ctx.fillStyle = cl.color;
    ctx.fill();
    ctx.lineWidth = u.tier >= 2 ? 3 : 1.5;
    var TIER_COLORS = { 2: '#ffd76a', 3: '#7ef0ff', 4: '#d98cff', 5: '#ff6b81' };
    ctx.strokeStyle = TIER_COLORS[u.tier] || '#ffffff55';
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
    // 아이콘 + 레벨 핍 (텍스트형 이모지 대비: 컬러 이모지 폰트 + 흰색 폴백)
    ctx.font = Math.round(S * 0.5) + 'px "Segoe UI Emoji", "Apple Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(u.emoji, x, y + 1);
    if (lv > 0) { // 레벨 텍스트 (Max = 주황색)
      ctx.font = 'bold ' + (S < 45 ? 9 : 11) + 'px sans-serif';
      ctx.fillStyle = lv >= D.LV_MAX[u.tier] ? '#ffb046' : '#ffd76a';
      ctx.fillText('Lv.' + lv, x, y - S / 2 - 9);
    }
    // HP/마나 바 (전투 중)
    if (opts.hpFrac !== undefined) {
      drawBar(x - S / 2, y + S / 2 + 3, S, 5, opts.hpFrac, '#63c04f');
      drawBar(x - S / 2, y + S / 2 + 9, S, 3, opts.manaFrac, '#5aa2e8');
    }
  }

  // ---- 레벨업권 (보드 위 아이템 — 유닛과 구분되는 티켓 모양) ----
  function drawTicket(x, y, opts) {
    opts = opts || {};
    var S = opts.size || 46;
    ctx.save();
    roundRect(x - S / 2, y - S * 0.32, S, S * 0.64, 7);
    ctx.fillStyle = '#3a3350';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#ffd76a';
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = Math.round(S * 0.42) + 'px "Segoe UI Emoji", "Apple Color Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(D.TICKET.emoji, x, y + 1);
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#ffd76a';
    ctx.fillText('+1Lv', x, y - S * 0.32 - 8);
    ctx.restore();
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

  // ---- 드래그 중 결과 미리보기 (v1.0): 진화·레벨업 결과 고스트 + 라벨 ----
  function drawPreview(p, t) {
    var x = G.cellX(p.col), y = G.cellY(p.row);
    var pulse = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawUnitSprite(x, y, p.unitId, p.lv, { time: t });
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 215, 106, ' + (0.4 + 0.6 * pulse) + ')';
    roundRect(x - 31, y - 31, 62, 62, 12);
    ctx.stroke();
    // 결과 라벨
    ctx.font = 'bold 12px sans-serif';
    var w = ctx.measureText(p.label).width + 16;
    var lx = Math.max(5 + w / 2, Math.min(400 - w / 2, x));
    var ly = y - 52;
    roundRect(lx - w / 2, ly - 11, w, 22, 7);
    ctx.fillStyle = '#171a22ee';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffd76a';
    ctx.stroke();
    ctx.fillStyle = '#ffd76a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.label, lx, ly + 1);
    ctx.restore();
  }

  // ---- 판매 존 (보드 우상단, 준비 단계 전용 — v0.8 벤치 폐지) ----
  var SELL_X = 375, SELL_Y = 302;

  function drawSellZone(view) {
    var hot = view.dropZone && view.dropZone.type === 'sell';
    ctx.save();
    roundRect(SELL_X - 21, SELL_Y - 21, 42, 42, 8);
    ctx.fillStyle = hot ? '#b1832f55' : '#e0565511';
    ctx.fill();
    ctx.lineWidth = hot ? 2 : 1;
    ctx.strokeStyle = hot ? '#ffd76a' : '#e0565666';
    ctx.stroke();
    ctx.font = '19px "Segoe UI Emoji", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💰', SELL_X, SELL_Y + 1);
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
        drawUnitSprite(u.x, u.y, u.unitId, u.lv, {
          hpFrac: u.hp / u.maxHp, manaFrac: u.mana / u.manaMax,
          shield: u.shield, time: t
        });
      });
      view.battle.fx.forEach(drawFx);
    } else {
      // 준비 모드: 보드 유닛 + 레벨업권 (레벨업권은 전투 중 미표시 — v0.9)
      var pv = view.preview;
      view.board.forEach(function (b) {
        if (view.drag && view.drag.uid === b.uid) return;
        if (pv && b.col === pv.col && b.row === pv.row) return; // 미리보기가 대체
        if (b.kind === 'ticket') { drawTicket(G.cellX(b.col), G.cellY(b.row)); return; }
        drawUnitSprite(G.cellX(b.col), G.cellY(b.row), b.unitId, b.lv,
          { hint: view.hints.has('u' + b.uid), time: t });
      });
      if (pv) drawPreview(pv, t);
    }

    if (view.mode !== 'battle') drawSellZone(view);

    // 드래그 중 유닛/레벨업권
    if (view.drag) {
      var d = view.drag;
      ctx.globalAlpha = 0.85;
      if (d.kind === 'ticket') drawTicket(d.x, d.y);
      else drawUnitSprite(d.x, d.y, d.unitId, d.lv, { time: t });
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

  // 포인터 위치 → 상호작용 존 (보드 칸 / 판매)
  function zoneAt(x, y) {
    if (Math.abs(x - SELL_X) <= 24 && Math.abs(y - SELL_Y) <= 24) return { type: 'sell' };
    var cell = cellAt(x, y);
    if (cell) return { type: 'cell', col: cell.col, row: cell.row };
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
    setButtons: setButtons, setStartLabel: setStartLabel,
    showUnitTooltip: showUnitTooltip, showTicketTooltip: showTicketTooltip, hideTooltip: hideTooltip,
    showResult: showResult,
    cellAt: cellAt
  };
}(typeof window !== 'undefined' ? window : globalThis));
