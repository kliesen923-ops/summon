/* =========================================================
 * 프로젝트 서몬 프로토타입 — Node 스모크 테스트
 * 실행: node test/test_logic.js
 *  1) 스탯 사다리 = 기준표 조견표 대조 (레벨 = 구 성급 사다리 재사용)
 *  2) 진화 규칙 전수 검사 + 레벨업 + 판매가
 *  3) 상점 롤 (티어 스케일링·가격·랜덤 카드·레벨업권)
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

// ---- 1) 스탯 조견표 대조 (기준표 §4 확정값 표본 — Lv 사다리 n=(티어-1)×3+(Lv-1)) ----
function hpatk(id, lv) { var s = L.statsFor(id, lv); return [s.hp, s.atk]; }
eq('나이트 Lv1', hpatk('knight', 1), [240, 10]);
eq('나이트 Lv3', hpatk('knight', 3), [540, 23]);
eq('워리어 Lv2', hpatk('warrior', 2), [225, 23]);
eq('아처 Lv3', hpatk('archer', 3), [235, 34]);
eq('메이지 Lv2', hpatk('mage', 2), [135, 33]);
eq('클레릭 Lv1', hpatk('cleric', 1), [135, 8]);
eq('로그 Lv1', hpatk('rogue', 1), [105, 13]);
eq('서머너 Lv1', hpatk('summoner', 1), [90, 9]);
eq('그랜드나이트 Lv1(T2)', hpatk('grandknight', 1), [810, 34]);
eq('버서커 Lv2(T2)', hpatk('berserker', 2), [760, 76]);
eq('호크아이 Lv1(T2)', hpatk('hawkeye', 1), [355, 51]);
eq('하이메이지 Lv1(T2)', hpatk('highmage', 1), [305, 74]);
eq('비숍 Lv1(T2)', hpatk('bishop', 1), [455, 27]);
eq('어쌔신 Lv1(T2)', hpatk('assassin', 1), [355, 44]);
eq('하이서머너 Lv1(T2)', hpatk('highsummoner', 1), [305, 30]);
ok('호크아이 사거리 오버라이드 8칸', L.statsFor('hawkeye', 1).range === 8);
ok('아발리스트 사거리 4칸', L.statsFor('arbalist', 1).range === 4);
ok('클레릭 HPS 8', L.statsFor('cleric', 1).hps === 8);
ok('비숍 HPS 27 (사다리 적용)', L.statsFor('bishop', 1).hps === 27);
eq('버서커 Lv3 (n=5)', hpatk('berserker', 3), [1140, 114]);
eq('센티넬 Lv1 (n=6, T3 탱킹)', hpatk('sentinel', 1), [2735, 114]);
eq('워로드 Lv1 (T3 근접딜)', hpatk('warlord', 1), [1710, 171]);
eq('스톰레인저 Lv1 (T3 원거리)', hpatk('stormranger', 1), [1195, 171]);
eq('아크메이지 Lv1 (T3 광역)', hpatk('archmage', 1), [1025, 251]);
eq('세인트 Lv1 (T3 지원힐)', hpatk('saint', 1), [1540, 91]);
eq('팬텀 Lv1 (T3 암살)', hpatk('phantom', 1), [1195, 148]);
eq('스피릿로드 Lv1 (T3 소환)', hpatk('spiritlord', 1), [1025, 103]);
eq('워로드 Lv3 (n=8)', hpatk('warlord', 3), [3845, 384]);
eq('불워크 Lv1 (n=9, T4 탱킹)', hpatk('aegis', 1), [9225, 384]);
eq('컨쿼러 Lv1 (T4 근접딜)', hpatk('ares', 1), [5765, 577]);
eq('스피릿소버린 Lv3 (n=11)', hpatk('gaia', 3), [7785, 778]);
eq('이터널가드 Lv1 (n=12, T5 탱킹)', hpatk('eternalguard', 1), [31140, 1297]);
eq('게이트키퍼 Lv3 (n=14, 최상단)', hpatk('gatekeeper', 3), [26275, 2627]);
ok('세인트 HPS 91', L.statsFor('saint', 1).hps === 91);
ok('전 티어 Lv 상한 3', [1, 2, 3, 4, 5].every(function (t) { return D.LV_MAX[t] === 3; }));
ok('유닛 총 119종 (7+28×4)', Object.keys(D.UNITS).length === 119);
ok('진화표 T2 28종', Object.keys(D.EVOLUTION[2]).length === 28);
ok('진화표 T3 28종', Object.keys(D.EVOLUTION[3]).length === 28);
ok('진화표 T4 28종', Object.keys(D.EVOLUTION[4]).length === 28);
ok('진화표 T5 28종 (v1.7 완전 체계)', Object.keys(D.EVOLUTION[5]).length === 28);
ok('진화표 결과 티어 정합 (T4·T5)', [4, 5].every(function (t) {
  return Object.keys(D.EVOLUTION[t]).every(function (k) {
    return D.UNITS[D.EVOLUTION[t][k]] && D.UNITS[D.EVOLUTION[t][k]].tier === t;
  });
}));

// ---- 2) 진화 규칙 (v0.9: 성급 합성 폐지 — 같은 티어 Max 둘 = 진화만) ----
eq('비Max 동일 유닛 무반응 (성급 합성 폐지)', L.mergeResult('knight', 1, 'knight', 1), null);
eq('비Max 이종 무반응', L.mergeResult('knight', 1, 'warrior', 1), null);
eq('Max+비Max 무반응', L.mergeResult('knight', 3, 'knight', 2), null);
eq('T1 Max 동일유닛 = 순혈 진화', L.mergeResult('knight', 3, 'knight', 3), { type: 'evolve', unitId: 'grandknight' });
eq('T2 Max 쌍 = T3 순혈 진화', L.mergeResult('gladiator', 3, 'gladiator', 3), { type: 'evolve', unitId: 'warlord' });
eq('티어 혼합 Max 무반응', L.mergeResult('knight', 3, 'gladiator', 3), null);
eq('T3 Max 쌍 = T4 진화 (v1.0)', L.mergeResult('sentinel', 3, 'sentinel', 3), { type: 'evolve', unitId: 'aegis' });
eq('T4 Max 쌍 = T5 진화 (매트릭스 v1.8)', L.mergeResult('aegis', 3, 'aegis', 3), { type: 'evolve', unitId: 'eternalguard' });
eq('T4 이종 Max 쌍도 진화 (순혈 전용 예외 폐지)', L.mergeResult('bastion', 3, 'oracle', 3), { type: 'evolve', unitId: 'runesovereign' });
eq('T5 Max 쌍 무반응(T6 없음)', L.mergeResult('eternalguard', 3, 'eternalguard', 3), null);
// 클래스 쌍 → T2 전 28종 (매트릭스 v1.8 §2 전수)
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
// T2→T3 / T3→T4 / T4→T5 전 28쌍 진화 (클래스 대표 순혈 사용)
(function () {
  var reps = {
    3: { K: 'grandknight', W: 'berserker', A: 'hawkeye', M: 'highmage',
         C: 'bishop', R: 'assassin', N: 'highsummoner' },
    4: { K: 'sentinel', W: 'warlord', A: 'stormranger', M: 'archmage',
         C: 'saint', R: 'phantom', N: 'spiritlord' },
    5: { K: 'aegis', W: 'ares', A: 'artemis', M: 'hecate',
         C: 'seraphim', R: 'hades', N: 'gaia' }
  };
  [3, 4, 5].forEach(function (t) {
    var rep = reps[t];
    Object.keys(D.EVOLUTION[t]).forEach(function (key) {
      var cls = key.split('+');
      var r = L.mergeResult(rep[cls[0]], 3, rep[cls[1]], 3);
      eq('T' + t + ' 진화 ' + key, r && r.unitId, D.EVOLUTION[t][key]);
    });
  });
}());

// ---- 2.3) 웨이브 레벨업 (참여 +1Lv, Max 상한 — v1.2: 보스 +2 → +1) ----
eq('일반 웨이브 +1Lv', L.levelAfterWave('knight', 1, false), 2);
eq('보스 웨이브도 +1Lv (v1.2 하향)', L.levelAfterWave('knight', 1, true), 2);
eq('Max에서 정지', L.levelAfterWave('knight', 3, false), 3);
eq('상한 절사', L.levelAfterWave('grandknight', 2, true), 3);
ok('보스 보상 골드 정의', D.BOSS_REWARD.gold > 0);

// ---- 2.5) 판매가 (v0.9: 티어 고정 — 레벨은 공짜라 환급 미가산) ----
eq('판매가 T1 (Lv 무관)', [L.sellValue('knight', 1), L.sellValue('knight', 3)], [2, 2]);
eq('판매가 T2 (Lv 무관)', [L.sellValue('grandknight', 1), L.sellValue('grandknight', 3)], [6, 6]);
eq('판매가 T3', L.sellValue('sentinel', 1), 12);
eq('판매가 T4', L.sellValue('aegis', 1), 24);
eq('판매가 T5', L.sellValue('eternalguard', 1), 48);
ok('전 티어 판매가 < 구매가 (차익 차단)',
  D.SHOP.sell[1] < D.SHOP.priceRandT1 + 1 && D.SHOP.sell[2] < D.SHOP.priceRandT2 &&
  D.SHOP.sell[3] < D.SHOP.priceRandT3 && D.SHOP.sell.ticket < D.SHOP.priceTicket);

// ---- 2.6) 챕터 모디파이어 (v1.0) ----
(function () {
  var rngM = L.makeRng(5);
  var w1 = L.makeWave(0, 3, rngM); // 챕터1: 모디파이어 없음
  ok('챕터1 모디파이어 없음', w1.every(function (e) {
    return e.dmgTaken === 1 && e.regenPct === 0 && e.rangeCells === 0 && e.as === D.ENEMY.AS;
  }));
  var w2 = L.makeWave(1, 3, rngM); // 챕터2: 방어
  ok('챕터2 방어 (받는 피해 ×0.75)', w2.every(function (e) { return e.dmgTaken === 0.75; }));
  var w3 = L.makeWave(2, 3, rngM); // 챕터3: 신속
  ok('챕터3 신속 (이속 ×1.5)', w3.every(function (e) {
    return Math.abs(e.speed - D.ENEMY_LOOK.swarm.speed * 1.5) < 1e-9;
  }));
  var w4 = L.makeWave(3, 3, rngM); // 챕터4: 원거리
  ok('챕터4 원거리 (사거리 2.5칸)', w4.every(function (e) { return e.rangeCells === 2.5; }));
  var w5 = L.makeWave(4, 3, rngM); // 챕터5: 재생
  ok('챕터5 재생 (초당 0.9%)', w5.every(function (e) { return e.regenPct === 0.009; }));
  var w6 = L.makeWave(5, 3, rngM); // 챕터6: 광포
  ok('챕터6 광포 (공속 ×1.35)', w6.every(function (e) {
    return Math.abs(e.as - D.ENEMY.AS * 1.35) < 1e-9;
  }));
  var w9 = L.makeWave(8, 3, rngM); // 챕터9: 방어+재생+신속
  ok('챕터9 3중 모디파이어', w9.every(function (e) {
    return e.dmgTaken === 0.75 && e.regenPct === 0.009 &&
      Math.abs(e.speed - D.ENEMY_LOOK.swarm.speed * 1.5) < 1e-9;
  }));
  ok('광폭화 시점 < 패배 타임아웃', D.ENEMY.OVERTIME < D.ENEMY.TIMEOUT);
}());

// ---- 3) 상점 롤 + 레벨업권 + 선택지 잠금 + 이자 ----
(function () {
  var rng = L.makeRng(42), t2early = 0, tickets = 0, tierLate = { 1: 0, 2: 0, 3: 0 }, N = 2000;
  for (var i = 0; i < N; i++) {
    L.rollShop(null, 2, rng).forEach(function (s) { if (s.tier >= 2) t2early++; });
    L.rollShop(null, 10, rng).forEach(function (s) {
      if (s.kind === 'ticket') tickets++;
      else tierLate[s.tier]++;
    });
  }
  ok('웨이브2 T2+ 슬롯 없음', t2early === 0);
  var tkRate = tickets / (N * 4);
  ok('레벨업권 슬롯 ≈ 15% (실측 ' + (tkRate * 100).toFixed(1) + '%)', tkRate > 0.12 && tkRate < 0.18);
  var t3rate = tierLate[3] / (N * 4);
  var t2rate = tierLate[2] / (N * 4);
  ok('웨이브10 T3 슬롯 ≈ 13% (실측 ' + (t3rate * 100).toFixed(1) + '%)', t3rate > 0.10 && t3rate < 0.16);
  ok('웨이브10 T2 슬롯 ≈ 29% (실측 ' + (t2rate * 100).toFixed(1) + '%)', t2rate > 0.25 && t2rate < 0.33);
  // 가격 매핑 검증
  var rng2 = L.makeRng(7), priceOk = true;
  var PRICE = { 1: [D.SHOP.priceT1, D.SHOP.priceRandT1], 2: [D.SHOP.priceT2, D.SHOP.priceRandT2],
                3: [D.SHOP.priceT3, D.SHOP.priceRandT3] };
  for (var j = 0; j < 500; j++) {
    L.rollShop(null, 10, rng2).forEach(function (s) {
      var want = s.kind === 'ticket' ? D.SHOP.priceTicket : PRICE[s.tier][s.kind === 'unit' ? 0 : 1];
      if (s.price !== want) priceOk = false;
    });
  }
  ok('슬롯 가격 매핑 (확정 3/9/18G·랜덤 2/7/14G·권 4G)', priceOk);
  ok('랜덤가 < 확정가 (전 티어)', D.SHOP.priceRandT1 < D.SHOP.priceT1 &&
    D.SHOP.priceRandT2 < D.SHOP.priceT2 && D.SHOP.priceRandT3 < D.SHOP.priceT3);
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

// ---- 4) 그리디 봇 헤드리스 시뮬 (상점·골드 경제·레벨업 페이스) ----
function frontArch(arch) { return arch === 'tank' || arch === 'melee' || arch === 'assassin'; }
function nonMax(u) { return u.lv < D.LV_MAX[D.UNITS[u.unitId].tier]; }

function tryMergesArmy(army) {
  var moved = true;
  while (moved) {
    moved = false;
    outer:
    for (var i = 0; i < army.length; i++) for (var j = i + 1; j < army.length; j++) {
      var r = L.mergeResult(army[i].unitId, army[i].lv, army[j].unitId, army[j].lv);
      if (r) {
        army[i] = { unitId: r.unitId, lv: 1 };
        army.splice(j, 1);
        moved = true;
        break outer;
      }
    }
  }
}

// 레벨업권: 상위 티어·고레벨 비Max 유닛에 우선 사용 (진화 가속)
function useTicket(army) {
  var cands = army.filter(nonMax).sort(function (a, b) {
    return D.UNITS[b.unitId].tier - D.UNITS[a.unitId].tier || b.lv - a.lv;
  });
  if (!cands.length) return false;
  cands[0].lv++;
  return true;
}

function makeRoster(army) {
  // 3×3 보드 전원 출전, 근접 앞줄 배치
  var roster = army.map(function (u) { return { unitId: u.unitId, lv: u.lv, col: 0, row: 0 }; });
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
  var army = []; // [{unitId, lv}] — 보드 9칸
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
        if (s.kind === 'ticket') {
          if (!army.some(nonMax)) continue;
          gold -= s.price;
          s.sold = true;
          useTicket(army);       // 봇은 자리 점유 없이 즉시 사용 (근사)
          tryMergesArmy(army);
          bought = true;
          continue;
        }
        if (army.length >= 9) continue; // 신규 유닛은 Lv.1 — 즉시 합성 불가, 빈칸 필요
        gold -= s.price;
        s.sold = true;
        army.push({ unitId: L.resolveShopUnit(s, rng), lv: 1 });
        bought = true;
      }
    }
    var res = 'lose';
    if (army.length) {
      var st = B.createBattle(makeRoster(army), L.makeWave(chIdx, w, rng), Math.floor(rng() * 1e9));
      res = 'ongoing';
      while (res === 'ongoing') res = B.step(st, 1 / 30);
      // 전투 참여 = 승패 무관 레벨업, 이후 Max 쌍 자동 진화
      var isBoss = w % D.BOSS_EVERY === 0;
      army.forEach(function (u) { u.lv = L.levelAfterWave(u.unitId, u.lv, isBoss); });
      tryMergesArmy(army);
      // 보스 보상 3택1 (v1.2, 4·8웨이브): 목숨 회복 > 레벨업권 > 골드 순 그리디
      if (res === 'win' && isBoss && w < D.WAVES_PER_CHAPTER) {
        if (lives < D.LIVES) lives++;
        else if (!useTicket(army)) gold += D.BOSS_REWARD.gold;
        tryMergesArmy(army);
      }
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
