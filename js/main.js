/* =========================================================
 * 프로젝트 서몬 프로토타입 — main.js
 * 화면 상태머신 · 런 진행 · 상점/벤치/판매/골드 관리 · 저장 · 게임 루프
 * 흐름: MAIN → STAGE(준비[상점+배치, 제한시간] → 전투 ×6웨이브) → RESULT → MAIN
 * 상점(v0.5): 4슬롯 상시 노출, 구매해도 유지, 리롤로만 교체, 잠금 시 다음 웨이브에도 유지
 * ========================================================= */
(function () {
  'use strict';
  var D = window.DATA, L = window.LOGIC, B = window.BATTLE, UI = window.UI;
  var SAVE_KEY = 'summon_proto_save';

  var progress = loadSave();
  var run = null;
  var drag = null, dropZone = null;

  // ---- 저장: {stars: {챕터id: 0~3}} ----
  function loadSave() {
    try {
      var s = localStorage.getItem(SAVE_KEY);
      var p = s ? JSON.parse(s) : null;
      if (!p || !p.stars) return { stars: {} }; // 구버전(cleared 배열) 저장은 리셋
      return p;
    } catch (e) { return { stars: {} }; }
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  // ---- 화면 전환 ----
  function toMain() {
    run = null; drag = null; dropZone = null;
    UI.hideTooltip();
    UI.buildMain(progress, startChapter, function () {
      progress = { stars: {} }; save(); toMain();
    });
    UI.showScreen('main');
  }

  function chapterLabel() {
    var ch = D.CHAPTERS[run.chIdx];
    return '챕터 ' + ch.id + ' · ' + ch.name;
  }

  // ---- 유닛 컬렉션 헬퍼 (보드 3×3 단일 — v0.8 벤치 폐지) ----
  var BOARD_MAX = 9;
  function allEntries() { return run.board; }
  function findByUid(uid) {
    for (var i = 0; i < run.board.length; i++) if (run.board[i].uid === uid) return run.board[i];
    return null;
  }
  function zoneOfEntry(e) { return { type: 'cell', col: e.col, row: e.row }; }
  function detach(e) {
    run.board.splice(run.board.indexOf(e), 1);
  }
  function attach(e, zone) {
    e.col = zone.col; e.row = zone.row;
    run.board.push(e);
  }
  function entryAtZone(zone) {
    if (!zone || zone.type !== 'cell') return null;
    for (var i = 0; i < run.board.length; i++) {
      if (run.board[i].col === zone.col && run.board[i].row === zone.row) return run.board[i];
    }
    return null;
  }

  // ---- 런(챕터) 진행 ----
  function startChapter(ci) {
    run = {
      chIdx: ci, wave: 1, lives: D.LIVES,
      board: [], gold: D.SHOP.startBonus, nextUid: 1,
      shop: null, prepT: 0, lastSec: -1,
      phase: 'prep', battle: null, rng: L.makeRng(Date.now() % 1e9)
    };
    UI.showScreen('game');
    beginPrep();
  }

  // 준비 단계 진입: 수입+이자 지급 + 상점 갱신(잠금 시 유지) + 제한시간 시작
  function beginPrep() {
    run.phase = 'prep';
    run.battle = null;
    var interest = L.interestFor(run.gold);
    run.gold += D.SHOP.income + interest;
    run.shop = L.rollShop(run.shop, run.wave, run.rng); // 잠긴 선택지는 유지
    run.prepT = D.SHOP.prepTime;
    run.lastSec = -1;
    UI.setTopbar(chapterLabel(), '웨이브 ' + run.wave + '/' + D.WAVES_PER_CHAPTER);
    UI.setGold(run.gold);
    UI.setLives(run.lives);
    var info = run.wave % D.BOSS_EVERY === 0
      ? '👹 보스 출현!'
      : '적 ' + D.CHAPTERS[run.chIdx].countFor(run.wave) + '마리';
    UI.setPanelMsg('웨이브 ' + run.wave + '/' + D.WAVES_PER_CHAPTER + ' — ' + info +
      ' · 수입 +' + D.SHOP.income + 'G' + (interest > 0 ? ' (이자 +' + interest + 'G)' : ''));
    UI.setButtons(true, true);
    refreshShop();
  }

  // ---- 상점 ----
  function canBuySlot(slot) {
    if (slot.sold || slot.price > run.gold) return false;
    if (run.board.length < BOARD_MAX) return true;
    // 만석: 확정 카드가 즉시 머지 가능할 때만 허용 (랜덤 카드는 자리 필요)
    if (slot.kind !== 'unit') return false;
    return allEntries().some(function (u) {
      return !!L.mergeResult(u.unitId, u.star, slot.unitId, 1);
    });
  }

  function buySlot(i) {
    if (!run || run.phase !== 'prep') return;
    var slot = run.shop[i];
    if (!slot || !canBuySlot(slot)) return;
    run.gold -= slot.price;
    slot.sold = true;
    var unitId = L.resolveShopUnit(slot, run.rng);
    placeCard(unitId);
    UI.setGold(run.gold);
    if (slot.kind !== 'unit') {
      UI.setPanelMsg('랜덤 카드 → ' + D.UNITS[unitId].name + '!');
    }
    refreshShop();
  }

  function refreshShop() {
    UI.showShop(run.shop, canBuySlot, buySlot, toggleSlotLock);
    updateReroll();
  }

  function toggleSlotLock(i) {
    if (!run || run.phase !== 'prep') return;
    run.shop[i].locked = !run.shop[i].locked;
    refreshShop();
  }

  function updateReroll() {
    document.getElementById('btn-reroll').disabled = !run || run.gold < D.SHOP.reroll;
  }

  function rerollShop() {
    if (!run || run.phase !== 'prep' || run.gold < D.SHOP.reroll) return;
    run.gold -= D.SHOP.reroll;
    run.shop = L.rollShop(run.shop, run.wave, run.rng); // 잠긴 선택지 제외 교체
    UI.setGold(run.gold);
    refreshShop();
  }

  // 카드 수급: 보드 빈칸 자동 배치 → 만석이면 즉시 머지
  function placeCard(cid) {
    if (run.board.length < BOARD_MAX) { placePreferred(cid); return; }
    mergeIntoAny(cid);
  }

  function placePreferred(cid) {
    var arch = D.UNITS[cid].arch;
    var front = (arch === 'tank' || arch === 'melee' || arch === 'assassin');
    var rows = front ? [0, 1, 2] : [2, 1, 0]; // 근접 앞줄, 원거리·지원 뒷줄
    for (var ri = 0; ri < 3; ri++) for (var c = 0; c < 3; c++) {
      var row = rows[ri];
      if (!entryAtZone({ type: 'cell', col: c, row: row })) {
        run.board.push({ uid: run.nextUid++, unitId: cid, star: 1, col: c, row: row });
        return;
      }
    }
  }

  function mergeIntoAny(cid) {
    var all = allEntries();
    for (var i = 0; i < all.length; i++) {
      var u = all[i];
      var r = L.mergeResult(u.unitId, u.star, cid, 1);
      if (r) {
        u.unitId = r.unitId;
        u.star = r.type === 'star' ? r.star : 1;
        return;
      }
    }
  }

  // ---- 전투 ----
  function startWave() {
    if (run.board.length === 0) {
      UI.setPanelMsg('보드에 유닛이 없습니다 — 상점에서 구매하거나 벤치에서 올려 주세요');
      return;
    }
    run.phase = 'battle';
    UI.setButtons(false, false);
    UI.hideTooltip();
    UI.clearShop();
    UI.setPanelMsg('⚔ 웨이브 ' + run.wave + ' 전투 중...');
    var enemies = L.makeWave(run.chIdx, run.wave, run.rng);
    run.battle = B.createBattle(run.board, enemies, Math.floor(run.rng() * 1e9));
  }

  // 제한시간 초과: 보드가 비어 있으면(구매 전무) 목숨 소실 처리
  function autoStartWave() {
    if (run.board.length === 0) {
      loseLife();
      return;
    }
    startWave();
  }

  // 전멸: 목숨 1 소멸. 남으면 같은 웨이브를 재정비 후 재도전 (수입은 지급)
  function loseLife() {
    run.lives--;
    UI.setLives(run.lives);
    if (run.lives <= 0) {
      run.phase = 'ended';
      UI.showResult(false, run.wave, chapterLabel());
      return;
    }
    beginPrep(); // 같은 웨이브 유지 — 수입·이자 받고 파티 재정비
    UI.setPanelMsg('💔 전멸! 남은 목숨 ' + run.lives + ' — 재정비 후 웨이브 ' + run.wave + ' 재도전');
  }

  function onWaveEnd(res) {
    if (!run) return; // 나가기로 이미 이탈
    if (res === 'win') {
      if (run.wave >= D.WAVES_PER_CHAPTER) {
        var chId = D.CHAPTERS[run.chIdx].id;
        var stars = run.lives; // 남은 목숨 = 별점 (무피해 = ⭐3)
        if ((progress.stars[chId] || 0) < stars) { progress.stars[chId] = stars; save(); }
        UI.showResult(true, run.wave, chapterLabel(), stars);
      } else {
        run.wave++;
        beginPrep();
      }
    } else {
      loseLife();
    }
  }

  // ---- 머지 힌트 (보드+벤치 전체, 준비 단계에만) ----
  function canManage() { return run && run.phase === 'prep'; }

  function mergeHints() {
    var s = new Set();
    if (!canManage()) return s;
    var list = allEntries();
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
      if (L.mergeResult(list[i].unitId, list[i].star, list[j].unitId, list[j].star)) {
        s.add('u' + list[i].uid);
        s.add('u' + list[j].uid);
      }
    }
    return s;
  }

  // ---- 드래그: 배치·스왑·머지·판매 (준비 단계 전용) ----
  function onDragStart(zone, p) {
    if (!canManage() || !zone || zone.type === 'sell') return;
    var b = entryAtZone(zone);
    if (!b) return;
    drag = { uid: b.uid, unitId: b.unitId, star: b.star, x: p.x, y: p.y };
  }
  function onDragMove(p, zone) {
    if (drag) {
      drag.x = p.x; drag.y = p.y; dropZone = zone;
      UI.hideTooltip();
      return;
    }
    updateHover(p, zone);
  }

  // 호버 툴팁: 준비 = 보드·벤치 유닛 / 전투 = 살아있는 유닛 (스탯·스킬 정보)
  function updateHover(p, zone) {
    if (!run) return;
    if (run.phase === 'prep') {
      var e = (zone && zone.type !== 'sell') ? entryAtZone(zone) : null;
      if (e) { UI.showUnitTooltip(e.unitId, e.star, p.x, p.y); return; }
    } else if (run.phase === 'battle' && run.battle) {
      var best = null, bd = 27;
      run.battle.units.forEach(function (u) {
        if (!u.alive || u.isSpirit) return;
        var d = Math.sqrt((u.x - p.x) * (u.x - p.x) + (u.y - p.y) * (u.y - p.y));
        if (d < bd) { bd = d; best = u; }
      });
      if (best) {
        UI.showUnitTooltip(best.unitId, best.star, p.x, p.y, { hp: best.hp, mana: best.mana });
        return;
      }
    }
    UI.hideTooltip();
  }
  function onDragEnd(p, zone) {
    var d = drag;
    drag = null; dropZone = null;
    if (!d || !canManage() || !zone) return;
    var src = findByUid(d.uid);
    if (!src) return;

    if (zone.type === 'sell') { sellEntry(src); return; }

    var dst = entryAtZone(zone);
    if (dst === src) return;
    if (!dst) { detach(src); attach(src, zone); return; }

    var r = L.mergeResult(dst.unitId, dst.star, src.unitId, src.star);
    if (r) applyMerge(src, dst, r);
    else swapLoc(src, dst);
  }

  function swapLoc(a, b) {
    var za = zoneOfEntry(a), zb = zoneOfEntry(b);
    detach(a); detach(b);
    attach(a, zb); attach(b, za);
  }

  function applyMerge(src, dst, r) {
    dst.unitId = r.unitId;
    dst.star = r.type === 'star' ? r.star : 1;
    detach(src);
  }

  function sellEntry(e) {
    var v = L.sellValue(e.unitId, e.star);
    detach(e);
    run.gold += v;
    UI.setGold(run.gold);
    UI.setPanelMsg(D.UNITS[e.unitId].name + ' 판매 +' + v + 'G');
    refreshShop(); // 구매 가능 상태 갱신
  }

  // ---- 게임 루프 (고정 틱 1/60) ----
  var last = performance.now(), acc = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    if (run && run.phase === 'prep') {
      run.prepT -= dt;
      var sec = Math.max(0, Math.ceil(run.prepT));
      if (sec !== run.lastSec) { run.lastSec = sec; UI.setStartLabel(sec); }
      if (run.prepT <= 0) autoStartWave();
    }

    if (run && run.phase === 'battle' && run.battle) {
      acc += dt;
      var res = 'ongoing';
      while (acc >= 1 / 60 && res === 'ongoing') {
        res = B.step(run.battle, 1 / 60);
        acc -= 1 / 60;
      }
      if (res !== 'ongoing') {
        run.phase = 'ended'; // 승패 연출 잠깐 보여준 뒤 진행
        (function (r) { setTimeout(function () { onWaveEnd(r); }, 650); }(res));
      }
    }
    if (run) {
      UI.render({
        mode: (run.phase === 'battle' || run.phase === 'ended') ? 'battle' : 'prep',
        board: run.board, battle: run.battle,
        hints: mergeHints(), drag: drag, dropZone: dropZone,
        time: now / 1000
      });
    }
    requestAnimationFrame(frame);
  }

  // ---- 초기화 ----
  UI.initInput(document.getElementById('game-canvas'), {
    onDragStart: onDragStart, onDragMove: onDragMove, onDragEnd: onDragEnd
  });
  document.getElementById('btn-start').onclick = function () {
    if (run && run.phase === 'prep') startWave();
  };
  document.getElementById('btn-reroll').onclick = rerollShop;
  document.getElementById('btn-exit').onclick = toMain;
  document.getElementById('btn-to-main').onclick = toMain;

  toMain();
  requestAnimationFrame(frame);

  // ---- 데모 모드 (index.html?demo=1): 자동 진행 — 헤드리스 검증·시연용 ----
  if (location.search.indexOf('demo') >= 0) {
    startChapter(0);
    setInterval(function () {
      if (!run) return;
      if (run.phase === 'prep') {
        var cardEl = document.querySelector('#draft-cards .card:not(.off):not(.sold)');
        if (cardEl) cardEl.click();
        else document.getElementById('btn-start').click();
      }
    }, 400);
  }
}());
