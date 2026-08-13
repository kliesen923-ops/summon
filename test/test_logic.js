/* =========================================================
 * 프로젝트 서몬 프로토타입 — Node 스모크 테스트
 * 실행: node test/test_logic.js
 *  1) 스탯 사다리 = 기준표 v0.1 조견표 대조
 *  2) 머지/진화 규칙 전수 검사
 *  3) 드래프트 티어 스케일링
 *  4) 그리디 봇 헤드리스 클리어 시뮬 (난이도 곡선)
 * ========================================================= */
'use strict';
require('../js/data.js');
require('../js/logic.js');
require('../js/battle.js');
var D = globalThis.DATA, L = globalThis.LOGIC, B = globalThis.BATTLE;

var fails = 0;
function eq(label, got, want) {
  var ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log('FAIL ' + label + ' : got ' + JSON.stringify(got) + ' want ' + JSON.stringify(want)); }
}
function ok(label, cond) { if (!cond) { fails++; console.log('FAIL ' + label); } }

// ---- 1) 스탯 조견표 대조 (기준표 §4 확정값 표본) ----
function hpatk(id, star) { var s = L.statsFor(id, star); return [s.hp, s.atk]; }
eq('나이트 ★1', hpatk('knight', 1), [240, 10]);
eq('나이트 ★3', hpatk('knight', 3), [540, 23]);
eq('워리어 ★2', hpatk('warrior', 2), [225, 23]);
eq('아처 ★3', hpatk('archer', 3), [235, 34]);
eq('메이지 ★2', hpatk('mage', 2), [135, 33]);
eq('클레릭 ★1', hpatk('cleric', 1), [135, 8]);
eq('로그 ★1', hpatk('rogue', 1), [105, 13]);
eq('서머너 ★1', hpatk('summoner', 1), [90, 9]);
eq('그랜드나이트 ★1(T2)', hpatk('grandknight', 1), [810, 34]);
eq('버서커 ★2(T2)', hpatk('berserker', 2), [760, 76]);
eq('호크아이 ★1(T2)', hpatk('hawkeye', 1), [355, 51]);
eq('하이메이지 ★1(T2)', hpatk('highmage', 1), [305, 74]);
eq('비숍 ★1(T2)', hpatk('bishop', 1), [455, 27]);
eq('어쌔신 ★1(T2)', hpatk('assassin', 1), [355, 44]);
eq('하이서머너 ★1(T2)', hpatk('highsummoner', 1), [305, 30]);
ok('호크아이 사거리 오버라이드 8칸', L.statsFor('hawkeye', 1).range === 8);
ok('아발리스트 사거리 4칸', L.statsFor('arbalist', 1).range === 4);
ok('클레릭 HPS 8', L.statsFor('cleric', 1).hps === 8);
ok('비숍 HPS 27 (사다리 적용)', L.statsFor('bishop', 1).hps === 27);
ok('유닛 총 35종', Object.keys(D.UNITS).length === 35);
ok('진화표 28종', Object.keys(D.EVOLUTION).length === 28);

// ---- 2) 머지/진화 규칙 ----
eq('동일 유닛 성급 상승', L.mergeResult('knight', 1, 'knight', 1), { type: 'star', unitId: 'knight', star: 2 });
eq('성급 다르면 무반응', L.mergeResult('knight', 1, 'knight', 2), null);
eq('T1 상한 ★3에서 동일유닛 = 순혈 진화', L.mergeResult('knight', 3, 'knight', 3), { type: 'evolve', unitId: 'grandknight' });
eq('비최대 이종 무반응', L.mergeResult('knight', 1, 'warrior', 1), null);
eq('T2 성급 상승', L.mergeResult('gladiator', 1, 'gladiator', 1), { type: 'star', unitId: 'gladiator', star: 2 });
eq('T2 최대성급 쌍 무반응(T3 미구현)', L.mergeResult('gladiator', 2, 'gladiator', 2), null);
eq('티어 혼합 최대성급 무반응', L.mergeResult('knight', 3, 'gladiator', 2), null);
// 클래스 쌍 → T2 전 28종 (매트릭스 v1.5 §2 전수)
var pairs = {
  'knight+knight': 'grandknight', 'warrior+warrior': 'berserker', 'archer+archer': 'hawkeye',
  'mage+mage': 'highmage', 'cleric+cleric': 'bishop', 'rogue+rogue': 'assassin',
  'summoner+summoner': 'highsummoner',
  'knight+warrior': 'gladiator', 'knight+archer': 'arbalist', 'knight+mage': 'spellblade',
  'knight+cleric': 'paladin', 'knight+rogue': 'slayer', 'knight+summoner': 'greenknight',
  'warrior+archer': 'tomahawk', 'warrior+mage': 'runeblade', 'warrior+cleric': 'monk',
  'warrior+rogue': 'ronin', 'warrior+summoner': 'shaman',
  'archer+mage': 'spellarcher', 'archer+cleric': 'holyarcher', 'archer+rogue': 'sniper',
  'archer+summoner': 'windarcher',
  'mage+cleric': 'sage', 'mage+rogue': 'warlock', 'mage+summoner': 'conjurer',
  'cleric+rogue': 'exorcist', 'cleric+summoner': 'druid', 'rogue+summoner': 'hunter'
};
Object.keys(pairs).forEach(function (k) {
  var p = k.split('+');
  var r = L.mergeResult(p[0], 3, p[1], 3);
  eq('진화 ' + k, r && r.unitId, pairs[k]);
  var r2 = L.mergeResult(p[1], 3, p[0], 3); // 순서 무관
  eq('진화(역순) ' + k, r2 && r2.unitId, pairs[k]);
});

// ---- 2.5) 판매가 (투자 매몰비 = 2^머지단계) ----
eq('판매가 T1★1', L.sellValue('knight', 1), 1);
eq('판매가 T1★2', L.sellValue('knight', 2), 2);
eq('판매가 T1★3', L.sellValue('knight', 3), 4);
eq('판매가 T2★1', L.sellValue('grandknight', 1), 8);
eq('판매가 T2★2', L.sellValue('grandknight', 2), 16);

// ---- 3) 드래프트 스케일링 ----
(function () {
  var rng = L.makeRng(42), t2w1 = 0, t2w5 = 0, N = 3000;
  for (var i = 0; i < N; i++) {
    L.draftCards(1, rng).forEach(function (c) { if (D.UNITS[c].tier === 2) t2w1++; });
    L.draftCards(5, rng).forEach(function (c) { if (D.UNITS[c].tier === 2) t2w5++; });
  }
  ok('웨이브1 T2 없음', t2w1 === 0);
  var rate = t2w5 / (N * 3);
  ok('웨이브5 T2 ≈ 40% (실측 ' + (rate * 100).toFixed(1) + '%)', rate > 0.36 && rate < 0.44);
}());

// ---- 4) 그리디 봇 헤드리스 시뮬 ----
function frontArch(arch) { return arch === 'tank' || arch === 'melee' || arch === 'assassin'; }

function placeUnit(board, unitId) {
  var arch = D.UNITS[unitId].arch;
  var prefRow = frontArch(arch) ? 0 : 1;
  var rows = [prefRow, 1 - prefRow];
  for (var r = 0; r < 2; r++) for (var c = 0; c < 4; c++) {
    var row = rows[r];
    if (!board.some(function (u) { return u.row === row && u.col === c; })) {
      board.push({ unitId: unitId, star: 1, col: c, row: row });
      return true;
    }
  }
  return false;
}

function tryMerges(board) {
  var moved = true;
  while (moved) {
    moved = false;
    outer:
    for (var i = 0; i < board.length; i++) for (var j = i + 1; j < board.length; j++) {
      var a = board[i], b = board[j];
      var r = L.mergeResult(a.unitId, a.star, b.unitId, b.star);
      if (r) {
        a.unitId = r.unitId;
        a.star = r.type === 'star' ? r.star : 1;
        board.splice(j, 1);
        moved = true;
        break outer;
      }
    }
  }
}

function draftPick(board, cards) {
  // 1순위: 기존 ★1 동일 유닛과 즉시 머지 가능한 카드
  for (var i = 0; i < cards.length; i++) {
    if (board.some(function (u) { return u.unitId === cards[i] && u.star === 1; })) return cards[i];
  }
  return board.length < 8 ? cards[0] : null; // 만석이면 스킵
}

function runStage(chIdx, stIdx, seed) {
  var rng = L.makeRng(seed);
  var board = [];
  function draft(wave) {
    var boardIds = board.map(function (u) { return u.unitId; });
    var pick = draftPick(board, L.draftCards(wave, rng, boardIds));
    if (pick) { placeUnit(board, pick); tryMerges(board); }
  }
  draft(1); draft(1); // 런 시작 2회
  for (var w = 1; w <= D.WAVES_PER_STAGE; w++) {
    var st = B.createBattle(board, L.makeWave(chIdx, stIdx, w, rng), Math.floor(rng() * 1e9));
    var res = 'ongoing';
    while (res === 'ongoing') res = B.step(st, 1 / 30);
    if (res === 'lose') return { win: false, wave: w };
    if (w < D.WAVES_PER_STAGE) draft(w + 1);
  }
  return { win: true, wave: D.WAVES_PER_STAGE };
}

console.log('\n--- 그리디 봇 클리어 시뮬 (스테이지당 40시드) ---');
var N = 40;
var rates = [];
for (var ch = 0; ch < 2; ch++) {
  for (var stg = 0; stg < 3; stg++) {
    var wins = 0, waveSum = 0;
    for (var s = 0; s < N; s++) {
      var r = runStage(ch, stg, 1000 + ch * 100 + stg * 10 + s);
      if (r.win) wins++;
      waveSum += r.wave;
    }
    var rate = wins / N;
    rates.push(rate);
    console.log('챕터' + (ch + 1) + '-' + (stg + 1) + ' : 승률 ' + (rate * 100).toFixed(0) +
      '% / 평균 도달 웨이브 ' + (waveSum / N).toFixed(1));
  }
}
ok('챕터1-1 봇 승률 85% 이상 (실측 ' + (rates[0] * 100).toFixed(0) + '%)', rates[0] >= 0.85);
ok('난이도 단조 상승(챕터1-1 > 챕터2-3)', rates[0] > rates[5]);
ok('챕터2-3 봇에게 고난도 (승률 60% 미만, 실측 ' + (rates[5] * 100).toFixed(0) + '%)', rates[5] < 0.6);

console.log(fails === 0 ? '\nALL PASS' : '\n' + fails + ' FAILURES');
process.exit(fails === 0 ? 0 : 1);
