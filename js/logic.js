/* =========================================================
 * 프로젝트 서몬 프로토타입 — logic.js
 * 순수 함수 계층: 스탯 사다리, 머지/진화 판정, 드래프트, 적 생성, 시드 RNG
 * DOM·Canvas 접근 금지 (Node 테스트 대상)
 * ========================================================= */
(function (global) {
  'use strict';
  var D = global.DATA;

  // ---- 시드 RNG (mulberry32) — 테스트 재현성 확보 ----
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- 파워 사다리 (기준표 §1) ----
  // 머지 단계 n = T1: star-1 (0~2) / T2: 2+star (3~4) / T3: 5 (성급 없음)
  function mergeSteps(tier, star) {
    if (tier === 1) return star - 1;
    if (tier === 2) return 2 + star;
    return 5;
  }
  function ladderMult(n) { return Math.pow(1.5, n); }
  function roundHp(v) { return Math.round(v / 5) * 5; }

  // ---- 유닛 스탯 산출 (기준표 §2~4 조견표 재현) ----
  function statsFor(unitId, star) {
    var u = D.UNITS[unitId];
    var a = D.ARCHETYPES[u.arch];
    var m = ladderMult(mergeSteps(u.tier, star));
    var out = {
      hp: roundHp(a.hp * m),
      atk: Math.round(a.atk * m),
      as: a.as,
      range: (u.range !== undefined ? u.range : a.range),
      manaMax: a.manaMax,
      manaPerAtk: a.manaPerAtk
    };
    if (a.hps) out.hps = Math.round(a.hps * m); // 지원힐: 초당 힐량도 사다리 적용
    return out;
  }

  // ---- 머지/진화 판정 (기획서 §4.3 보편 규칙 2문장) ----
  // 반환: {type:'star', unitId, star} | {type:'evolve', unitId} | null
  function mergeResult(aId, aStar, bId, bStar) {
    var a = D.UNITS[aId], b = D.UNITS[bId];
    // 규칙 1: 동일 유닛 + 동일 성급 + 상한 미만 → 성급 상승
    if (aId === bId && aStar === bStar && aStar < D.STAR_CAP[a.tier]) {
      return { type: 'star', unitId: aId, star: aStar + 1 };
    }
    // 규칙 2: 같은 티어 최대 성급 둘 → 클래스 쌍으로 상위 티어 진화 (T1→T2, T2→T3)
    var aMax = aStar === D.STAR_CAP[a.tier];
    var bMax = bStar === D.STAR_CAP[b.tier];
    if (aMax && bMax && a.tier === b.tier && D.EVOLUTION[a.tier + 1]) {
      var key = [a.cls, b.cls].sort().join('+');
      return { type: 'evolve', unitId: D.EVOLUTION[a.tier + 1][key] };
    }
    return null; // T3 쌍(→T4)은 미구현: 무반응
  }

  // ---- 상점 (설계 §5, v0.5~v0.7) ----
  var TIER_IDS = { 1: [], 2: [], 3: [] };
  Object.keys(D.UNITS).forEach(function (id) {
    TIER_IDS[D.UNITS[id].tier].push(id);
  });
  var T1_IDS = TIER_IDS[1], T2_IDS = TIER_IDS[2], T3_IDS = TIER_IDS[3];

  var TIER_PRICE = {
    1: { unit: D.SHOP.priceT1, rand: D.SHOP.priceRandT1 },
    2: { unit: D.SHOP.priceT2, rand: D.SHOP.priceRandT2 },
    3: { unit: D.SHOP.priceT3, rand: D.SHOP.priceRandT3 }
  };

  // 슬롯 1개 생성. {kind:'unit'|'randT1~3', unitId?, tier, price, sold, locked}
  // 확정 카드도 완전 랜덤 (v0.6 — 보유 유닛 재등장 바이어스 폐지)
  function rollSlot(wave, rng) {
    var tier = 1;
    if (rng() < D.SHOP.t3Chance(wave)) tier = 3;
    else if (rng() < D.SHOP.t2Chance(wave)) tier = 2;
    if (rng() < D.SHOP.randChance) {
      return { kind: 'randT' + tier, tier: tier, price: TIER_PRICE[tier].rand, sold: false, locked: false };
    }
    var pool = TIER_IDS[tier];
    return {
      kind: 'unit', unitId: pool[Math.floor(rng() * pool.length)],
      tier: tier, price: TIER_PRICE[tier].unit, sold: false, locked: false
    };
  }

  // 상점 갱신: 잠긴(🔒) 미판매 선택지는 유지, 나머지만 새로 롤 (v0.7 선택지별 잠금)
  function rollShop(prevShop, wave, rng) {
    var slots = [];
    for (var i = 0; i < D.SHOP.slots; i++) {
      var prev = prevShop && prevShop[i];
      if (prev && prev.locked && !prev.sold) slots.push(prev);
      else slots.push(rollSlot(wave, rng));
    }
    return slots;
  }

  // TFT식 이자: 보유 골드 interestPer당 +1G, 상한 interestCap
  function interestFor(gold) {
    return Math.min(D.SHOP.interestCap, Math.floor(gold / D.SHOP.interestPer));
  }

  // 구매 시점에 유닛 확정 (랜덤 카드는 여기서 추첨)
  function resolveShopUnit(slot, rng) {
    if (slot.kind === 'unit') return slot.unitId;
    var pool = TIER_IDS[slot.tier];
    return pool[Math.floor(rng() * pool.length)];
  }

  // ---- 적 웨이브 생성 (설계 §6) ----
  // 반환: [{hp, atk, as, speed, r, color, isBoss}]
  function makeWave(chapterIdx, wave, rng) {
    var ch = D.CHAPTERS[chapterIdx];
    var mult = ch.mult;
    var hpBudget = D.ENEMY.HP_BASE * Math.pow(D.ENEMY.HP_GROWTH, wave - 1) * mult;
    var dpsBudget = D.ENEMY.DPS_BASE * Math.pow(D.ENEMY.DPS_GROWTH, wave - 1) * Math.sqrt(mult);
    var look = D.ENEMY_LOOK[ch.enemyType];
    var out = [];

    function push(hp, dps, look_, isBoss) {
      out.push({
        hp: Math.max(10, Math.round(hp)),
        atk: Math.max(1, Math.round(dps / D.ENEMY.AS)),
        as: D.ENEMY.AS,
        speed: look_.speed,
        r: look_.r,
        color: look_.color,
        isBoss: !!isBoss
      });
    }

    if (wave % D.BOSS_EVERY === 0) {
      var bossLook = D.ENEMY_LOOK.boss;
      push(hpBudget * D.ENEMY.BOSS_HP_MULT, dpsBudget * 0.6, bossLook, true);
      for (var i = 0; i < D.ENEMY.BOSS_MINIONS; i++) {
        push(hpBudget * 0.4 / D.ENEMY.BOSS_MINIONS,
             dpsBudget * 0.4 / D.ENEMY.BOSS_MINIONS, look, false);
      }
    } else {
      var count = ch.countFor(wave);
      for (var j = 0; j < count; j++) {
        // 개체별 ±15% 변주
        var v = 0.85 + rng() * 0.3;
        push(hpBudget / count * v, dpsBudget / count, look, false);
      }
    }
    return out;
  }

  // ---- 판매가: 투자 매몰비(T1 환산 장수) = 2^머지단계, 상한 16G ----
  // 상한 근거: T3 판매가가 구매가(18G)를 넘으면 구매→판매 차익이 생기므로 T2★2 값에서 캡
  function sellValue(unitId, star) {
    var u = D.UNITS[unitId];
    return Math.min(Math.pow(2, mergeSteps(u.tier, star)), 16);
  }

  global.LOGIC = {
    makeRng: makeRng,
    sellValue: sellValue,
    mergeSteps: mergeSteps,
    ladderMult: ladderMult,
    statsFor: statsFor,
    mergeResult: mergeResult,
    rollShop: rollShop,
    resolveShopUnit: resolveShopUnit,
    interestFor: interestFor,
    makeWave: makeWave,
    T1_IDS: T1_IDS,
    T2_IDS: T2_IDS,
    T3_IDS: T3_IDS
  };
}(typeof window !== 'undefined' ? window : globalThis));
