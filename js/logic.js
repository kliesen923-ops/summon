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
  // 머지 단계 n = T1: star-1 / T2: 2+star
  function mergeSteps(tier, star) {
    return tier === 1 ? star - 1 : 2 + star;
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
    // 규칙 2: 최대 성급 둘 → 클래스 쌍 진화 (프로토타입은 T1 → T2만)
    var aMax = aStar === D.STAR_CAP[a.tier];
    var bMax = bStar === D.STAR_CAP[b.tier];
    if (aMax && bMax && a.tier === 1 && b.tier === 1) {
      var key = [a.cls, b.cls].sort().join('+');
      return { type: 'evolve', unitId: D.EVOLUTION[key] };
    }
    return null; // T2 최대 성급 쌍(→T3)은 미구현: 무반응
  }

  // ---- 드래프트 풀 (설계 §5) ----
  var T1_IDS = [], T2_IDS = [];
  Object.keys(D.UNITS).forEach(function (id) {
    (D.UNITS[id].tier === 1 ? T1_IDS : T2_IDS).push(id);
  });
  // boardIds: 현재 보드 유닛 id 배열 — 보유 유닛 재등장 바이어스(dupBias)로 머지 성립 확률 유지
  function draftCards(wave, rng, boardIds) {
    var cards = [];
    var p2 = D.DRAFT.t2Chance(wave);
    for (var i = 0; i < 3; i++) {
      var wantT2 = rng() < p2;
      var pool = wantT2 ? T2_IDS : T1_IDS;
      var card = null;
      if (boardIds && boardIds.length && rng() < D.DRAFT.dupBias) {
        var owned = boardIds.filter(function (id) {
          return D.UNITS[id].tier === (wantT2 ? 2 : 1);
        });
        if (owned.length) card = owned[Math.floor(rng() * owned.length)];
      }
      if (!card) card = pool[Math.floor(rng() * pool.length)];
      cards.push(card);
    }
    return cards;
  }

  // ---- 적 웨이브 생성 (설계 §6) ----
  // 반환: [{hp, atk, as, speed, r, color, isBoss}]
  function makeWave(chapterIdx, stageIdx, wave, rng) {
    var ch = D.CHAPTERS[chapterIdx];
    var mult = ch.stageMult[stageIdx];
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

    if (wave === D.BOSS_WAVE) {
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

  // ---- 판매가: 투자 매몰비(T1 환산 장수) = 2^머지단계 → 1/2/4/8/16G ----
  function sellValue(unitId, star) {
    var u = D.UNITS[unitId];
    return Math.pow(2, mergeSteps(u.tier, star));
  }

  global.LOGIC = {
    makeRng: makeRng,
    sellValue: sellValue,
    mergeSteps: mergeSteps,
    ladderMult: ladderMult,
    statsFor: statsFor,
    mergeResult: mergeResult,
    draftCards: draftCards,
    makeWave: makeWave,
    T1_IDS: T1_IDS,
    T2_IDS: T2_IDS
  };
}(typeof window !== 'undefined' ? window : globalThis));
