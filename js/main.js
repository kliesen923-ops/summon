/* =========================================================
 * 프로젝트 서몬 프로토타입 — main.js
 * 화면 상태머신 · 런 진행 · 상점/판매/골드 관리 · 저장 · 게임 루프
 * 흐름: MAIN → STAGE(준비[상점+배치, 제한시간] → 전투 ×12웨이브) → RESULT → MAIN
 * 상점(v0.5): 4슬롯 상시 노출, 구매해도 유지, 리롤로만 교체, 잠금 시 다음 웨이브에도 유지
 * 레벨(v0.9): 전투 참여 = +1Lv(보스 +2), Max끼리 = 진화, 레벨업권 = 필드 차지 아이템
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
  // 보드 엔트리: 유닛 {uid, unitId, lv, col, row} | 레벨업권 {uid, kind:'ticket', col, row}
  var BOARD_MAX = 9;
  function isTicket(e) { return e.kind === 'ticket'; }
  function unitEntries() { return run.board.filter(function (e) { return !isTicket(e); }); }
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
  function beginPrep(prefix) {
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
    var ch = D.CHAPTERS[run.chIdx];
    var modStr = (ch.mods || []).map(function (k) { return D.MODIFIERS[k].icon; }).join('');
    var info = (run.wave % D.BOSS_EVERY === 0
      ? '👹 보스 출현!'
      : '적 ' + ch.countFor(run.wave) + '마리') + (modStr ? ' ' + modStr : '');
    UI.setPanelMsg((prefix || '') + '웨이브 ' + run.wave + '/' + D.WAVES_PER_CHAPTER + ' — ' + info +
      ' · 수입 +' + D.SHOP.income + 'G' + (interest > 0 ? ' (이자 +' + interest + 'G)' : ''));
    UI.setButtons(true, true);
    refreshShop();
  }

  // ---- 상점 ----
  function canBuySlot(slot) {
    // 신규 구매는 항상 Lv.1이라 즉시 합성이 불가 — 빈칸이 있어야만 구매 가능
    return !slot.sold && slot.price <= run.gold && run.board.length < BOARD_MAX;
  }

  function buySlot(i) {
    if (!run || run.phase !== 'prep') return;
    var slot = run.shop[i];
    if (!slot || !canBuySlot(slot)) return;
    run.gold -= slot.price;
    slot.sold = true;
    if (slot.kind === 'ticket') {
      placeTicket();
      UI.setPanelMsg('🎫 레벨업권 구매 — 유닛에 겹치면 +1레벨');
    } else {
      var unitId = L.resolveShopUnit(slot, run.rng);
      placePreferred(unitId);
      if (slot.kind !== 'unit') UI.setPanelMsg('랜덤 카드 → ' + D.UNITS[unitId].name + '!');
    }
    UI.setGold(run.gold);
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

  // 유닛 자동 배치: 근접 앞줄, 원거리·지원 뒷줄
  function placePreferred(cid) {
    var arch = D.UNITS[cid].arch;
    var front = (arch === 'tank' || arch === 'melee' || arch === 'assassin');
    var rows = front ? [0, 1, 2] : [2, 1, 0];
    var zone = freeCell(rows);
    if (zone) run.board.push({ uid: run.nextUid++, unitId: cid, lv: 1, col: zone.col, row: zone.row });
  }

  // 레벨업권 배치: 전투에 안 나가는 아이템이라 뒷줄부터
  function placeTicket() {
    var zone = freeCell([2, 1, 0]);
    if (zone) run.board.push({ uid: run.nextUid++, kind: 'ticket', col: zone.col, row: zone.row });
  }

  function freeCell(rows) {
    for (var ri = 0; ri < 3; ri++) for (var c = 0; c < 3; c++) {
      var z = { type: 'cell', col: c, row: rows[ri] };
      if (!entryAtZone(z)) return z;
    }
    return null;
  }

  // ---- 전투 ----
  function startWave() {
    if (unitEntries().length === 0) {
      // 유닛 없이 강행 = 즉시 패배 처리 (향후 콘텐츠 대비 선작업)
      if (window.confirm('배치된 유닛이 없습니다.\n이대로 진행하면 즉시 패배합니다. 진행할까요?')) {
        loseLife();
      }
      return;
    }
    run.phase = 'battle';
    UI.setButtons(false, false);
    UI.hideTooltip();
    UI.clearShop();
    UI.setPanelMsg('⚔ 웨이브 ' + run.wave + ' 전투 중...');
    var enemies = L.makeWave(run.chIdx, run.wave, run.rng);
    run.battle = B.createBattle(unitEntries(), enemies, Math.floor(run.rng() * 1e9));
  }

  // 제한시간 초과: 전투 가능한 유닛이 없으면(구매 전무) 목숨 소실 처리
  function autoStartWave() {
    if (unitEntries().length === 0) {
      loseLife();
      return;
    }
    startWave();
  }

  // 웨이브 종료 레벨업 (v0.9): 승패 무관 전투 참여 유닛 전원 +1Lv, 보스 +2Lv
  function levelUpBoard() {
    var isBoss = run.wave % D.BOSS_EVERY === 0;
    var maxed = 0;
    unitEntries().forEach(function (e) {
      e.lv = L.levelAfterWave(e.unitId, e.lv, isBoss);
      if (e.lv === D.LV_MAX[D.UNITS[e.unitId].tier]) maxed++;
    });
    return { isBoss: isBoss, maxed: maxed };
  }

  // 전멸: 목숨 1 소멸. 남으면 같은 웨이브를 재정비 후 재도전 (수입은 지급)
  function loseLife(extra) {
    run.lives--;
    UI.setLives(run.lives);
    if (run.lives <= 0) {
      run.phase = 'ended';
      UI.showResult(false, run.wave, chapterLabel());
      return;
    }
    beginPrep(); // 같은 웨이브 유지 — 수입·이자 받고 파티 재정비
    UI.setPanelMsg('💔 전멸! 남은 목숨 ' + run.lives + ' — 웨이브 ' + run.wave + ' 재도전' + (extra || ''));
  }

  function onWaveEnd(res) {
    if (!run) return; // 나가기로 이미 이탈
    var lu = levelUpBoard(); // 전투 참여 = 승패 무관 레벨업
    if (res === 'win') {
      if (run.wave >= D.WAVES_PER_CHAPTER) {
        var chId = D.CHAPTERS[run.chIdx].id;
        var stars = run.lives; // 남은 목숨 = 별점 (무피해 = ⭐3)
        if ((progress.stars[chId] || 0) < stars) { progress.stars[chId] = stars; save(); }
        UI.showResult(true, run.wave, chapterLabel(), stars);
      } else {
        run.wave++;
        beginPrep(lu.isBoss ? '📈 보스 격파 +2Lv! · ' : '📈 참여 유닛 +1Lv · ');
      }
    } else {
      loseLife(' (참여 유닛 +' + (lu.isBoss ? 2 : 1) + 'Lv)');
    }
  }

  // ---- 진화 힌트 (같은 티어 Max 쌍, 준비 단계에만) ----
  function canManage() { return run && run.phase === 'prep'; }

  function mergeHints() {
    var s = new Set();
    if (!canManage()) return s;
    var list = unitEntries();
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
      if (L.mergeResult(list[i].unitId, list[i].lv, list[j].unitId, list[j].lv)) {
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
    drag = { uid: b.uid, kind: b.kind, unitId: b.unitId, lv: b.lv, x: p.x, y: p.y };
  }
  function onDragMove(p, zone) {
    if (drag) {
      drag.x = p.x; drag.y = p.y; dropZone = zone;
      UI.hideTooltip();
      return;
    }
    updateHover(p, zone);
  }

  // 호버 툴팁: 준비 = 보드 유닛·레벨업권 / 전투 = 살아있는 유닛 (스탯·스킬 정보)
  function updateHover(p, zone) {
    if (!run) return;
    if (run.phase === 'prep') {
      var e = (zone && zone.type !== 'sell') ? entryAtZone(zone) : null;
      if (e) {
        if (isTicket(e)) UI.showTicketTooltip(p.x, p.y);
        else UI.showUnitTooltip(e.unitId, e.lv, p.x, p.y);
        return;
      }
    } else if (run.phase === 'battle' && run.battle) {
      var best = null, bd = 27;
      run.battle.units.forEach(function (u) {
        if (!u.alive || u.isSpirit) return;
        var d = Math.sqrt((u.x - p.x) * (u.x - p.x) + (u.y - p.y) * (u.y - p.y));
        if (d < bd) { bd = d; best = u; }
      });
      if (best) {
        UI.showUnitTooltip(best.unitId, best.lv, p.x, p.y, { hp: best.hp, mana: best.mana });
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

    // 레벨업권 → 유닛: +1Lv 후 소모 (Max 유닛에는 사용 불가 → 스왑)
    if (isTicket(src) && !isTicket(dst)) {
      if (dst.lv < D.LV_MAX[D.UNITS[dst.unitId].tier]) {
        dst.lv++;
        detach(src);
        UI.setPanelMsg('🎫 ' + D.UNITS[dst.unitId].name + ' → Lv.' + dst.lv + '!');
        refreshShop();
      } else {
        swapLoc(src, dst);
      }
      return;
    }
    if (isTicket(src) || isTicket(dst)) { swapLoc(src, dst); return; }

    var r = L.mergeResult(dst.unitId, dst.lv, src.unitId, src.lv);
    if (r) applyMerge(src, dst, r);
    else swapLoc(src, dst);
  }

  // 드래그 중 결과 미리보기 (v1.0): 진화 결과 / 레벨업권 사용 결과
  function dragPreview() {
    if (!drag || !dropZone || dropZone.type !== 'cell' || !canManage()) return null;
    var src = findByUid(drag.uid);
    var dst = entryAtZone(dropZone);
    if (!src || !dst || dst === src) return null;
    if (isTicket(src) && !isTicket(dst)) {
      if (dst.lv < D.LV_MAX[D.UNITS[dst.unitId].tier]) {
        return { unitId: dst.unitId, lv: dst.lv + 1, col: dst.col, row: dst.row,
                 label: '🎫 Lv.' + (dst.lv + 1) };
      }
      return null;
    }
    if (isTicket(src) || isTicket(dst)) return null;
    var r = L.mergeResult(dst.unitId, dst.lv, src.unitId, src.lv);
    if (r) return { unitId: r.unitId, lv: 1, col: dst.col, row: dst.row,
                    label: '✨ ' + D.UNITS[r.unitId].name };
    return null;
  }

  function swapLoc(a, b) {
    var za = zoneOfEntry(a), zb = zoneOfEntry(b);
    detach(a); detach(b);
    attach(a, zb); attach(b, za);
  }

  function applyMerge(src, dst, r) {
    dst.unitId = r.unitId;
    dst.lv = 1; // 진화 = 상위 티어 Lv.1
    detach(src);
    UI.setPanelMsg('✨ 진화! → ' + D.UNITS[r.unitId].name);
  }

  function sellEntry(e) {
    var v = isTicket(e) ? D.SHOP.sell.ticket : L.sellValue(e.unitId, e.lv);
    detach(e);
    run.gold += v;
    UI.setGold(run.gold);
    UI.setPanelMsg((isTicket(e) ? D.TICKET.name : D.UNITS[e.unitId].name) + ' 판매 +' + v + 'G');
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
      if (run.battle.overtime && !run.battle.otMsg) {
        run.battle.otMsg = true;
        UI.setPanelMsg('⚡ 광폭화! 전원 공속·이속 2배 — 결판을 내라!');
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
        preview: dragPreview(),
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
        // 보유 레벨업권은 첫 비Max 유닛에 즉시 사용
        var tk = run.board.filter(isTicket)[0];
        var target = unitEntries().filter(function (e) {
          return e.lv < D.LV_MAX[D.UNITS[e.unitId].tier];
        })[0];
        if (tk && target) { target.lv++; detach(tk); return; }
        var cardEl = document.querySelector('#draft-cards .card:not(.off):not(.sold)');
        if (cardEl) cardEl.click();
        else document.getElementById('btn-start').click();
      }
    }, 400);
  }
}());
