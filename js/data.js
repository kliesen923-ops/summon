/* =========================================================
 * 프로젝트 서몬 프로토타입 — data.js
 * 상수 정의: 아키타입 7종, 클래스 7종, 유닛 35종(T1 7 + T2 28), 스킬, 챕터/웨이브
 * 근거 문서: 유닛 스탯 기준표 v0.1 / 조합 매트릭스 v1.8
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
    // Tier 1 — 기본 7종
    knight:   { tier: 1, cls: 'K', arch: 'tank',     name: '나이트',  emoji: '🛡️' },
    warrior:  { tier: 1, cls: 'W', arch: 'melee',    name: '워리어',  emoji: '⚔️' },
    archer:   { tier: 1, cls: 'A', arch: 'ranged',   name: '아처',    emoji: '🏹' },
    mage:     { tier: 1, cls: 'M', arch: 'aoe',      name: '메이지',  emoji: '🔮' },
    cleric:   { tier: 1, cls: 'C', arch: 'support',  name: '클레릭',  emoji: '✨' },
    rogue:    { tier: 1, cls: 'R', arch: 'assassin', name: '로그',    emoji: '🗡️' },
    summoner: { tier: 1, cls: 'N', arch: 'summon',   name: '서머너',  emoji: '🌿' },
    // Tier 2 — (조합 매트릭스 v1.8) 순혈 7
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
    // Tier 3 — 영웅 칭호 (조합 매트릭스 v1.8 §3) — 순혈 7
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
    beastmaster:  { tier: 3, cls: 'R', arch: 'assassin', name: '비스트마스터', emoji: '🐗' },
    // Tier 4 — 전설 칭호 (조합 매트릭스 v1.8 §4) — 상점 미등장, 오직 진화로만. 순혈 7
    // v1.6: 신화 인물·존재 고유명 폐지 → 직업·칭호형 개명 (내부 id는 유지)
    aegis:        { tier: 4, cls: 'K', arch: 'tank',     name: '불워크',       emoji: '🏛️' },
    ares:         { tier: 4, cls: 'W', arch: 'melee',    name: '컨쿼러',       emoji: '💢', splash: 1 },
    artemis:      { tier: 4, cls: 'A', arch: 'ranged',   name: '스카이피어서', emoji: '🌙', splash: 1 },
    hecate:       { tier: 4, cls: 'M', arch: 'aoe',      name: '소서러킹',     emoji: '🪐', splash: 1 },
    seraphim:     { tier: 4, cls: 'C', arch: 'support',  name: '아크세인트',   emoji: '👼' },
    hades:        { tier: 4, cls: 'R', arch: 'assassin', name: '리퍼',         emoji: '🕳️' },
    gaia:         { tier: 4, cls: 'N', arch: 'summon',   name: '스피릿소버린', emoji: '🌍' },
    // Tier 4 — 이종 21
    swordsaint:   { tier: 4, cls: 'W', arch: 'melee',    name: '소드세인트',   emoji: '⚡' },
    bastion:      { tier: 4, cls: 'K', arch: 'tank',     name: '배스천',       emoji: '🛕', range: 4 },
    arcanelord:   { tier: 4, cls: 'K', arch: 'tank',     name: '아케인로드',   emoji: '🔷' },
    lightbringer: { tier: 4, cls: 'K', arch: 'tank',     name: '라이트브링어', emoji: '🌞' },
    abyssknight:  { tier: 4, cls: 'R', arch: 'melee',    name: '어비스나이트', emoji: '🌘' },
    colossus:     { tier: 4, cls: 'N', arch: 'tank',     name: '엘더바크',     emoji: '⛰️' },
    tempest:      { tier: 4, cls: 'W', arch: 'melee',    name: '템페스트',     emoji: '🌊', range: 2 },
    runelord:     { tier: 4, cls: 'W', arch: 'melee',    name: '룬로드',       emoji: '🧨', splash: 1 },
    warsaint:     { tier: 4, cls: 'C', arch: 'melee',    name: '그랜드템플러', emoji: '🏵️' },
    bloodblade:   { tier: 4, cls: 'R', arch: 'assassin', name: '블러드블레이드', emoji: '🔪' },
    behemoth:     { tier: 4, cls: 'N', arch: 'melee',    name: '어스퀘이커',   emoji: '🦣', splash: 1 },
    starcaller:   { tier: 4, cls: 'M', arch: 'ranged',   name: '스타콜러',     emoji: '💫', splash: 1 },
    daybreaker:   { tier: 4, cls: 'A', arch: 'ranged',   name: '데이브레이커', emoji: '🌅' },
    nightraven:   { tier: 4, cls: 'A', arch: 'ranged',   name: '나이트레이븐', emoji: '🪶' },
    cyclone:      { tier: 4, cls: 'A', arch: 'ranged',   name: '사이클론',     emoji: '🍥', splash: 1 },
    oracle:       { tier: 4, cls: 'M', arch: 'aoe',      name: '오라클',       emoji: '🎴' },
    lich:         { tier: 4, cls: 'M', arch: 'aoe',      name: '리치',         emoji: '☠️' },
    archsummoner: { tier: 4, cls: 'N', arch: 'summon',   name: '아크서머너',   emoji: '🎆' },
    judgment:     { tier: 4, cls: 'C', arch: 'support',  name: '저지먼트',     emoji: '🔔' },
    lifegiver:    { tier: 4, cls: 'C', arch: 'support',  name: '라이프기버',   emoji: '🌸' },
    beastking:    { tier: 4, cls: 'R', arch: 'assassin', name: '비스트킹',     emoji: '🦁' },
    // Tier 5 — 초월 칭호 (조합 매트릭스 v1.8 §5) — 28종 완전 체계, 진화 전용. 순혈 7
    eternalguard:   { tier: 5, cls: 'K', arch: 'tank',     name: '이터널가드',     emoji: '🏔️' },
    waremperor:     { tier: 5, cls: 'W', arch: 'melee',    name: '워엠퍼러',       emoji: '👑', splash: 1 },
    starpiercer:    { tier: 5, cls: 'A', arch: 'ranged',   name: '스타피어서',     emoji: '💠', splash: 1 },
    magicoverlord:  { tier: 5, cls: 'M', arch: 'aoe',      name: '매직오버로드',   emoji: '♾️', splash: 1 },
    prophet:        { tier: 5, cls: 'C', arch: 'support',  name: '하이어로펀트',   emoji: '🕊️' },
    grandreaper:    { tier: 5, cls: 'R', arch: 'assassin', name: '그랜드리퍼',     emoji: '🪦' },
    worldsummoner:  { tier: 5, cls: 'N', arch: 'summon',   name: '월드서머너',     emoji: '🌐' },
    // Tier 5 — 이종 21
    bladelord:      { tier: 5, cls: 'W', arch: 'melee',    name: '블레이드로드',   emoji: '🐉' },
    citadel:        { tier: 5, cls: 'K', arch: 'tank',     name: '시타델',         emoji: '🗼', range: 4 },
    runesovereign:  { tier: 5, cls: 'K', arch: 'tank',     name: '룬소버린',       emoji: '🔰' },
    paladinking:    { tier: 5, cls: 'K', arch: 'tank',     name: '팔라딘킹',       emoji: '🎖️' },
    abysslord:      { tier: 5, cls: 'R', arch: 'melee',    name: '어비스로드',     emoji: '🕸️' },
    ancientbark:    { tier: 5, cls: 'N', arch: 'tank',     name: '에인션트바크',   emoji: '🌲' },
    stormbringer:   { tier: 5, cls: 'W', arch: 'melee',    name: '스톰브링어',     emoji: '⛈️', range: 2 },
    magicbreaker:   { tier: 5, cls: 'W', arch: 'melee',    name: '매직브레이커',   emoji: '⚒️', splash: 1 },
    grandtemplar:   { tier: 5, cls: 'C', arch: 'melee',    name: '워세인트',       emoji: '💒' },
    wardancer:      { tier: 5, cls: 'R', arch: 'assassin', name: '워댄서',         emoji: '🎭' },
    terraquaker:    { tier: 5, cls: 'N', arch: 'melee',    name: '테라퀘이커',     emoji: '🪨', splash: 1 },
    cosmiccaller:   { tier: 5, cls: 'M', arch: 'ranged',   name: '코스믹콜러',     emoji: '🔭', splash: 1 },
    radianteye:     { tier: 5, cls: 'A', arch: 'ranged',   name: '레디언트아이',   emoji: '🌄' },
    eclipseranger:  { tier: 5, cls: 'A', arch: 'ranged',   name: '이클립스레인저', emoji: '🌑' },
    hurricanearcher:{ tier: 5, cls: 'A', arch: 'ranged',   name: '허리케인아처',   emoji: '🌬️', splash: 1 },
    eldersage:      { tier: 5, cls: 'M', arch: 'aoe',      name: '프라임세이지',   emoji: '📚' },
    archlich:       { tier: 5, cls: 'M', arch: 'aoe',      name: '아크리치',       emoji: '🦴' },
    gatekeeper:     { tier: 5, cls: 'N', arch: 'summon',   name: '게이트키퍼',     emoji: '🚪' },
    arbiter:        { tier: 5, cls: 'C', arch: 'support',  name: '아비터',         emoji: '♎' },
    lifewarden:     { tier: 5, cls: 'C', arch: 'support',  name: '라이프워든',     emoji: '🍀' },
    primalhunter:   { tier: 5, cls: 'R', arch: 'assassin', name: '프라이멀헌터',   emoji: '🐾' }
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
    },
    4: {
      'K+K': 'aegis', 'W+W': 'ares', 'A+A': 'artemis', 'M+M': 'hecate',
      'C+C': 'seraphim', 'R+R': 'hades', 'N+N': 'gaia',
      'K+W': 'swordsaint', 'A+K': 'bastion', 'K+M': 'arcanelord',
      'C+K': 'lightbringer', 'K+R': 'abyssknight', 'K+N': 'colossus',
      'A+W': 'tempest', 'M+W': 'runelord', 'C+W': 'warsaint', 'R+W': 'bloodblade', 'N+W': 'behemoth',
      'A+M': 'starcaller', 'A+C': 'daybreaker', 'A+R': 'nightraven', 'A+N': 'cyclone',
      'C+M': 'oracle', 'M+R': 'lich', 'M+N': 'archsummoner',
      'C+R': 'judgment', 'C+N': 'lifegiver', 'N+R': 'beastking'
    },
    5: {
      'K+K': 'eternalguard', 'W+W': 'waremperor', 'A+A': 'starpiercer', 'M+M': 'magicoverlord',
      'C+C': 'prophet', 'R+R': 'grandreaper', 'N+N': 'worldsummoner',
      'K+W': 'bladelord', 'A+K': 'citadel', 'K+M': 'runesovereign',
      'C+K': 'paladinking', 'K+R': 'abysslord', 'K+N': 'ancientbark',
      'A+W': 'stormbringer', 'M+W': 'magicbreaker', 'C+W': 'grandtemplar', 'R+W': 'wardancer', 'N+W': 'terraquaker',
      'A+M': 'cosmiccaller', 'A+C': 'radianteye', 'A+R': 'eclipseranger', 'A+N': 'hurricanearcher',
      'C+M': 'eldersage', 'M+R': 'archlich', 'M+N': 'gatekeeper',
      'C+R': 'arbiter', 'C+N': 'lifewarden', 'N+R': 'primalhunter'
    }
  };

  // 레벨 시스템 (v0.9): 웨이브 전투 참여 = +1Lv, 성급 합성 폐지
  var LV_MAX = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 }; // 티어별 최대 레벨 — 같은 티어 Max 둘 = 상위 티어 진화
  var LEVELUP = { normal: 1, boss: 1 };        // 웨이브 종료 시 레벨 상승량 (v1.2: 보스 +2 → +1, 보상 선택으로 대체)

  // 보스 클리어 보상 3택1 (v1.2): 골드 / 레벨업권 / 목숨 회복 — 4·8웨이브 보스에만 (12웨이브 = 챕터 클리어)
  var BOSS_REWARD = { gold: 6 };

  // 레벨업권 아이템: 필드 1칸 차지, 유닛에 드래그 = +1Lv 소모 (Max 대상은 스왑만)
  var TICKET = { name: '레벨업권', emoji: '🎫', desc: '유닛에 겹치면 +1레벨 (Max 유닛에는 사용 불가)' };

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
    priceT3: 18,                 // 확정 T3
    priceRandT3: 14,             // 랜덤 T3
    priceTicket: 4,              // 레벨업권
    ticketChance: 0.15,          // 슬롯이 레벨업권일 확률
    sell: { 1: 2, 2: 6, 3: 12, 4: 24, 5: 48, ticket: 2 }, // 판매가 = 티어 고정 (레벨은 공짜라 환급 미가산 — 차익 차단)
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
  // v0.9: 웨이브 레벨업(참여 시 ×1.5/웨이브 성장) 대응 — 성장률 대폭 상향
  var ENEMY = {
    HP_BASE: 260,
    HP_GROWTH: 1.35,
    DPS_BASE: 11,
    DPS_GROWTH: 1.22,
    AS: 0.8,
    MELEE_RANGE: 42,
    BOSS_HP_MULT: 1.6,
    BOSS_MINIONS: 4,
    OVERTIME: 45,   // 초과 시 전장 광폭화: 전원 공속·이속 ×2 (TFT식 루즈 방지, v1.0)
    TIMEOUT: 90     // 광폭화로도 결판이 안 나면 패배
  };

  // ---- 적 모디파이어 (v1.0): 챕터별 적 변형 — 수치는 봇 시뮬로 튜닝 ----
  var MODIFIERS = {
    swift:  { name: '신속',   icon: '💨', speedMult: 1.5 },   // 이동 속도 +50%
    armor:  { name: '방어',   icon: '🛡', dmgTaken: 0.75 },   // 받는 피해 -25%
    regen:  { name: '재생',   icon: '💚', regenPct: 0.009 },  // 초당 최대 체력 0.9% 회복
    ranged: { name: '원거리', icon: '🏹', rangeCells: 2.5 },  // 원거리 공격 (기본은 근접)
    rage:   { name: '광포',   icon: '💢', asMult: 1.35 }      // 공격 속도 +35%
  };

  // ---- 챕터 정의: 9챕터 × 12웨이브, 4웨이브마다 보스 (4·8·12) ----
  // 난이도 = CHAPTER_MULT_GROWTH^(챕터-1) 기하 곡선. 물량형/정예형 교대.
  var CHAPTER_MULT_GROWTH = 1.40; // v1.2: 보스 보상(목숨 회복)만큼 소폭 상향 (1.38 → 1.40)
  var CHAPTER_NAMES = [
    '초원의 침공', '강철 요새', '어둠의 숲',
    '사막의 유적', '얼어붙은 협곡', '화산 지대',
    '폐허의 도시', '심연의 관문', '근원의 옥좌'
  ];
  // 챕터별 적 모디파이어 (v1.0): 후반 챕터일수록 중첩
  var CHAPTER_MODS = [
    [], ['armor'], ['swift'],
    ['ranged'], ['regen'], ['rage'],
    ['swift', 'ranged'], ['armor', 'regen'], ['armor', 'regen', 'swift']
  ];
  var CHAPTERS = CHAPTER_NAMES.map(function (name, i) {
    var swarm = i % 2 === 0;
    return {
      id: i + 1, name: name,
      enemyType: swarm ? 'swarm' : 'elite',
      desc: swarm ? '물량형 — 다수의 약한 적이 밀려온다' : '정예형 — 단단한 소수가 전진한다',
      mods: CHAPTER_MODS[i],
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
    EVOLUTION: EVOLUTION, LV_MAX: LV_MAX, LEVELUP: LEVELUP, TICKET: TICKET,
    BOSS_REWARD: BOSS_REWARD,
    SKILLS: SKILLS, SKILL_VALS: SKILL_VALS,
    EXECUTE: EXECUTE, SUMMON: SUMMON,
    SHOP: SHOP, ENEMY: ENEMY, MODIFIERS: MODIFIERS, CHAPTERS: CHAPTERS,
    WAVES_PER_CHAPTER: WAVES_PER_CHAPTER, BOSS_EVERY: BOSS_EVERY, LIVES: LIVES,
    ENEMY_LOOK: ENEMY_LOOK
  };
}(typeof window !== 'undefined' ? window : globalThis));
