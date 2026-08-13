/* =========================================================
 * 프로젝트 서몬 프로토타입 — Node 스모크 테스트
 * 실행: node test/test_logic.js
 *  1) 스탯 사다리 = 기준표 v0.1 조견표 대조
 *  2) 머지/진화 규칙 전수 검사 + 판매가
 *  3) 상점 롤 (티어 스케일링·가격·랜덤 카드)
 *  4) 그리디 봇 헤드리스 클리어 시뮬 (상점·골드 경제, 난이도 곡선)
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
// 성급 통일 사다리 (v0.8): n = (티어-1)×3 + (성급-1)
eq('버서커 ★3 (n=5)', hpatk('berserker', 3), [1140, 114]);
eq('센티넬 ★1 (n=6, T3 탱킹)', hpatk('sentinel', 1), [2735, 114]);
eq('워로드 ★1 (T3 근접딜)', hpatk('warlord', 1), [1710, 171]);
eq('스톰레인저 ★1 (T3 원거리)', hpatk('stormranger', 1), [1195, 171]);
eq('아크메이지 ★1 (T3 광역)', hpatk('archmage', 1), [1025, 251]);
eq('세인트 ★1 (T3 지원힐)', hpatk('saint', 1), [1540, 91]);
eq('팬텀 ★1 (T3 암살)', hpatk('phantom', 1), [1195, 148]);
eq('스피릿로드 ★1 (T3 소환)', hpatk('spiritlord', 1), [1025, 103]);
eq('워로드 ★3 (n=8, 최상단)', hpatk('warlord', 3), [3845, 384]);
ok('세인트 HPS 91', L.statsFor('saint', 1).hps === 91);
ok('전 티어 성급 상한 3', D.STAR_CAP[1] === 3 && D.STAR_CAP[2] === 3 && D.STAR_CAP[3] === 3);
ok('유닛 총 63종 (7+28+28)', Object.keys(D.UNITS).length === 63);
ok('진화표 T2 28종', Object.keys(D.EVOLUTION[2]).length === 28);
ok('진화표 T3 28종', Object.keys(D.EVOLUTION[3]).length === 28);

// ---- 2) 머지/진화 규칙 ----
eq('동일 유닛 성급 상승', L.mergeResult('knight', 1, 'knight', 1), { type: 'star', unitId: 'knight', star: 2 });
eq('성급 다르면 무반응', L.mergeResult('knight', 1, 'knight', 2), null);
eq('T1 상한 ★3에서 동일유닛 = 순혈 진화', L.mergeResult('knight', 3, 'knight', 3), { type: 'evolve', unitId: 'grandknight' });
eq('비최대 이종 무반응', L.mergeResult('knight', 1, 'warrior', 1), null);
eq('T2 성급 상승', L.mergeResult('gladiator', 1, 'gladiator', 1), { type: 'star', unitId: 'gladiator', star: 2 });
eq('T2★2 = ★3 상승 (성급 통일)', L.mergeResult('gladiator', 2, 'gladiator', 2), { type: 'star', unitId: 'gladiator', star: 3 });
eq('T2★3 동일유닛 = T3 순혈 진화', L.mergeResult('gladiator', 3, 'gladiator', 3), { type: 'evolve', unitId: 'warlord' });
eq('티어 혼합 ★3 무반응', L.mergeResult('knight', 3, 'gladiator', 3), null);
eq('T3 성급 상승', L.mergeResult('sentinel', 1, 'sentinel', 1), { type: 'star', unitId: 'sentinel', star: 2 });
eq('T3★3 쌍 무반응(T4 미구현)', L.mergeResult('sentinel', 3, 'sentinel', 3), null);
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

// ---- 2.5) 판매가 (투자 매몰비 = 2^머지단계, 상한 16) ----
eq('판매가 T1★1', L.sellValue('knight', 1), 1);
eq('판매가 T1★2', L.sellValue('knight', 2), 2);
eq('판매가 T1★3', L.sellValue('knight', 3), 4);
eq('판매가 T2★1', L.sellValue('grandknight', 1), 8);
eq('판매가 T2★2', L.sellValue('grandknight', 2), 16);
eq('판매가 T2★3 상한 16', L.sellValue('grandknight', 3), 16);
eq('판매가 T3 상한 16 (구매가 18G 차익 차단)', L.sellValue('sentinel', 1), 16);

// ---- 2.7) T2★3 조합 → T3 전 28쌍 (클래스 대표 T2 순혈 사용) ----
(function () {
  var rep = { K: 'grandknight', W: 'berserker', A: 'hawkeye', M: 'highmage',
              C: 'bishop', R: 'assassin', N: 'highsummoner' };
  Object.keys(D.EVOLUTION[3]).forEach(function (key) {
    var cls = key.split('+');
    var r = L.mergeResult(rep[cls[0]], 3, rep[cls[1]], 3);
    eq('T3 진화 ' + key, r && r.unitId, D.EVOLUTION[3][key]);
  });
}());

// ---- 3) 상점 롤 + 선택지 잠금 + 이자 ----
(function () {
  var rng = L.makeRng(42), t2early = 0, tierLate = { 1: 0, 2: 0, 3: 0 }, N = 2000;
  for (var i = 0; i < N; i++) {
    L.rollShop(null, 2, rng).forEach(function (s) { if (s.tier >= 2) t2early++; });
    L.rollShop(null, 10, rng).forEach(function (s) { tierLate[s.tier]++; });
  }
  ok('웨이브2 T2+ 슬롯 없음', t2early === 0);
  var t3rate = tierLate[3] / (N * 4);
  var t2rate = tierLate[2] / (N * 4);
  ok('웨이브10 T3 슬롯 ≈ 15% (실측 ' + (t3rate * 100).toFixed(1) + '%)', t3rate > 0.12 && t3rate < 0.18);
  ok('웨이브10 T2 슬롯 ≈ 34% (실측 ' + (t2rate * 100).toFixed(1) + '%)', t2rate > 0.30 && t2rate < 0.38);
  // 가격 매핑 검증
  var rng2 = L.makeRng(7), priceOk = true;
  var PRICE = { 1: [D.SHOP.priceT1, D.SHOP.priceRandT1], 2: [D.SHOP.priceT2, D.SHOP.priceRandT2],
                3: [D.SHOP.priceT3, D.SHOP.priceRandT3] };
  for (var j = 0; j < 500; j++) {
    L.rollShop(null, 10, rng2).forEach(function (s) {
      var want = PRICE[s.tier][s.kind === 'unit' ? 0 : 1];
      if (s.price !== want) priceOk = false;
    });
  }
  ok('슬롯 가격 매핑 (확정 3/9/18G·랜덤 2/7/14G)', priceOk);
  ok('랜덤가 < 확정가 (전 티어)', D.SHOP.priceRandT1 < D.SHOP.priceT1 &&
    D.SHOP.priceRandT2 < D.SHOP.priceT2 && D.SHOP.priceRandT3 < D.SHOP.priceT3);
  ok('확정 T3가 > 판매 상한', D.SHOP.priceT3 > 16);
  // 랜덤 카드 해석 티어 검증
  var rng3 = L.makeRng(9), tierOk = true;
  for (var k = 0; k < 200; k++) {
    if (D.UNITS[L.resolveShopUnit({ kind: 'randT1', tier: 1 }, rng3)].tier !== 1) tierOk = false;
    if (D.UNITS[L.resolveShopUnit({ kind: 'randT2', tier: 2 }, rng3)].tier !== 2) tierOk = false;
    if (D.UNITS[L.resolveShopUnit({ kind: 'randT3', tier: 3 }, rng3)].tier !== 3) tierOk = false;
  }
  ok('랜덤 카드 티어 해석', tierOk);
  // 선택지 잠금: 잠긴 슬롯은 재롤에서 유지, 판매된 잠금 슬롯은 교체
  var rng4 = L.makeRng(11);
  var shop = L.rollShop(null, 10, rng4);
  shop[1].locked = true;
  shop[2].locked = true; shop[2].sold = true;
  var next = L.rollShop(shop, 10, rng4);
  ok('잠긴 선택지 유지', next[1] === shop[1]);
  ok('판매된 잠금 선택지는 교체', next[2] !== shop[2]);
  ok('잠기지 않은 선택지는 교체', next[0] !== shop[0] || next[0].sold === false);
  // 이자 (10G당 +1, 상한 +5)
  eq('이자 0G', L.interestFor(0), 0);
  eq('이자 9G', L.interestFor(9), 0);
  eq('이자 10G', L.interestFor(10), 1);
  eq('이자 47G', L.interestFor(47), 4);
  eq('이자 상한(100G)', L.interestFor(100), 5);
}());

// ---- 4) 그리디 봇 헤드리스 시뮬 (상점·골드 경제) ----
function frontArch(arch) { return arch === 'tank' || arch === 'melee' || arch === 'assassin'; }

function tryMergesArmy(army) {
  var moved = true;
  while (moved) {
    moved = false;
    outer:
    for (var i = 0; i < army.length; i++) for (var j = i + 1; j < army.length; j++) {
      var r = L.mergeResult(army[i].unitId, army[i].star, army[j].unitId, army[j].star);
      if (r) {
        army[i].unitId = r.unitId;
        army[i].star = r.type === 'star' ? r.star : 1;
        army.splice(j, 1);
        moved = true;
        break outer;
      }
    }
  }
}

function makeRoster(army) {
  // 3×3 보드 전원 출전 (v0.8 벤치 폐지), 근접 앞줄 배치
  var roster = army.map(function (u) { return { unitId: u.unitId, star: u.star, col: 0, row: 0 }; });
  var taken = {};
  roster.forEach(function (u) {
    var rows = frontArch(D.UNITS[u.unitId].arch) ? [0, 1, 2] : [2, 1, 0];
    var done = false;
    for (var ri = 0; ri < 3 && !done; ri++) for (var c = 0; c < 3; c++) {
      var key = rows[ri] + ',' + c;
      if (!taken[key]) { taken[key] = 1; u.row = rows[ri]; u.col = c; done = true; break; }
    }
  });
  return roster;
}

function runChapter(chIdx, seed) {
  var rng = L.makeRng(seed);
  var army = [];                       // 보드+벤치 통합 풀 (상한 16)
  var gold = D.SHOP.startBonus;
  var lives = D.LIVES;
  var w = 1;
  while (w <= D.WAVES_PER_CHAPTER) {
    gold += D.SHOP.income + L.interestFor(gold);
    var shop = L.rollShop(null, w, rng);
    var bought = true;
    while (bought) {
      bought = false;
      for (var i = 0; i < shop.length; i++) {
        var s = shop[i];
        if (s.sold || s.price > gold) continue;
        var mergeable = s.kind === 'unit' && army.some(function (u) {
          return !!L.mergeResult(u.unitId, u.star, s.unitId, 1);
        });
        if (army.length >= 9 && !mergeable) continue; // 보드 9칸 (벤치 없음)
        gold -= s.price;
        s.sold = true;
        army.push({ unitId: L.resolveShopUnit(s, rng), star: 1 });
        tryMergesArmy(army);
        bought = true;
      }
    }
    var res = 'lose';
    if (army.length) {
      var st = B.createBattle(makeRoster(army), L.makeWave(chIdx, w, rng), Math.floor(rng() * 1e9));
      res = 'ongoing';
      while (res === 'ongoing') res = B.step(st, 1 / 30);
    }
    if (res === 'lose') {
      lives--;
      if (lives <= 0) return { win: false, wave: w, stars: 0 };
      // 같은 웨이브 재도전 (수입은 다음 루프에서 재지급)
    } else {
      w++;
    }
  }
  return { win: true, wave: D.WAVES_PER_CHAPTER, stars: lives };
}

console.log('\n--- 그리디 봇 클리어 시뮬 (챕터당 25시드, 목숨 3) ---');
var N = 25;
var rates = [];
for (var ch = 0; ch < D.CHAPTERS.length; ch++) {
  var wins = 0, waveSum = 0, starSum = 0;
  for (var s = 0; s < N; s++) {
    var r = runChapter(ch, 1000 + ch * 100 + s);
    if (r.win) { wins++; starSum += r.stars; }
    waveSum += r.wave;
  }
  var rate = wins / N;
  rates.push(rate);
  console.log('챕터' + (ch + 1) + ' : 승률 ' + (rate * 100).toFixed(0) +
    '% / 평균 도달 웨이브 ' + (waveSum / N).toFixed(1) +
    (wins ? ' / 평균 별 ' + (starSum / wins).toFixed(1) : ''));
}
ok('챕터1 봇 승률 85% 이상 (실측 ' + (rates[0] * 100).toFixed(0) + '%)', rates[0] >= 0.85);
ok('난이도 하강 곡선 (챕터1 > 챕터9)', rates[0] > rates[8]);
ok('챕터9 봇에게 고난도 (승률 40% 이하, 실측 ' + (rates[8] * 100).toFixed(0) + '%)', rates[8] <= 0.4);

console.log(fails === 0 ? '\nALL PASS' : '\n' + fails + ' FAILURES');
process.exit(fails === 0 ? 0 : 1);
