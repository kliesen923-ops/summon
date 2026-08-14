/* =========================================================
 * 프로젝트 서몬 프로토타입 — battle.js
 * 틱 기반 전투 시뮬레이션. DOM·Canvas 접근 금지 (Node 테스트 대상)
 * 전투 방식: 유닛이 표적을 향해 자유 이동 → 사거리 내 교전 (오토체스식)
 *
 * 아키타입별 행동 (시각 구분의 근거):
 *  - tank/melee  : 최근접 적 교전, 참격 이펙트
 *  - ranged      : 최근접 적에게 화살 투사체
 *  - aoe         : 마탄 투사체 + 폭발(주변 1체 추가 타격)
 *  - support     : 공격(약함) + 매 행동마다 아군 치유 빔
 *  - assassin    : 최저 체력 적을 노려 침투, 체력 30% 이하 처형 보너스
 *  - summon      : 정령 2체 대동(스킬로 최대 3), 본체는 마탄
 *  이펙트 색 = 소속 클래스 색 (CLASSES[cls].color)
 * ========================================================= */
(function (global) {
  'use strict';
  var D = global.DATA, L = global.LOGIC;
  var UNIT_R = 15; // 아군 충돌 반경(px)

  // ---- 유닛 생성 ----
  function buildUnit(c, i, cd0, pos) {
    var u = D.UNITS[c.unitId];
    var a = D.ARCHETYPES[u.arch];
    var s = L.statsFor(c.unitId, c.lv);
    return {
      key: c.uid !== undefined ? 'u' + c.uid : 'u' + i,
      unitId: c.unitId, lv: c.lv, tier: u.tier,
      cls: u.cls, arch: u.arch, name: u.name, emoji: u.emoji,
      col: c.col, row: c.row,
      x: pos ? pos.x : D.GEOM.cellX(c.col),
      y: pos ? pos.y : D.GEOM.cellY(c.row),
      hp: s.hp, maxHp: s.hp, atk: s.atk, as: s.as,
      hps: s.hps || 0,
      rangePx: s.range * D.GEOM.CELL_PX,
      move: a.move,
      mana: 0, manaMax: s.manaMax, manaPerAtk: s.manaPerAtk,
      splash: u.splash || 0, bounce: u.bounce || 0,
      shield: 0, shieldT: 0, cd: cd0, alive: true,
      isSpirit: false, spiritSeq: 0
    };
  }

  // 정령: 동단계 근접딜의 35% (기준표 §6)
  function makeSpirit(owner) {
    var m = L.ladderMult(L.mergeSteps(owner.tier, owner.lv));
    var a = D.ARCHETYPES.melee;
    var idx = owner.spiritSeq++;
    return {
      key: owner.key + '_s' + idx, isSpirit: true, ownerKey: owner.key,
      unitId: 'spirit', lv: 0, tier: owner.tier,
      cls: 'N', arch: 'spirit', name: '정령', emoji: '🌱',
      col: -1, row: -1,
      x: owner.x + (idx % 2 ? 20 : -20), y: owner.y + 18,
      hp: Math.round(a.hp * m * D.SUMMON.statPct),
      maxHp: Math.round(a.hp * m * D.SUMMON.statPct),
      atk: Math.round(a.atk * m * D.SUMMON.statPct),
      as: D.SUMMON.as, hps: 0,
      rangePx: D.SUMMON.range * D.GEOM.CELL_PX,
      move: D.SUMMON.move,
      mana: 0, manaMax: 9999, manaPerAtk: 0,
      splash: 0, bounce: 0,
      shield: 0, shieldT: 0, cd: 0.4, alive: true, frenzyT: 0
    };
  }

  // boardCells: [{uid, unitId, lv, col, row}], enemySpecs: LOGIC.makeWave 결과
  function createBattle(boardCells, enemySpecs, seed) {
    var rng = L.makeRng(seed);
    var units = boardCells.map(function (c, i) {
      return buildUnit(c, i, 0.3 + rng() * 0.5, null);
    });
    // 소환 아키타입: 전투 시작 시 정령 2체 대동
    units.slice().forEach(function (u) {
      if (u.arch === 'summon') {
        for (var k = 0; k < D.SUMMON.baseCount; k++) units.push(makeSpirit(u));
      }
    });
    var enemies = enemySpecs.map(function (e, i) {
      return {
        key: 'e' + i, hp: e.hp, maxHp: e.hp, atk: e.atk, as: e.as,
        speed: e.speed, r: e.r, color: e.color, isBoss: e.isBoss,
        x: 30 + rng() * (D.GEOM.FIELD_W - 60),
        y: -20 - i * 26 - rng() * 20,
        cd: 0, tauntKey: null, tauntT: 0, alive: true
      };
    });
    return { units: units, enemies: enemies, t: 0, rng: rng, fx: [], result: 'ongoing' };
  }

  // ---- 공통 유틸 ----
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function aliveList(arr) { return arr.filter(function (o) { return o.alive; }); }
  function nearest(from, list) {
    var best = null, bd = Infinity;
    for (var i = 0; i < list.length; i++) {
      var d = dist(from, list[i]);
      if (d < bd) { bd = d; best = list[i]; }
    }
    return best;
  }
  function lowestHp(list) {
    var best = null, bh = Infinity;
    for (var i = 0; i < list.length; i++) {
      if (list[i].hp < bh) { bh = list[i].hp; best = list[i]; }
    }
    return best;
  }
  function addFx(st, type, x, y, extra) {
    var f = { type: type, x: x, y: y };
    if (extra) for (var k in extra) f[k] = extra[k];
    f.dur = f.dur || 0.6;
    f.t = f.dur;
    st.fx.push(f);
  }
  function clsColor(u) { return D.CLASSES[u.cls].color; }
  function rotTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

  // ---- 피해/치유 ----
  function hitUnit(st, unit, dmg, rot) {
    if (unit.shield > 0) {
      var ab = Math.min(unit.shield, dmg);
      unit.shield -= ab; dmg -= ab;
    }
    unit.hp -= dmg;
    unit.mana = Math.min(unit.manaMax, unit.mana + 5); // 피격 충전 +5 (기준표 §5)
    addFx(st, 'eslash', unit.x, unit.y, { rot: rot || 0, dur: 0.22 });
    if (unit.hp <= 0) { unit.alive = false; addFx(st, 'die', unit.x, unit.y); }
  }
  function hitEnemy(st, en, dmg) {
    en.hp -= dmg;
    addFx(st, 'hit', en.x, en.y, { dur: 0.2 });
    if (en.hp <= 0) en.alive = false;
  }
  function healUnit(st, from, ally, amount) {
    if (ally.hp >= ally.maxHp) return;
    ally.hp = Math.min(ally.maxHp, ally.hp + amount);
    addFx(st, 'healbeam', from.x, from.y, { x1: ally.x, y1: ally.y, dur: 0.35 });
    addFx(st, 'heal', ally.x, ally.y, { dur: 0.5 });
  }

  // 처형 보너스 (암살처형 공통 패시브)
  function execMult(u, e) {
    return (u.arch === 'assassin' && e.hp / e.maxHp <= D.EXECUTE.hpPct) ? D.EXECUTE.bonus : 1;
  }
  function unitDmg(u) {
    var d = u.atk;
    if (u.isSpirit && u.frenzyT > 0) d *= D.SKILL_VALS.N.frenzyMult;
    return d;
  }

  // ---- 공격 이펙트 (아키타입별 형태 × 클래스 색) ----
  function attackFx(st, u, target) {
    var c = clsColor(u), rot = rotTo(u, target);
    if (u.isSpirit) {
      addFx(st, 'slash', target.x, target.y, { rot: rot, color: '#2fa08b', small: true, dur: 0.22 });
    } else if (u.arch === 'ranged') {
      addFx(st, 'arrow', u.x, u.y, { x1: target.x, y1: target.y, color: c, dur: 0.16 });
    } else if (u.arch === 'aoe') {
      addFx(st, 'bolt', u.x, u.y, { x1: target.x, y1: target.y, color: c, dur: 0.2 });
      addFx(st, 'burst', target.x, target.y, { color: c, r: 42, dur: 0.4 });
    } else if (u.arch === 'summon' || u.arch === 'support') {
      addFx(st, 'bolt', u.x, u.y, { x1: target.x, y1: target.y, color: c, dur: 0.22 });
    } else { // tank / melee / assassin
      addFx(st, 'slash', target.x, target.y, {
        rot: rot, color: c, small: u.arch === 'assassin', dur: 0.26
      });
    }
  }

  // ---- 일반 공격 ----
  function unitAttack(st, u, target, foes) {
    attackFx(st, u, target);
    hitEnemy(st, target, unitDmg(u) * execMult(u, target));
    var extraHits = (u.arch === 'aoe' ? 1 : 0) + u.splash; // 광역 실효 2타겟 (기준표 §2 주1)
    if (extraHits > 0) {
      var others = foes.filter(function (e) { return e.alive && e !== target && dist(target, e) <= 70; })
        .sort(function (a, b) { return dist(target, a) - dist(target, b); });
      for (var i = 0; i < Math.min(extraHits, others.length); i++) hitEnemy(st, others[i], unitDmg(u));
    }
    if (u.bounce > 0) {
      var next = foes.filter(function (e) { return e.alive && e !== target; });
      var nb = nearest(target, next);
      if (nb && dist(target, nb) <= 140) {
        addFx(st, 'arrow', target.x, target.y, { x1: nb.x, y1: nb.y, color: clsColor(u), dur: 0.14 });
        hitEnemy(st, nb, unitDmg(u) * 0.5);
      }
    }
    u.mana = Math.min(u.manaMax, u.mana + u.manaPerAtk);
    u.cd = 1 / u.as;
  }

  // ---- 클래스 스킬 ----
  function castSkill(st, u, foes) {
    var V = D.SKILL_VALS[u.cls];
    var c = clsColor(u);
    var inRange = foes.filter(function (e) { return dist(u, e) <= u.rangePx + e.r; });

    if (u.cls === 'K') {
      addFx(st, 'skill', u.x, u.y, { color: c });
      u.shield = u.maxHp * V.shieldPct; u.shieldT = V.shieldDur;
      var tr = V.tauntRange * D.GEOM.CELL_PX;
      foes.forEach(function (e) {
        if (dist(u, e) <= tr) { e.tauntKey = u.key; e.tauntT = V.tauntDur; }
      });
      return true;
    }
    if (u.cls === 'C') {
      // 성역의 기도: 반경 내 아군 전체 회복 (다친 아군 없으면 보류)
      var radius = V.radiusCells * D.GEOM.CELL_PX;
      var hurt = aliveList(st.units).filter(function (a) {
        return a.hp < a.maxHp && dist(u, a) <= radius;
      });
      if (!hurt.length) return false;
      addFx(st, 'skill', u.x, u.y, { color: c });
      var amount = Math.round(u.hps / u.as) * V.healMult;
      hurt.forEach(function (a) { healUnit(st, u, a, amount); });
      return true;
    }
    if (u.cls === 'N') {
      // 정령 소환: 상한 미만이면 소환, 가득이면 광폭화
      addFx(st, 'skill', u.x, u.y, { color: c });
      var mine = aliveList(st.units).filter(function (a) {
        return a.isSpirit && a.ownerKey === u.key;
      });
      if (mine.length < D.SUMMON.cap) {
        var sp = makeSpirit(u);
        st.units.push(sp);
        addFx(st, 'summon', sp.x, sp.y, { color: c, dur: 0.5 });
      } else {
        mine.forEach(function (sp) {
          sp.frenzyT = V.frenzyDur;
          addFx(st, 'summon', sp.x, sp.y, { color: '#e0603e', dur: 0.4 });
        });
      }
      return true;
    }
    if (u.cls === 'R') {
      // 그림자 일격: 가장 약한 적 곁으로 도약 후 처형타
      if (!foes.length) return false;
      var tgt = lowestHp(foes);
      addFx(st, 'skill', u.x, u.y, { color: c });
      addFx(st, 'blink', u.x, u.y, { x1: tgt.x, y1: tgt.y, dur: 0.35 });
      u.x = tgt.x + (u.x < tgt.x ? -26 : 26);
      u.y = tgt.y + 12;
      addFx(st, 'slash', tgt.x, tgt.y, { rot: rotTo(u, tgt), color: c, dur: 0.3 });
      hitEnemy(st, tgt, u.atk * V.mult * execMult(u, tgt));
      return true;
    }

    if (inRange.length === 0) return false; // W/A/M: 대상 없으면 보류
    addFx(st, 'skill', u.x, u.y, { color: c });
    if (u.cls === 'W') {
      var t0 = nearest(u, inRange);
      addFx(st, 'slash', t0.x, t0.y, { rot: rotTo(u, t0), color: c, big: true, dur: 0.35 });
      hitEnemy(st, t0, u.atk * V.mult);
    } else if (u.cls === 'A') {
      for (var i = 0; i < V.shots; i++) {
        var live = inRange.filter(function (e) { return e.alive; });
        if (!live.length) break;
        var t1 = live[Math.floor(st.rng() * live.length)];
        addFx(st, 'arrow', u.x, u.y, { x1: t1.x, y1: t1.y, color: c, dur: 0.16 });
        hitEnemy(st, t1, u.atk * V.mult);
      }
    } else if (u.cls === 'M') {
      inRange.slice().sort(function (a, b) { return dist(u, a) - dist(u, b); })
        .slice(0, V.maxTargets)
        .forEach(function (e) {
          addFx(st, 'burst', e.x, e.y, { color: c, r: 55, dur: 0.5 });
          hitEnemy(st, e, u.atk * V.mult);
        });
    }
    return true;
  }

  // ---- 표적 선택: 암살자는 최저 체력 적 침투, 그 외 최근접 ----
  function acquireTarget(u, foes) {
    if (u.arch === 'assassin') return lowestHp(foes);
    return nearest(u, foes);
  }

  // ---- 유닛 간 겹침 방지 ----
  function separateUnits(units, dt) {
    for (var i = 0; i < units.length; i++) for (var j = i + 1; j < units.length; j++) {
      var a = units[i], b = units[j];
      var dx = b.x - a.x, dy = b.y - a.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var minD = UNIT_R * 2;
      if (d > 0.001 && d < minD) {
        var push = (minD - d) / 2 * Math.min(1, dt * 10);
        dx /= d; dy /= d;
        a.x -= dx * push; a.y -= dy * push;
        b.x += dx * push; b.y += dy * push;
      }
    }
  }

  function clampToField(o) {
    o.x = Math.max(18, Math.min(D.GEOM.FIELD_W - 18, o.x));
    o.y = Math.max(-400, Math.min(D.GEOM.FIELD_H - 12, o.y));
  }

  // ---- 메인 틱 ----
  function step(st, dt) {
    if (st.result !== 'ongoing') return st.result;
    st.t += dt;
    var units = aliveList(st.units), foes = aliveList(st.enemies);
    var realUnits = units.filter(function (u) { return !u.isSpirit; });

    if (!foes.length) { st.result = 'win'; return st.result; }
    if (!realUnits.length || st.t > D.ENEMY.TIMEOUT) { st.result = 'lose'; return st.result; }

    // ---- 적 행동 (최근접 아군 추적 — 정령 포함) ----
    for (var i = 0; i < foes.length; i++) {
      var e = foes[i];
      var target = null;
      if (e.tauntT > 0) {
        e.tauntT -= dt;
        for (var k = 0; k < units.length; k++) if (units[k].key === e.tauntKey) { target = units[k]; break; }
      }
      if (!target) target = nearest(e, units);
      if (!target) break;
      var d = dist(e, target);
      var reach = D.ENEMY.MELEE_RANGE + UNIT_R;
      if (d > reach) {
        e.x += (target.x - e.x) / d * e.speed * dt;
        e.y += (target.y - e.y) / d * e.speed * dt;
        e.cd = Math.max(0, e.cd - dt);
      } else {
        e.cd -= dt;
        if (e.cd <= 0) { hitUnit(st, target, e.atk, rotTo(e, target)); e.cd = 1 / e.as; }
      }
      units = aliveList(st.units);
      if (!units.length) break;
    }

    // ---- 아군 행동 ----
    foes = aliveList(st.enemies);
    units = aliveList(st.units);
    for (var j = 0; j < units.length; j++) {
      var u = units[j];
      if (!u.alive || !foes.length) continue;
      if (u.shieldT > 0) { u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0; }
      if (u.isSpirit && u.frenzyT > 0) u.frenzyT -= dt;
      u.cd -= dt;

      if (!u.isSpirit && u.mana >= u.manaMax) {
        if (castSkill(st, u, foes)) u.mana = 0;
        foes = aliveList(st.enemies);
        if (!foes.length) break;
      }

      var tgt = acquireTarget(u, foes);
      if (!tgt) continue;
      var td = dist(u, tgt);

      if (u.arch === 'support') {
        // 지원힐: 사거리 내 공격 + 치유를 한 행동으로 (기준표: DPS와 HPS 동시 예산)
        if (u.cd <= 0) {
          var did = false;
          if (td <= u.rangePx + tgt.r) { unitAttack(st, u, tgt, foes); did = true; }
          var radius = 225;
          var hurt = aliveList(st.units).filter(function (a) {
            return a.hp < a.maxHp && dist(u, a) <= radius;
          });
          if (hurt.length) {
            var ally = hurt.sort(function (a, b) { return a.hp / a.maxHp - b.hp / b.maxHp; })[0];
            healUnit(st, u, ally, Math.round(u.hps / u.as));
            if (!did) { u.mana = Math.min(u.manaMax, u.mana + u.manaPerAtk); u.cd = 1 / u.as; }
            did = true;
          }
        }
        if (td > u.rangePx + tgt.r) {
          u.x += (tgt.x - u.x) / td * u.move * dt;
          u.y += (tgt.y - u.y) / td * u.move * dt;
          clampToField(u);
        }
      } else {
        if (td > u.rangePx + tgt.r) {
          u.x += (tgt.x - u.x) / td * u.move * dt;
          u.y += (tgt.y - u.y) / td * u.move * dt;
          clampToField(u);
        } else if (u.cd <= 0) {
          unitAttack(st, u, tgt, foes);
        }
      }
      foes = aliveList(st.enemies);
    }

    separateUnits(aliveList(st.units), dt);

    // ---- 이펙트 수명 ----
    for (var f = st.fx.length - 1; f >= 0; f--) {
      st.fx[f].t -= dt;
      if (st.fx[f].t <= 0) st.fx.splice(f, 1);
    }

    if (!aliveList(st.enemies).length) st.result = 'win';
    else if (!aliveList(st.units).filter(function (u) { return !u.isSpirit; }).length) st.result = 'lose';
    return st.result;
  }

  global.BATTLE = { createBattle: createBattle, step: step, buildUnit: buildUnit };
}(typeof window !== 'undefined' ? window : globalThis));
