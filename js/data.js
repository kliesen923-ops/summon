/* =========================================================
 * 프로젝트 서몬 프로토타입 — data.js
 * 상수 정의: 아키타입 7종, 클래스 7종, 유닛 35종(T1 7 + T2 28), 스킬, 챕터/웨이브
 * 근거 문서: 유닛 스탯 기준표 v0.1 / 조합 매트릭스 v1.5
 * ========================================================= */
(function (global) {
  'use strict';

  // ---- 전장 기하 (v0.8: 3×3 보드, 벤치 폐지) ----
  var GEOM = {
    FIELD_W: 405,          // 논리 해상도 (9:16 = 405x720)
    FIELD_H: 512,          // 상단 전장 영역 높이 (벤치 줄 흡수)
    CELL_PX: 90,           // 사거리 1칸 = 90px
    COLS: 3, ROWS: 3,
    cellX: function (c) { return 67.5 + 135 * c; },
    cellY: function (r) { return [352, 416, 480][r]; } // r0=앞줄 ~ r2=뒷줄
  };

  // ---- 역할 아키타입 (스탯 기준표 v0.1 §2~3, §5) ----
  // hp/atk = T1★1 절대값, hps = 초당 힐(지원힐만), move = 전투 이동속도(px/s)
  var ARCHETYPES = {
    tank:     { hp: 240, atk: 10, as: 0.8,  range: 1, manaMax: 80,  manaPerAtk: 13, move: 55 },
    melee:    { hp: 150, atk: 15, as: 1.0,  range: 1, manaMax: 100, manaPerAtk: 10, move: 62 },
    ranged:   { hp: 105, atk: 15, as: 1.2,  range: 4, manaMax: 100, manaPerAtk: 8,  move: 46 },
    aoe:      { hp: 90,  atk: 22, as: 0.5,  range: 3, manaMax: 120, manaPerAtk: 20, move: 42 },
    support:  { hp: 135, atk: 8,  as: 0.75, range: 2, manaMax: 100, manaPerAtk: 13, move: 50, hps: 8 },
    assassin: { hp: 105, atk: 13, as: 1.3,  range: 1, manaMax: 90,  manaPerAtk: 8,  move: 72 },
    summon:   { hp: 90,  atk: 9,  as: 0.5,  range: 3, manaMax: 110, manaPerAtk: 20, move: 44 }
  };

  // ---- 클래스 7종 (색 = 해당 클래스의 모든 공격 이펙트 색) ----
  var CLASSES = {
    K: { name: '나이트', icon: '🛡', color: '#4a7dbf' },
    W: { name: '워리어', icon: '⚔', color: '#c0563e' },
    A: { name: '아처',   icon: '🏹', color: '#3f9e58' },
    M: { name: '메이지', icon: '🔮', color: '#8455c8' },
    C: { name: '클레릭', icon: '✨', color: '#dcb84e' },
    R: { name: '로그',   icon: '🗡', color: '#565d70' },
    N: { name: '서머너', icon: '🌿', color: '#2fa08b' }
  };

  // ---- 유닛 35종 (T1 7 + T2 28) ----
  // cls = 소속 클래스(스킬·진화·이펙트색), arch = 스탯·행동 아키타입
  // 오버라이드: range(칸), splash(주변 추가 타격 수), bounce(연쇄, 50% 피해)
  var UNITS = {
    // Tier 1 — 성급 상한 ★3
    knight:   { tier: 1, cls: 'K', arch: 'tank',     name: '나이트',  emoji: '🛡️' },
    warrior:  { tier: 1, cls: 'W', arch: 'melee',    name: '워리어',  emoji: '⚔️' },
    archer:   { tier: 1, cls: 'A', arch: 'ranged',   name: '아처',    emoji: '🏹' },
    mage:     { tier: 1, cls: 'M', arch: 'aoe',      name: '메이지',  emoji: '🔮' },
    cleric:   { tier: 1, cls: 'C', arch: 'support',  name: '클레릭',  emoji: '✨' },
    rogue:    { tier: 1, cls: 'R', arch: 'assassin', name: '로그',    emoji: '🗡️' },
    summoner: { tier: 1, cls: 'N', arch: 'summon',   name: '서머너',  emoji: '🌿' },
    // Tier 2 — 성급 상한 ★2 (조합 매트릭스 v1.5) — 순혈 7
    grandknight:  { tier: 2, cls: 'K', arch: 'tank',     name: '그랜드나이트', emoji: '🏰' },
    berserker:    { tier: 2, cls: 'W', arch: 'melee',    name: '버서커',       emoji: '🪓' },
    hawkeye:      { tier: 2, cls: 'A', arch: 'ranged',   name: '호크아이',     emoji: '🦅', range: 8 },
    highmage:     { tier: 2, cls: 'M', arch: 'aoe',      name: '하이메이지',   emoji: '🌟', splash: 1 },
    bishop:       { tier: 2, cls: 'C', arch: 'support',  name: '비숍',         emoji: '⛪' },
    assassin:     { tier: 2, cls: 'R', arch: 'assassin', name: '어쌔신',       emoji: '🥷' },
    highsummoner: { tier: 2, cls: 'N', arch: 'summon',   name: '하이서머너',   emoji: '🧚' },
    // Tier 2 — 이종 21
    gladiator:   { tier: 2, cls: 'W', arch: 'melee',    name: '글래디에이터', emoji: '🤺' },
    arbalist:    { tier: 2, cls: 'K', arch: 'tank',     name: '아발리스트',   emoji: '🛶', range: 4 },
    spellblade:  { tier: 2, cls: 'K', arch: 'melee',    name: '스펠블레이드', emoji: '🗡️', splash: 1 },
    paladin:     { tier: 2, cls: 'K', arch: 'tank',     name: '팔라딘',       emoji: '⚜️' },
    slayer:      { tier: 2, cls: 'R', arch: 'assassin', name: '슬레이어',     emoji: '🩸' },
    greenknight: { tier: 2, cls: 'N', arch: 'tank',     name: '그린나이트',   emoji: '🌳' },
    tomahawk:    { tier: 2, cls: 'W', arch: 'melee',    name: '토마호크',     emoji: '🪃', range: 2 },
    runeblade:   { tier: 2, cls: 'W', arch: 'melee',    name: '룬블레이드',   emoji: '🔥', splash: 1 },
    monk:        { tier: 2, cls: 'C', arch: 'melee',    name: '몽크',         emoji: '🧘' },
    ronin:       { tier: 2, cls: 'R', arch: 'assassin', name: '로닌',         emoji: '🌀' },
    shaman:      { tier: 2, cls: 'N', arch: 'support',  name: '샤먼',         emoji: '🗿' },
    spellarcher: { tier: 2, cls: 'M', arch: 'ranged',   name: '스펠아처',     emoji: '✴️', bounce: 1 },
    holyarcher:  { tier: 2, cls: 'A', arch: 'ranged',   name: '홀리아처',     emoji: '☀️' },
    sniper:      { tier: 2, cls: 'A', arch: 'ranged',   name: '스나이퍼',     emoji: '🎯' },
    windarcher:  { tier: 2, cls: 'A', arch: 'ranged',   name: '윈드아처',     emoji: '🌪️', splash: 1 },
    sage:        { tier: 2, cls: 'M', arch: 'aoe',      name: '세이지',       emoji: '📖' },
    warlock:     { tier: 2, cls: 'M', arch: 'aoe',      name: '워록',         emoji: '💀' },
    conjurer:    { tier: 2, cls: 'N', arch: 'summon',   name: '컨저러',       emoji: '🪄' },
    exorcist:    { tier: 2, cls: 'C', arch: 'support',  name: '엑소시스트',   emoji: '📿' },
    druid:       { tier: 2, cls: 'C', arch: 'support',  name: '드루이드',     emoji: '🍃' },
    hunter:      { tier: 2, cls: 'R', arch: 'assassin', name: '헌터',         emoji: '🐺' },
    // Tier 3 — 영웅 칭호, 성급 없음 (조합 매트릭스 v1.5 §3) — 순혈 7
    sentinel:     { tier: 3, cls: 'K', arch: 'tank',     name: '센티넬',       emoji: '🏯' },
    warlord:      { tier: 3, cls: 'W', arch: 'melee',    name: '워로드',       emoji: '🦾', splash: 1 },
    stormranger:  { tier: 3, cls: 'A', arch: 'ranged',   name: '스톰레인저',   emoji: '🌩️', splash: 1 },
    archmage:     { tier: 3, cls: 'M', arch: 'aoe',      name: '아크메이지',   emoji: '☄️', splash: 1 },
    saint:        { tier: 3, cls: 'C', arch: 'support',  name: '세인트',       emoji: '😇' },
    phantom:      { tier: 3, cls: 'R', arch: 'assassin', name: '팬텀',         emoji: '👻' },
    spiritlord:   { tier: 3, cls: 'N', arch: 'summon',   name: '스피릿로드',   emoji: '🌌' },
    // Tier 3 — 이종 21
    battlemaster: { tier: 3, cls: 'W', arch: 'melee',    name: '배틀마스터',   emoji: '🚩' },
    ballista:     { tier: 3, cls: 'K', arch: 'tank',     name: '발리스타',     emoji: '🧱', range: 4 },
    runeguardian: { tier: 3, cls: 'K', arch: 'tank',     name: '룬가디언',     emoji: '🧿' },
    crusader:     { tier: 3, cls: 'K', arch: 'tank',     name: '크루세이더',   emoji: '🔆' },
    darkknight:   { tier: 3, cls: 'R', arch: 'melee',    name: '다크나이트',   emoji: '🦇' },
    ironbark:     { tier: 3, cls: 'N', arch: 'tank',     name: '아이언바크',   emoji: '🪵' },
    halberdier:   { tier: 3, cls: 'W', arch: 'melee',    name: '할버디어',     emoji: '🔱', range: 2 },
    spellbreaker: { tier: 3, cls: 'W', arch: 'melee',    name: '스펠브레이커', emoji: '💥' },
    templar:      { tier: 3, cls: 'C', arch: 'melee',    name: '템플러',       emoji: '🕯️' },
    bladedancer:  { tier: 3, cls: 'R', arch: 'assassin', name: '블레이드댄서', emoji: '🩰' },
    earthbreaker: { tier: 3, cls: 'N', arch: 'melee',    name: '어스브레이커', emoji: '🌋', splash: 1 },
    arcanearcher: { tier: 3, cls: 'M', arch: 'ranged',   name: '아케인아처',   emoji: '🌠', splash: 1 },
    deadeye:      { tier: 3, cls: 'A', arch: 'ranged',   name: '데드아이',     emoji: '👁️' },
    shadowranger: { tier: 3, cls: 'A', arch: 'ranged',   name: '섀도우레인저', emoji: '🌒' },
    windwalker:   { tier: 3, cls: 'A', arch: 'ranged',   name: '윈드워커',     emoji: '💨', splash: 1 },
    grandsage:    { tier: 3, cls: 'M', arch: 'aoe',      name: '그랜드세이지', emoji: '📜' },
    necromancer:  { tier: 3, cls: 'M', arch: 'aoe',      name: '네크로맨서',   emoji: '⚰️' },
    grandsummoner:{ tier: 3, cls: 'N', arch: 'summon',   name: '그랜드서머너', emoji: '🎇' },
    inquisitor:   { tier: 3, cls: 'C', arch: 'support',  name: '인퀴지터',     emoji: '⚖️' },
    archdruid:    { tier: 3, cls: 'C', arch: 'support',  name: '아크드루이드', emoji: '🌺' },
    beastmaster:  { tier: 3, cls: 'R', arch: 'assassin', name: '비스트마스터', emoji: '🐗' }
  };

  // ---- 진화표: 결과 티어 → (클래스 쌍 정렬 키 → 유닛 id) — 혈통 배정 규칙 전 티어 공통 ----
  var EVOLUTION = {
    2: {
      'K+K': 'grandknight', 'W+W': 'berserker', 'A+A': 'hawkeye', 'M+M': 'highmage',
      'C+C': 'bishop', 'R+R': 'assassin', 'N+N': 'highsummoner',
      'K+W': 'gladiator', 'A+K': 'arbalist', 'K+M': 'spellblade',
      'C+K': 'paladin', 'K+R': 'slayer', 'K+N': 'greenknight',
      'A+W': 'tomahawk', 'M+W': 'runeblade', 'C+W': 'monk', 'R+W': 'ronin', 'N+W': 'shaman',
      'A+M': 'spellarcher', 'A+C': 'holyarcher', 'A+R': 'sniper', 'A+N': 'windarcher',
      'C+M': 'sage', 'M+R': 'warlock', 'M+N': 'conjurer',
      'C+R': 'exorcist', 'C+N': 'druid', 'N+R': 'hunter'
    },
    3: {
      'K+K': 'sentinel', 'W+W': 'warlord', 'A+A': 'stormranger', 'M+M': 'archmage',
      'C+C': 'saint', 'R+R': 'phantom', 'N+N': 'spiritlord',
      'K+W': 'battlemaster', 'A+K': 'ballista', 'K+M': 'runeguardian',
      'C+K': 'crusader', 'K+R': 'darkknight', 'K+N': 'ironbark',
      'A+W': 'halberdier', 'M+W': 'spellbreaker', 'C+W': 'templar', 'R+W': 'bladedancer', 'N+W': 'earthbreaker',
      'A+M': 'arcanearcher', 'A+C': 'deadeye', 'A+R': 'shadowranger', 'A+N': 'windwalker',
      'C+M': 'grandsage', 'M+R': 'necromancer', 'M+N': 'grandsummoner',
      'C+R': 'inquisitor', 'C+N': 'archdruid', 'N+R': 'beastmaster'
    }
  };

  var STAR_CAP = { 1: 3, 2: 3, 3: 3 }; // 성급 통일 (v0.8): 전 티어 ★3까지, ★3 둘 = 상위 티어 진화

  // ---- 클래스 스킬 (마나 가득 시 자동 시전, 기준표 §5) ----
  var SKILLS = {
    K: { name: '수호의 방패', desc: '보호막 + 주변 적 도발' },
    W: { name: '강타',       desc: '공격력 300% 일격' },
    A: { name: '속사',       desc: '무작위 적에게 70% 화살 4발' },
    M: { name: '마력 폭발',   desc: '최대 4체에게 220% 폭발' },
    C: { name: '성역의 기도', desc: '주변 아군 전체 대규모 회복' },
    R: { name: '그림자 일격', desc: '가장 약한 적에게 도약, 250% 처형타' },
    N: { name: '정령 소환',   desc: '정령 소환(최대 3), 가득 차면 광폭화' }
  };
  var SKILL_VALS = {
    K: { shieldPct: 0.5, shieldDur: 4, tauntRange: 2, tauntDur: 3 },
    W: { mult: 3.0 },
    A: { mult: 0.7, shots: 4 },
    M: { mult: 2.2, maxTargets: 4 },
    C: { healMult: 5, radiusCells: 2.5 },
    R: { mult: 2.5 },
    N: { frenzyMult: 1.5, frenzyDur: 5 }
  };

  // ---- 처형(암살처형 아키타입 공통 패시브, 기준표 §2 주3) ----
  var EXECUTE = { hpPct: 0.3, bonus: 1.5 };

  // ---- 정령 (기준표 §6: 동단계 근접딜의 35%, 기본 2체·상한 3체) ----
  var SUMMON = {
    statPct: 0.35, baseCount: 2, cap: 3,
    as: 1.0, range: 1, move: 72, r: 10
  };

  // ---- 상점 (설계 §5, v0.5 TFT식 개편) ----
  var SHOP = {
    slots: 4,                    // 상시 4슬롯 — 구매해도 유지, 리롤로만 전체 교체
    priceT1: 3,                  // 확정 T1
    priceRandT1: 2,              // 랜덤 T1 (확정보다 저렴)
    priceT2: 9,                  // 확정 T2 (판매가 8G보다 비싸게 — 되팔이 차단)
    priceRandT2: 7,              // 랜덤 T2
    priceT3: 18,                 // 확정 T3 (판매가 상한 16G보다 비싸게)
    priceRandT3: 14,             // 랜덤 T3
    reroll: 2,
    income: 4,                   // 웨이브 시작 기본 지급
    startBonus: 4,               // 런 시작 추가 지급 (1웨이브 총 8G)
    randChance: 0.25,            // 슬롯이 랜덤 카드일 확률
    prepTime: 30,                // 준비 제한시간(초) — 초과 시 자동 전투 시작
    interestPer: 10,             // 이자: 보유 10G당 +1G (TFT식)
    interestCap: 5,              // 이자 상한 +5G
    t2Chance: function (wave) {  // 웨이브별 T2 슬롯 확률 (12웨이브 기준)
      if (wave <= 3) return 0;
      if (wave <= 7) return 0.25;
      return 0.40;
    },
    t3Chance: function (wave) {  // 웨이브별 T3 슬롯 확률 (후반 혼입)
      return wave >= 9 ? 0.15 : 0;
    }
  };

  // ---- 적 스케일링 (설계 §6, 기준표 §7 예산 공식) ----
  // 12웨이브 체제: 웨이브 성장률을 완만화하고 챕터 배율로 장기 곡선 형성
  var ENEMY = {
    HP_BASE: 260,
    HP_GROWTH: 1.22,
    DPS_BASE: 11,
    DPS_GROWTH: 1.15,
    AS: 0.8,
    MELEE_RANGE: 42,
    BOSS_HP_MULT: 1.6,
    BOSS_MINIONS: 4,
    TIMEOUT: 120
  };

  // ---- 챕터 정의: 9챕터 × 12웨이브, 4웨이브마다 보스 (4·8·12) ----
  // 난이도 = CHAPTER_MULT_GROWTH^(챕터-1) 기하 곡선. 물량형/정예형 교대.
  var CHAPTER_MULT_GROWTH = 1.28;
  var CHAPTER_NAMES = [
    '초원의 침공', '강철 요새', '어둠의 숲',
    '사막의 유적', '얼어붙은 협곡', '화산 지대',
    '폐허의 도시', '심연의 관문', '근원의 옥좌'
  ];
  var CHAPTERS = CHAPTER_NAMES.map(function (name, i) {
    var swarm = i % 2 === 0;
    return {
      id: i + 1, name: name,
      enemyType: swarm ? 'swarm' : 'elite',
      desc: swarm ? '물량형 — 다수의 약한 적이 밀려온다' : '정예형 — 단단한 소수가 전진한다',
      mult: Math.pow(CHAPTER_MULT_GROWTH, i),
      countFor: swarm
        ? function (wave) { return Math.min(5 + wave, 14); }
        : function (wave) { return 3 + Math.ceil(wave / 2); }
    };
  });
  var WAVES_PER_CHAPTER = 12;
  var BOSS_EVERY = 4;   // 4·8·12웨이브 = 보스
  var LIVES = 3;        // 챕터당 목숨 — 전멸 시 1 소멸, 남은 목숨 = 클리어 별점

  var ENEMY_LOOK = {
    swarm: { color: '#7aa05a', r: 13, speed: 42 },
    elite: { color: '#8a8f9c', r: 18, speed: 26 },
    boss:  { color: '#b03a48', r: 30, speed: 18 }
  };

  global.DATA = {
    GEOM: GEOM, ARCHETYPES: ARCHETYPES, CLASSES: CLASSES, UNITS: UNITS,
    EVOLUTION: EVOLUTION, STAR_CAP: STAR_CAP, SKILLS: SKILLS, SKILL_VALS: SKILL_VALS,
    EXECUTE: EXECUTE, SUMMON: SUMMON,
    SHOP: SHOP, ENEMY: ENEMY, CHAPTERS: CHAPTERS,
    WAVES_PER_CHAPTER: WAVES_PER_CHAPTER, BOSS_EVERY: BOSS_EVERY, LIVES: LIVES,
    ENEMY_LOOK: ENEMY_LOOK
  };
}(typeof window !== 'undefined' ? window : globalThis));
