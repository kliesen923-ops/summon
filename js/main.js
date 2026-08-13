/* =========================================================
 * 프로젝트 서몬 프로토타입 — main.js
 * 화면 상태머신 · 런 진행 · 벤치/판매/골드 관리 · 저장 · 게임 루프
 * 흐름: MAIN → STAGE(드래프트→배치→전투 ×6웨이브) → RESULT → MAIN
 * 유닛 관리: 보드 8칸(출전) + 벤치 8칸(대기) + 판매 존(골드) + 골드 리롤
 * ========================================================= */
(function () {
  'use strict';
  var D = window.DATA, L = window.LOGIC, B = window.BATTLE, UI = window.UI;
  var SAVE_KEY = 'summon_proto_save';
  var REROLL_COST = 2;

  var progress = loadSave();
  var run = null;
  var drag = null, dropZone = null;

  // ---- 저장 ----
  function loadSave() {
    try {
      var s = localStorage.getItem(SAVE_KEY);
      return s ? JSON.parse(s) : { cleared: [] };
    } catch (e) { return { cleared: [] }; }
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  // ---- 화면 전환 ----
  function toMain() {
    run = null; drag = null; dropZone = null;
    UI.buildMain(progress, startStage, function () {
      progress = { cleared: [] }; save(); toMain();
    });
    UI.showScreen('main');
  }

  function stageLabel() {
    var ch = D.CHAPTERS[run.chIdx];
    return ch.id + '장 ' + ch.name + ' · 스테이지 ' + (run.stIdx + 1);
  }

  // ---- 유닛 컬렉션 헬퍼 (보드 + 벤치) ----
  function allEntries() { return run.board.concat(run.bench); }
  function findByUid(uid) {
    var all = allEntries();
    for (var i = 0; i < all.length; i++) if (all[i].uid === uid) return all[i];
    return null;
  }
  function collectionOf(e) { return run.board.indexOf(e) >= 0 ? run.board : run.bench; }
  function zoneOfEntry(e) {
    return collectionOf(e) === run.board
      ? { type: 'cell', col: e.col, row: e.row }
      : { type: 'bench', slot: e.slot };
  }
  function detach(e) {
    var c = collectionOf(e);
    c.splice(c.indexOf(e), 1);
  }
  function attach(e, zone) {
    if (zone.type === 'cell') { e.col = zone.col; e.row = zone.row; run.board.push(e); }
    else { e.slot = zone.slot; run.bench.push(e); }
  }
  function entryAtZone(zone) {
    var i;
    if (!zone) return null;
    if (zone.type === 'cell') {
      for (i = 0; i < run.board.length; i++) {
        if (run.board[i].col === zone.col && run.board[i].row === zone.row) return run.board[i];
      }
    } else if (zone.type === 'bench') {
      for (i = 0; i < run.bench.length; i++) {
        if (run.bench[i].slot === zone.slot) return run.bench[i];
      }
    }
    return null;
  }

  // ---- 런(스테이지) 진행 ----
  function startStage(ci, si) {
    run = {
      chIdx: ci, stIdx: si, wave: 1,
      board: [], bench: [], gold: 0, nextUid: 1,
      phase: 'draft', pendingDrafts: D.DRAFT.startPicks,
      battle: null, rng: L.makeRng(Date.now() % 1e9)
    };
    UI.showScreen('game');
    UI.setTopbar(stageLabel(), '웨이브 1/' + D.WAVES_PER_STAGE);
    UI.setGold(0);
    beginDraft();
  }

  function canTakeCard(cid) {
    if (run.board.length < 8 || run.bench.length < 8) return true;
    return allEntries().some(function (u) {
      return !!L.mergeResult(u.unitId, u.star, cid, 1);
    });
  }

  function updateReroll() {
    document.getElementById('btn-reroll').disabled = !run || run.gold < REROLL_COST;
  }

  function beginDraft() {
    run.phase = 'draft';
    UI.setPanelMsg('유닛 선택 — 3택 1' + (run.pendingDrafts > 1 ? ' (' + run.pendingDrafts + '회 남음)' : ''));
    var ownedIds = allEntries().map(function (u) { return u.unitId; });
    UI.showDraft(L.draftCards(run.wave, run.rng, ownedIds), canTakeCard, onPick);
    UI.setButtons(false, true, true);
    updateReroll();
  }

  function onPick(cid) {
    placeCard(cid);
    afterDraftStep();
  }

  function afterDraftStep() {
    run.pendingDrafts--;
    if (run.pendingDrafts > 0) beginDraft();
    else prepPhase();
  }

  // 카드 수급: 보드 우선 자동 배치 → 만석이면 벤치 → 둘 다 만석이면 즉시 머지
  function placeCard(cid) {
    if (run.board.length < 8) { placePreferred(cid); return; }
    if (run.bench.length < 8) { pushBench(cid); return; }
    mergeIntoAny(cid);
  }

  function placePreferred(cid) {
    var arch = D.UNITS[cid].arch;
    var front = (arch === 'tank' || arch === 'melee' || arch === 'assassin');
    var rows = front ? [0, 1] : [1, 0];
    for (var ri = 0; ri < 2; ri++) for (var c = 0; c < 4; c++) {
      var row = rows[ri];
      if (!entryAtZone({ type: 'cell', col: c, row: row })) {
        run.board.push({ uid: run.nextUid++, unitId: cid, star: 1, col: c, row: row, slot: 0 });
        return;
      }
    }
  }

  function pushBench(cid) {
    for (var s = 0; s < 8; s++) {
      if (!entryAtZone({ type: 'bench', slot: s })) {
        run.bench.push({ uid: run.nextUid++, unitId: cid, star: 1, slot: s, col: 0, row: 0 });
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

  function prepPhase() {
    run.phase = 'prep';
    UI.clearDraft();
    var info = run.wave === D.BOSS_WAVE
      ? '👹 보스 출현!'
      : '적 ' + D.CHAPTERS[run.chIdx].countFor(run.wave) + '마리';
    UI.setPanelMsg('웨이브 ' + run.wave + '/' + D.WAVES_PER_STAGE + ' — ' + info + ' · 드래그: 배치·머지·판매(💰)');
    UI.setButtons(true, false, false);
  }

  function startWave() {
    if (run.board.length === 0) {
      UI.setPanelMsg('보드에 유닛이 없습니다 — 벤치에서 올려 주세요');
      return;
    }
    run.phase = 'battle';
    UI.setButtons(false, false, false);
    UI.setPanelMsg('⚔ 웨이브 ' + run.wave + ' 전투 중...');
    var enemies = L.makeWave(run.chIdx, run.stIdx, run.wave, run.rng);
    run.battle = B.createBattle(run.board, enemies, Math.floor(run.rng() * 1e9));
  }

  function onWaveEnd(res) {
    if (!run) return; // 나가기로 이미 이탈
    if (res === 'win') {
      if (run.wave >= D.WAVES_PER_STAGE) {
        var key = D.CHAPTERS[run.chIdx].id + '-' + (run.stIdx + 1);
        if (progress.cleared.indexOf(key) < 0) { progress.cleared.push(key); save(); }
        UI.showResult(true, run.wave, stageLabel());
      } else {
        run.wave++;
        run.battle = null;
        run.pendingDrafts = 1;
        UI.setTopbar(stageLabel(), '웨이브 ' + run.wave + '/' + D.WAVES_PER_STAGE);
        beginDraft();
      }
    } else {
      UI.showResult(false, run.wave, stageLabel());
    }
  }

  // ---- 머지 힌트 (보드+벤치 전체, 관리 가능 단계에만) ----
  function canManage() { return run && (run.phase === 'prep' || run.phase === 'draft'); }

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

  // ---- 드래그: 배치·스왑·머지·판매 (준비/드래프트 단계 전용) ----
  function onDragStart(zone, p) {
    if (!canManage() || !zone || zone.type === 'sell') return;
    var b = entryAtZone(zone);
    if (!b) return;
    drag = { uid: b.uid, unitId: b.unitId, star: b.star, x: p.x, y: p.y };
  }
  function onDragMove(p, zone) {
    if (drag) { drag.x = p.x; drag.y = p.y; dropZone = zone; }
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
    UI.setPanelMsg(D.UNITS[e.unitId].name + ' 판매 +' + v + 'G' +
      (run.phase === 'draft' ? ' — 리롤 ' + REROLL_COST + 'G' : ''));
    updateReroll();
  }

  function rerollDraft() {
    if (!run || run.phase !== 'draft' || run.gold < REROLL_COST) return;
    run.gold -= REROLL_COST;
    UI.setGold(run.gold);
    beginDraft(); // 같은 웨이브 풀로 3장 재추첨 (pendingDrafts 소모 없음)
  }

  // ---- 게임 루프 (고정 틱 1/60) ----
  var last = performance.now(), acc = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
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
        board: run.board, bench: run.bench, battle: run.battle,
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
  document.getElementById('btn-skip').onclick = function () {
    if (run && run.phase === 'draft') afterDraftStep();
  };
  document.getElementById('btn-reroll').onclick = rerollDraft;
  document.getElementById('btn-exit').onclick = toMain;
  document.getElementById('btn-to-main').onclick = toMain;

  toMain();
  requestAnimationFrame(frame);

  // ---- 데모 모드 (index.html?demo=1): 자동 진행 — 헤드리스 검증·시연용 ----
  if (location.search.indexOf('demo') >= 0) {
    startStage(0, 0);
    setInterval(function () {
      if (!run) return;
      if (run.phase === 'draft') {
        var cardEl = document.querySelector('#draft-cards .card:not(.off)');
        if (cardEl) cardEl.click(); else afterDraftStep();
      } else if (run.phase === 'prep') {
        document.getElementById('btn-start').click();
      }
    }, 400);
  }
}());
