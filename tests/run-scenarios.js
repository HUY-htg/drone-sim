#!/usr/bin/env node
/*
 * Headless regression tests for the simulation core (no browser needed).
 * Loads the <script id="sim-core"> block from index.html and flies scripted scenarios.
 *
 *   node tests/run-scenarios.js
 *
 * Exit code 0 = all checks passed.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const core = html.match(/<script id="sim-core">([\s\S]*?)<\/script>/)[1];
const makeSim = () => new Function(core + ';return Sim;')();
const DT = 1 / 250;

let failures = 0;
function check(name, ok, detail){
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
}

// Fly ARM → TAKEOFF → MISSION and let the mission end action (RTL by default) bring the drone home.
function flyRoute(setup, opts = {}){
  const Sim = makeSim();
  Sim.params.drain = 1;
  setup(Sim);
  const events = [];
  Sim.on(e => events.push(e));
  let step = 0, minClear = 99, maxT = opts.maxT || 600;
  for (let i = 0; i < maxT / DT; i++){
    const S = Sim.S, st = S.state;
    if (step === 0){ Sim.command('ARM'); step = 1; }
    else if (step === 1 && st === 'ARMED' && S.stateT > 0.9){ Sim.command('TAKEOFF'); step = 2; }
    else if (step === 2 && st === 'HOVER' && S.stateT > 1.0){ Sim.command('MISSION'); step = 3; }
    if (opts.during) opts.during(Sim, S.t);
    Sim.step(DT);
    if (!S.grounded && S.pos[2] > 0.5) minClear = Math.min(minClear, S.minObsDist);
    if (step === 3 && (st === 'ARMED' || st === 'DISARMED' || st === 'EMERGENCY') && S.stateT > 0.5) break;
  }
  const S = Sim.S;
  return {
    Sim, S, events, minClear,
    crashed: events.some(e => e.type === 'transition' && e.to === 'EMERGENCY'),
    home: Math.hypot(S.pos[0], S.pos[1]) < 1.0 && S.grounded,
    bombs: events.filter(e => e.type === 'bomb').length,
    passes: events.filter(e => e.type === 'pass').length,
  };
}

const WAYPOINTS = [
  { e: 10, n: 20, u: 12, label: 'Điểm 1' },
  { e: 25, n: -15, u: 14, label: 'Điểm 2' },
  { e: -20, n: 10, u: 12, label: 'Điểm 3' }
];

// 1. Waypoint routes, default settings
for (const [name, list] of [['Điểm 1', [WAYPOINTS[0]]], ['Điểm 2', [WAYPOINTS[1]]], ['Điểm 3', [WAYPOINTS[2]]], ['Tuyến liên điểm 1→2→3', WAYPOINTS]]){
  const r = flyRoute(Sim => Sim.setDestinations(list, true), { maxT: 900 });
  check(`${name}: bay qua ${list.length} điểm, về Nhà máy, không va chạm`,
    !r.crashed && r.home && r.passes === list.length,
    `cách tường gần nhất ${r.minClear.toFixed(2)} m, qua ${r.passes} điểm`);
}

// 2. High speed (14 m/s): corner speed scheduling must keep the drone off the facades
{
  const r = flyRoute(Sim => { Sim.params.vMax = 14; Sim.setDestinations(WAYPOINTS, true); }, { maxT: 900 });
  check('Tốc độ tối đa 14 m/s: không văng khỏi góc cua', !r.crashed && r.home, `cách tường gần nhất ${r.minClear.toFixed(2)} m`);
}

// 3. HOLD in the middle of a multi-point route, then MISSION again: must resume at the next waypoint
{
  let held = false, resumed = false;
  const r = flyRoute(Sim => Sim.setDestinations(WAYPOINTS, true), {
    maxT: 900,
    during(Sim, t){
      const S = Sim.S;
      if (!held && S.destDone === 1 && S.state === 'MISSION'){ Sim.command('HOLD'); held = true; }
      else if (held && !resumed && S.state === 'HOVER' && S.stateT > 2){ Sim.command('MISSION'); resumed = true; }
    }
  });
  const order = r.events.filter(e => e.type === 'pass').map(e => e.msg.match(/Điểm \d/)[0]).join(' → ');
  check('HOLD giữa tuyến rồi MISSION: bay tiếp đúng điểm kế tiếp', !r.crashed && r.home && order === 'Điểm 1 → Điểm 2 → Điểm 3', order);
}

// 4. Link loss on the way to Waypoint 3 → FAILSAFE flies the planned route home and lands
{
  let cut = false;
  const r = flyRoute(Sim => Sim.setDestinations([WAYPOINTS[2]], true), {
    during(Sim, t){ if (!cut && Sim.S.state === 'MISSION' && Sim.S.stateT > 0.5){ Sim.setLink(true); cut = true; } }
  });
  check('Mất liên kết: FAILSAFE né vật cản về Nhà máy và hạ cánh',
    !r.crashed && r.home && r.events.some(e => e.to === 'FAILSAFE'), `cách tường gần nhất ${r.minClear.toFixed(2)} m`);
}

// 5. Bomber mission strike test: approaches target, cuts bomb in flight (CCRP), egresses, loops back to Home
{
  const bombDests = [
    { e: 15, n: 10, u: 16, label: 'Đường tiếp cận', role: 'pass' },
    { e: 30, n: 25, u: 16, label: '🎯 Điểm ngắm (Kho quân khí)', role: 'bomb' },
    { e: 45, n: 35, u: 18, label: '🚀 Thoát ly thẳng', role: 'pass' },
    { e: 20, n: 40, u: 18, label: '🔄 Vòng lượn thoát ly', role: 'pass' },
    { e: 0, n: 0, u: 14, label: 'Nhà máy Sản xuất (Hạ cánh)', role: 'stop' }
  ];
  const r = flyRoute(Sim => { Sim.params.task = 'bomber'; Sim.setDestinations(bombDests, true); }, { maxT: 900 });
  const imp = r.events.find(e => e.type === 'bomb_impact');
  const miss = imp ? Math.hypot(imp.impact.e - 30, imp.impact.n - 25) : 99;
  check('Bomber: tiếp cận, cắt bom trên không chính xác, thoát ly và về Nhà máy',
    !r.crashed && r.home && r.bombs === 1 && miss < 3, `cách tường gần nhất ${r.minClear.toFixed(2)} m, số lần cắt bom: ${r.bombs}, điểm rơi lệch ${miss.toFixed(2)} m`);
}

// 6. Planner: random click targets never produce a path through a building
{
  const Sim = makeSim();
  let seed = 7, worst = 99, total = 0;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 200; i++){
    const t0 = Date.now();
    Sim.setDestinations([{ e: (rnd() - 0.5) * 150, n: (rnd() - 0.5) * 150, u: 12 }], true);
    total += Date.now() - t0;
    const pts = [Sim.missionStart].concat(Sim.mission);
    for (let k = 1; k < pts.length; k++){
      const a = pts[k - 1], b = pts[k], u = Math.min(a.u, b.u);
      const N = Math.max(1, Math.ceil(Math.hypot(b.e - a.e, b.n - a.n) / 0.5));
      for (let s = 0; s <= N; s++) worst = Math.min(worst, Sim.clearanceAt(a.e + (b.e - a.e) * s / N, a.n + (b.n - a.n) * s / N, u).d);
    }
  }
  check('A*: 200 điểm click ngẫu nhiên, đường bay cách tường ≥ 1,6 m', worst >= 1.6 - 1e-6,
    `nhỏ nhất ${worst.toFixed(2)} m, trung bình ${(total / 200).toFixed(1)} ms/lần lập tuyến`);
}

// 7. Cruising above every roof needs no detour
{
  const Sim = makeSim();
  Sim.params.takeoffAlt = 36;
  const r = Sim.setDestinations([{ e: 20, n: 30, u: 36 }], true);
  check('Bay ở 36 m (trên mọi nóc nhà): đường thẳng, không cần điểm né', r.avoidCount === 0);
}

// 8. Adaptive control: hover through wind steps, compare with fixed-gain PID
function hoverSteps(adaptive){
  const Sim = makeSim(); const P = Sim.params;
  Object.assign(P, { drain:1, windOn:true, windSpeed:4, windDir:270, gust:0, adaptive });
  const run = (sec, cb) => { for (let i = 0; i < sec / DT; i++){ Sim.step(DT); if (cb) cb(Sim.S); } };
  Sim.command('ARM'); run(1); Sim.command('TAKEOFF'); run(9);
  const out = { drift:0, alt:0, leanErr:0, mErr:[] };
  const track = S => { out.drift = Math.max(out.drift, Math.hypot(S.pos[0] - S.hold[0], S.pos[1] - S.hold[1])); out.alt = Math.max(out.alt, Math.abs(S.pos[2] - S.hold[2])); };
  const steps = [() => { P.windDir = 180; }, () => { P.windSpeed = 9; }, () => { P.windDir = 90; }, () => { P.windSpeed = 5; }];
  for (const st of steps){
    st(); run(14, track);
    const S = Sim.S, Fd = (Sim.P.kd + Sim.P.kq * S.windSpd) * S.windSpd;
    const theory = Math.atan(Fd / (Sim.P.m * Sim.P.g)) * 180 / Math.PI;
    const lean = Math.acos(Math.cos(S.att[0]) * Math.cos(S.att[1])) * 180 / Math.PI;
    out.leanErr = Math.max(out.leanErr, Math.abs(lean - theory));
    out.mErr.push(Math.abs(S.est.mHat - Sim.P.m));
  }
  return out;
}
{
  const on = hoverSteps(true), off = hoverSteps(false);
  check('Thích nghi: góc nghiêng giữ vị trí khớp lý thuyết atan(cản/(m·g))', on.leanErr < 0.5, `sai lệch lớn nhất ${on.leanErr.toFixed(2)}°`);
  check('Thích nghi: m̂ hội tụ về khối lượng thật (sai số < 0.05 kg)', Math.max(...on.mErr) < 0.05, `sai số m̂ ${on.mErr.map(v => v.toFixed(3)).join(', ')} kg`);
  check('Thích nghi giữ vị trí tốt hơn PID cố định', on.drift < off.drift && on.alt < 0.05,
    `lệch ngang ${on.drift.toFixed(2)} vs ${off.drift.toFixed(2)} m · lệch cao ${on.alt.toFixed(2)} vs ${off.alt.toFixed(2)} m`);
}

// 9. Test-flight programme → results (the "Kết quả" panel): results come only from recorded flight samples
{
  const acSrc = html.match(/<script id="analysis-core">([\s\S]*?)<\/script>/)[1];
  const AC = new Function(acSrc + ';return { TESTPLAN, flightSample, testSteps, analyzeFlights, aggregatePoints };')();
  const Sim = makeSim(), P = Sim.params, flights = [];
  P.drain = 1;
  const t0 = Date.now();
  let id = 0;
  for (const pl of AC.TESTPLAN.payloads){
    Object.assign(P, { windOn:true, windSpeed:0, gust:0, windDir:270 }); Sim.syncMass();
    const f = { id:++id, t0:Sim.S.t, samples:[], live:false }; let last = -1;
    const rec = () => { if (Sim.S.t - last >= 0.2){ last = Sim.S.t; f.samples.push(AC.flightSample(Sim)); } };
    if (Sim.S.state === 'DISARMED') Sim.command('ARM');
    for (let i = 0; i < 1 / DT; i++) Sim.step(DT);
    Sim.command('TAKEOFF');
    while (!(Sim.S.state === 'HOVER' && Sim.S.stateT > 1)){ Sim.step(DT); rec(); }
    const tH = Sim.S.t, steps = AC.testSteps(); let k = 0;
    for (;;){
      while (k < steps.length && Sim.S.t - tH >= steps[k].at){
        const st = steps[k++];
        if (st.set) Object.assign(P, st.set);
        if (st.land) Sim.command('LAND');
      }
      Sim.step(DT); rec();
      if (k >= steps.length && (Sim.S.state === 'ARMED' || Sim.S.state === 'DISARMED')) break;
    }
    flights.push(f);
  }
  const A = AC.analyzeFlights(flights), agg = AC.aggregatePoints(A.points).filter(p => p.gust === 0);
  const g = (w) => agg.find(r => r.wind === w);
  const winds = [0, 3, 6, 9, 12];
  check('Bay thử: chuyến bay cho đủ điểm đo ổn định và phản ứng', A.points.length >= 6 && A.resp.length >= 5,
    `${flights.length} chuyến · ${A.points.length} đoạn đo · ${A.resp.length} phản ứng · ${Date.now() - t0} ms`);
  const incWind = winds.every((w, i) => i === 0 || g(w).lean > g(winds[i - 1]).lean);
  check('Bay thử: gió mạnh hơn → nghiêng nhiều hơn', incWind,
    `Gió: ${winds.map(w => g(w).lean.toFixed(1)).join(' → ')}°`);
}

// 10. Surveillance missions (the drone's main job)
{
  const sc = html.match(/<script id="surv-core">([\s\S]*?)<\/script>/)[1];
  const SURV = new Function(sc + ';return SURV;')();
  const radius = { min: 1e9, max: 0 };
  const watchOrbit = Sim => { const S = Sim.S, o = Sim.params.orbit; if (o && S.orbPhase === 'circle' && S.orbTrav > 0.5){ const d = Math.hypot(S.pos[0] - o.e, S.pos[1] - o.n); radius.min = Math.min(radius.min, d); radius.max = Math.max(radius.max, d); } };

  for (const key of Object.keys(SURV.PATROLS)){
    const r = flyRoute(Sim => { Sim.params.task = 'patrol'; Sim.params.loops = 2; Sim.setDestinations(SURV.patrolPts(key), true); }, { maxT: 900 });
    const pts = SURV.PATROLS[key].pts.length, laps = r.events.filter(e => e.type === 'lap').length, passes = r.events.filter(e => e.type === 'pass').length;
    check(`Tuần tra "${SURV.PATROLS[key].name}" 2 vòng: qua đủ điểm, về Nhà máy, không va chạm`,
      !r.crashed && r.home && laps === 1 && passes === 2 * pts,
      `${passes}/${2 * pts} điểm · cách tường gần nhất ${r.minClear.toFixed(2)} m`);
  }

  const F1 = makeSim().obstacles.find(o => o.id === 'F1');
  radius.min = 1e9; radius.max = 0;
  let r = flyRoute(Sim => Sim.setOrbit(Object.assign(SURV.orbitFor(F1), { u: 20, laps: 2, v: 4 }), true), { maxT: 900, during: watchOrbit });
  const R1 = SURV.orbitFor(F1).r;
  check(`Bay vòng ${F1.name} R ${R1} m, 2 vòng: bám bán kính, tự nâng độ cao qua nhà khác, về Nhà máy`,
    !r.crashed && r.home && r.events.some(e => /Đã bay xong 2 vòng/.test(e.msg || '')) && radius.max - R1 < 1.5 && R1 - radius.min < 1.5 && r.Sim.params.orbit.u >= 20,
    `bán kính ${radius.min.toFixed(1)}–${radius.max.toFixed(1)} m · cao ${r.Sim.params.orbit.u} m · cách tường gần nhất ${r.minClear.toFixed(2)} m`);

  // nose stays on the target while circling
  let worst = 0;
  r = flyRoute(Sim => Sim.setOrbit({ e: -4, n: -12, r: 14, u: 24, laps: 1, v: 4, name: 'Silo', lookU: 12 }, true), { maxT: 600,
    during: Sim => { const S = Sim.S; if (S.orbPhase === 'circle' && S.orbTrav > 2){ const want = Math.atan2(-12 - S.pos[1], -4 - S.pos[0]); let d = Math.abs(want - S.att[2]); d = Math.min(d, 2 * Math.PI - d); worst = Math.max(worst, d * 180 / Math.PI); } } });
  check('Bay vòng: sau khi vào vòng, mũi drone luôn hướng vào mục tiêu', !r.crashed && r.home && worst < 10, `lệch hướng lớn nhất ${worst.toFixed(1)}°`);

  for (const key of Object.keys(SURV.AREAS)){
    const A = SURV.AREAS[key], L = SURV.scanLanes(A, 30, 0.3);
    const covered = L.lanes * L.width * (1 - 0.3) + 0.3 * L.width >= Math.min(A.e1 - A.e0, A.n1 - A.n0);
    r = flyRoute(Sim => { Sim.params.task = 'scan'; Sim.setDestinations(L.pts, true); }, { maxT: 900 });
    const passes = r.events.filter(e => e.type === 'pass').length;
    check(`Quét "${A.name}" ở 30 m: ${L.lanes} làn phủ kín bề ngang, bay hết làn, về Nhà máy`,
      covered && !r.crashed && r.home && passes === L.pts.length,
      `${passes}/${L.pts.length} đầu làn · vệt ${L.width.toFixed(0)} m · cách tường gần nhất ${r.minClear.toFixed(2)} m`);
  }

  // 11. Giả lập sự cố tuần tra: Mất liên kết dữ liệu & camera → Mất thông tin mặt đất & lưu vào bộ nhớ hộp đen drone
  {
    const Sim = makeSim();
    Sim.params.task = 'patrol';
    Sim.params.loops = 1;
    Sim.params.autoLinkFailOnPatrol = true;
    Sim.setDestinations([
      { e: 10, n: 10, u: 14, role: 'pass', label: 'Điểm tuần tra 1' },
      { e: 20, n: 20, u: 14, role: 'pass', label: 'Điểm tuần tra 2' },
      { e: 0, n: 0, u: 14, role: 'stop', label: 'Nhà máy' }
    ], true);
    const events = [];
    Sim.on(e => events.push(e));
    Sim.command('ARM');
    for (let i = 0; i < 1 / DT; i++) Sim.step(DT);
    Sim.command('TAKEOFF');
    while (!(Sim.S.state === 'HOVER' && Sim.S.stateT > 1)) Sim.step(DT);
    Sim.command('MISSION');
    for (let i = 0; i < 45 / DT; i++){
      Sim.step(DT);
      if ((Sim.S.state === 'ARMED' || Sim.S.state === 'DISARMED') && Sim.S.grounded) break;
    }
    const hadLinkLost = events.some(e => e.to === 'FAILSAFE' || (e.msg && e.msg.includes('MẤT LIÊN KẾT')));
    const hadRecSaved = events.some(e => e.msg && (e.msg.includes('LƯU TOÀN BỘ THÔNG TIN') || e.msg.includes('HỘP ĐEN')));
    check('Sự cố tuần tra: Mất liên kết (dữ liệu & camera) → Mất thông tin mặt đất & lưu vào bộ nhớ drone',
      hadLinkLost && hadRecSaved && Sim.S.grounded,
      `ghi nhận mất liên kết, lưu thông tin vào hộp đen (${Sim.S.blackboxMB} MB), về nhà an toàn`);
  }

  // 12. Bomber: Đánh giá thả bom trúng mục tiêu (trong bán kính diệt) vs chưa trúng mục tiêu (ngoài bán kính diệt)
  {
    const Sim = makeSim();
    const tgt = { e: 52, n: 38, name: 'Kho quân khí', radius: 6.0 };
    Sim.params.bomberTarget = tgt;
    const hitRes = Sim.evalBombHit(52.8, 38.5, tgt); // ~0.9m <= 6.0m
    const missRes = Sim.evalBombHit(72.0, 55.0, tgt); // ~26m > 6.0m
    check('Bomber: Đánh giá thả bom trúng hay chưa (báo trúng mục tiêu vs chưa trúng mục tiêu)',
      hitRes.hit === true && missRes.hit === false && hitRes.dist < 2.0 && missRes.dist > 20.0,
      `Trúng: lệch ${hitRes.dist.toFixed(1)} m · Chưa trúng: lệch ${missRes.dist.toFixed(1)} m`);
  }

  // 13. Bomber: Mất liên kết khi chưa hoàn thành nhiệm vụ → Tiếp tục tự hành thả bom rồi mới quay về Nhà máy (FAILSAFE)
  {
    const bombDests = [
      { e: 15, n: 10, u: 16, label: 'Đường tiếp cận', role: 'pass' },
      { e: 30, n: 25, u: 16, label: '🎯 Cắt bom (Kho quân khí)', role: 'bomb' },
      { e: 45, n: 35, u: 18, label: '🚀 Thoát ly thẳng', role: 'pass' },
      { e: 20, n: 40, u: 18, label: '🔄 Vòng lượn thoát ly', role: 'pass' },
      { e: 0, n: 0, u: 14, label: 'Nhà máy Sản xuất (Hạ cánh)', role: 'stop' }
    ];
    let cut = false;
    const r = flyRoute(Sim => {
      Sim.params.task = 'bomber';
      Sim.setDestinations(bombDests, true);
    }, {
      maxT: 900,
      during(Sim, t){
        // Mất liên kết ngay khi đang bay MISSION tiếp cận mục tiêu trước khi cắt bom
        if (!cut && Sim.S.state === 'MISSION' && Sim.S.stateT > 0.5 && !Sim.S.bombDropped){
          Sim.setLink(true);
          cut = true;
        }
      }
    });

    const hadBomb = r.bombs >= 1;
    const hadFailsafe = r.events.some(e => e.to === 'FAILSAFE');
    const blackboxSaved = parseFloat(r.S.blackboxMB) > 0;
    check('Sự cố Bomber: Mất liên kết khi chưa thả bom → Tự hành thả bom rồi mới FAILSAFE về Nhà máy',
      !r.crashed && r.home && hadBomb && hadFailsafe && blackboxSaved,
      `cắt bom: ${r.bombs} lần, hộp đen lưu: ${r.S.blackboxMB} MB, về bãi an toàn`);
  }
}

/* ===================== Physics: rigid body, contact, ballistics, one bomb per sortie ===================== */
const runFor = (Sim, sec, cb) => { for (let i = 0; i < sec / DT; i++){ Sim.step(DT); if (cb && cb(Sim.S)) return true; } return false; };
function toHover(Sim, alt){
  if (alt) Sim.params.takeoffAlt = alt;
  Sim.command('ARM'); runFor(Sim, 1); Sim.command('TAKEOFF');
  runFor(Sim, 60, S => S.state === 'HOVER' && S.stateT > 4);
}

// 14. Exterior ballistics: with C_d = 0 the integrator must reproduce the vacuum solution
{
  const Sim = makeSim(), P = Sim.P, cd = P.bombCd;
  P.bombCd = 0;
  const imp = Sim.predictImpact([0, 0, 100], [10, 0, 0], 1, () => [0, 0, 0], 0);
  P.bombCd = cd;
  const tA = Math.sqrt(2 * 100 / 9.81);
  check('Đạn đạo không lực cản trùng nghiệm giải tích (t = √(2h/g), tầm = v·t)',
    Math.abs(imp.tof - tA) < 1e-3 && Math.abs(imp.e - 10 * tA) < 0.01,
    `t ${imp.tof.toFixed(4)} / ${tA.toFixed(4)} s · tầm ${imp.e.toFixed(3)} / ${(10 * tA).toFixed(3)} m`);
}

// 15. Terminal velocity of the bomb equals √(2mg/(ρ·C_d·A)) for every allowed mass
{
  const Sim = makeSim(); let worst = 0; const rows = [];
  for (const m of [0.25, 1, 2]){
    const g = Sim.bombGeom(m), vt = Math.sqrt(2 * m * 9.81 / (1.225 * g.Cd * g.A));
    const b = { x: [0, 0, 0], v: [0, 0, 0], kA: Sim.bombKA(m) };
    for (let i = 0; i < 4000; i++){ Sim.bombStep(b, 0.02, 0, () => [0, 0, 0]); b.x[2] = 0; }   // hold at sea-level density
    const err = Math.abs(-b.v[2] - vt) / vt; worst = Math.max(worst, err);
    rows.push(`${m} kg: ${(-b.v[2]).toFixed(2)} / ${vt.toFixed(2)} m/s`);
  }
  check('Vận tốc tới hạn của bom khớp √(2mg/ρC_dA)', worst < 1e-3, rows.join(' · '));
}

// 16. One bomb per sortie: CCRP releases once, every later release is refused, reload only after landing at the Factory
{
  const Sim = makeSim(), P = Sim.params, ev = [];
  Sim.on(e => ev.push(e));
  Object.assign(P, { drain: 1, task: 'bomber', bombMass: 1.5, bomberTarget: { e: 40, n: 30, name: 'Bia', radius: 6 } });
  Sim.setDestinations([
    { e: -16, n: -12, u: 20, role: 'pass', label: 'IP' }, { e: 40, n: 30, u: 20, role: 'bomb', label: 'Ngắm' },
    { e: 64, n: 48, u: 20, role: 'pass', label: 'Thoát' }, { e: 0, n: 0, u: 20, role: 'stop', label: 'Nhà máy' }], true);
  const loaded = Sim.S.bombs === 0;            // nothing loaded before the first step on the pad
  toHover(Sim, 12);
  const m0 = Sim.P.m;
  Sim.command('MISSION');
  let triedAgain = null, reloadInAir = false;
  runFor(Sim, 400, S => {
    if (S.bombDropped && triedAgain == null && !S.grounded){
      triedAgain = Sim.dropBomb('manual');
      Sim.setDestinations(Sim.destinations, true);            // re-planning must not re-arm anything
      Sim.syncLoadout();
      reloadInAir = S.bombs > 0;
    }
    return S.state === 'DISARMED' && S.stateT > 0.2;
  });
  const releases = ev.filter(e => e.type === 'bomb').length;
  const refused = ev.some(e => e.type === 'reject' && /Thả bom bị từ chối/.test(e.msg));
  const S = Sim.S;
  check('Mỗi chuyến chỉ 1 quả bom: thả lần 2 bị từ chối, không nạp lại trên không, nạp lại sau khi hạ cánh tại Nhà máy',
    loaded && releases === 1 && triedAgain === false && refused && !reloadInAir && S.bombs === 1 && Math.abs(m0 - 4.3) < 1e-9 && Math.abs(Sim.P.m - 4.3) < 1e-9,
    `thả ${releases} lần · lần 2: ${triedAgain ? 'được' : 'từ chối'} · khối lượng cất cánh ${m0.toFixed(2)} kg · sau hạ cánh mang ${S.bombs} quả`);
}

// 17. Bomb mass is capped at 2 kg
{
  const Sim = makeSim();
  Object.assign(Sim.params, { task: 'bomber', bombMass: 5 });
  Sim.step(DT);
  check('Khối lượng bom tối đa 2 kg', Sim.S.bombMass === 2 && Math.abs(Sim.P.m - 4.8) < 1e-9, `nạp ${Sim.S.bombMass} kg · tổng ${Sim.P.m.toFixed(2)} kg`);
}

// 18. CCRP accuracy for every bomb mass in calm and gusty wind (wind blowing across and along the run-in)
{
  let worst = 0; const rows = [];
  for (const [m, w, g, dir] of [[0.25, 0, 0, 270], [1, 6, 0.3, 270], [1, 6, 0.3, 0], [2, 9, 0.3, 270], [2, 9, 0.3, 0]]){
    const Sim = makeSim(), P = Sim.params, ev = [];
    Sim.on(e => ev.push(e));
    const T = { e: 52, n: 38, name: 'Kho', radius: 6 }, d = Math.hypot(T.e, T.n), ux = T.e / d, uy = T.n / d;
    Object.assign(P, { drain: 1, windOn: w > 0, windSpeed: w, gust: g, windDir: dir, task: 'bomber', bombMass: m, bomberTarget: T });
    Sim.setDestinations([{ e: T.e - ux * 70, n: T.n - uy * 70, u: 20, role: 'pass' }, { e: T.e, n: T.n, u: 20, role: 'bomb' },
      { e: T.e + ux * 30, n: T.n + uy * 30, u: 20, role: 'pass' }, { e: 0, n: 0, u: 20, role: 'stop' }], true);
    toHover(Sim, 12); Sim.command('MISSION');
    runFor(Sim, 300, () => ev.some(e => e.type === 'bomb_impact'));
    const imp = ev.find(e => e.type === 'bomb_impact');
    const miss = imp ? Math.hypot(imp.impact.e - T.e, imp.impact.n - T.n) : 99;
    worst = Math.max(worst, miss);
    rows.push(`${m} kg/${w} m/s/${dir}°: ${miss.toFixed(2)} m`);
  }
  check('CCRP: bom 0,25–2 kg, gió tới 9 m/s có giật, điểm rơi lệch < 3 m', worst < 3, rows.join(' · '));
}

// 19. Hover equilibrium: thrust = m·g with and without the 2 kg bomb; bomb release → m̂ re-converges, altitude holds
{
  const Sim = makeSim(), P = Sim.params;
  Object.assign(P, { drain: 1, windOn: false, task: 'bomber', bombMass: 2 });
  toHover(Sim, 15);
  runFor(Sim, 6);
  const tLoaded = Sim.S.T / (Sim.P.m * Sim.P.g);
  const z0 = Sim.S.pos[2], tRel = Sim.S.t;
  Sim.dropBomb('manual');
  let dzMax = 0, tConv = 0;
  runFor(Sim, 10, S => { dzMax = Math.max(dzMax, Math.abs(S.pos[2] - z0)); if (Math.abs(S.est.mHat - Sim.P.m) >= 0.05) tConv = S.t - tRel; return false; });
  const tEmpty = Sim.S.T / (Sim.P.m * Sim.P.g);
  check('Treo: lực đẩy = m·g (có và không có bom 2 kg); thả bom → m̂ hội tụ < 5 s, độ cao lệch < 1 m',
    Math.abs(tLoaded - 1) < 0.005 && Math.abs(tEmpty - 1) < 0.005 && tConv < 5 && dzMax < 1,
    `T/mg ${tLoaded.toFixed(4)} → ${tEmpty.toFixed(4)} · m̂ về ${Sim.S.est.mHat.toFixed(3)} kg sau ${tConv.toFixed(2)} s · lệch cao tối đa ${dzMax.toFixed(2)} m`);
}

// 20. Yaw 180° at hover: the rigid-body coupling must not push the drone off its spot
{
  const Sim = makeSim();
  Object.assign(Sim.params, { drain: 1, windOn: false });
  toHover(Sim, 10);
  const S = Sim.S, p0 = S.pos.slice(); let drift = 0;
  S.yawSp = S.att[2] + Math.PI;
  runFor(Sim, 6, s => { drift = Math.max(drift, Math.hypot(s.pos[0] - p0[0], s.pos[1] - p0[1], s.pos[2] - p0[2])); });
  check('Xoay mũi 180° khi treo: không trôi vị trí', drift < 0.1, `trôi tối đa ${drift.toFixed(3)} m`);
}

// 21. KILL at 30 m: free fall with drag, then the skids/arms hit the ground and the drone comes to rest
{
  const Sim = makeSim();
  Object.assign(Sim.params, { drain: 1, windOn: false });
  toHover(Sim, 30);
  const S = Sim.S, z0 = S.xc[2], t0 = S.t;
  Sim.command('KILL');
  let tImp = null, vImp = 0;
  runFor(Sim, 15, s => { if (tImp == null && s.grounded){ tImp = s.t - t0; vImp = -s.vel[2]; } return false; });
  // reference: same drag law, no thrust, from the same height (motor spin-down neglected)
  const m = Sim.P.m, kd = Sim.P.kd, kq = Sim.P.kq;
  let z = z0, v = 0, t = 0;
  while (z > Sim.P.hCg){ const a = -9.81 - (kd + kq * Math.abs(v)) * v / m; v += a * 1e-4; z += v * 1e-4; t += 1e-4; }
  check('KILL ở 30 m: rơi tự do có cản, chạm đất đúng thời điểm (±5%), nằm yên và DISARMED',
    tImp != null && Math.abs(tImp - t) / t < 0.05 && S.state === 'DISARMED' && Math.hypot(...S.vel) < 0.05,
    `chạm đất sau ${tImp && tImp.toFixed(2)} s (lý thuyết ${t.toFixed(2)} s) · ${vImp.toFixed(1)} m/s`);
}

// 22. Parked on the pad in 6 m/s wind: static friction holds, no creep, airframe level on its skids
{
  const Sim = makeSim();
  Object.assign(Sim.params, { windOn: true, windSpeed: 6, gust: 0.3 });
  runFor(Sim, 30);
  const S = Sim.S, creep = Math.hypot(S.pos[0], S.pos[1]), tilt = Math.acos(Math.cos(S.att[0]) * Math.cos(S.att[1])) * 180 / Math.PI;
  check('Đỗ trên bãi khi gió 6 m/s: ma sát tĩnh giữ chặt (trôi < 1 cm), thân nằm ngang trên càng',
    creep < 0.01 && tilt < 0.5 && Math.abs(S.contactN - Sim.P.m * Sim.P.g) < 0.05 * Sim.P.m * Sim.P.g,
    `trôi ${(creep * 1000).toFixed(1)} mm · nghiêng ${tilt.toFixed(2)}° · phản lực ${S.contactN.toFixed(1)} N / m·g ${(Sim.P.m * Sim.P.g).toFixed(1)} N`);
}

// 24. The bomb is never brought home: a target far off the run-in line is still bombed (reported as a miss),
//     and an RTL ordered before the aim point releases the bomb at once
{
  const run = (tgt, cut) => {
    const Sim = makeSim(), P = Sim.params, ev = [];
    Sim.on(e => ev.push(e));
    Object.assign(P, { drain: 1, task: 'bomber', bombMass: 1, bomberTarget: tgt });
    Sim.setDestinations([{ e: -20, n: -15, u: 20, role: 'pass' }, { e: 40, n: 30, u: 20, role: 'bomb' }, { e: 64, n: 48, u: 20, role: 'pass' }, { e: 0, n: 0, u: 20, role: 'stop' }], true);
    toHover(Sim, 12); Sim.command('MISSION');
    let rtl = false, landedLoaded = null;
    Sim.on(e => { if (e.type === 'transition' && e.from === 'LANDING' && e.to === 'ARMED') landedLoaded = Sim.S.bombs > 0; });
    runFor(Sim, 400, S => { if (cut && !rtl && S.state === 'MISSION' && S.pos[0] > 5){ Sim.command('RTL'); rtl = true; } return S.state === 'DISARMED' && S.stateT > 0.2; });
    return { ev, S: Sim.S, landedLoaded };
  };
  const a = run({ e: 40, n: 52, name: 'Bia lệch', radius: 5 }, false);
  const b = run({ e: 40, n: 30, name: 'Bia', radius: 5 }, true);
  const missA = a.ev.some(e => e.type === 'bomb_miss'), dropsA = a.ev.filter(e => e.type === 'bomb').length;
  const forcedB = b.ev.some(e => e.type === 'bomb' && e.src === 'forced'), resB = b.ev.some(e => e.type === 'bomb_miss' || e.type === 'bomb_hit');
  check('Lệnh ném bom luôn được thực hiện: mục tiêu lệch tuyến vẫn ném và báo trượt; gọi RTL giữa chừng thì thả bom trước khi về, không mang bom về Nhà máy',
    dropsA === 1 && missA && forcedB && resB && b.ev.filter(e => e.type === 'bomb').length === 1 && a.landedLoaded === false && b.landedLoaded === false,
    `lệch tuyến: thả ${dropsA} lần, ${missA ? 'báo trượt' : 'không báo'} · RTL giữa chừng: ${forcedB ? 'thả bắt buộc' : 'không thả'}`);
}

// 23. Ground traffic: kinematic bicycle (vehicles) and unicycle (people) stay within their physical limits
{
  const sc = html.match(/<script id="surv-core">([\s\S]*?)<\/script>/)[1];
  const SURV = new Function(sc + ';return SURV;')();
  const A = SURV.makeAgents();
  let latMax = 0, accMax = 0, accMin = 0, rMin = 1e9, vPed = 0, gapMin = 1e9, off = 0;
  const DTA = 0.05;
  for (let k = 0; k < 4800; k++){            // 4 minutes
    SURV.stepAgents(A, DTA);
    A.forEach(a => {
      if (a.type === 'v'){
        const td = Math.abs(Math.tan(a.delta));
        latMax = Math.max(latMax, a.v * a.v * td / a.L);
        accMax = Math.max(accMax, a.acc); accMin = Math.min(accMin, a.acc);
        if (td > 1e-4) rMin = Math.min(rMin, a.L / td);
        const p = SURV.pointAt(SURV.GEOM[a.loop], a.s); off = Math.max(off, Math.hypot(p.e - a.e, p.n - a.n));
        A.forEach(b => { if (b !== a && b.type === 'v' && b.loop === a.loop) gapMin = Math.min(gapMin, Math.hypot(a.e - b.e, a.n - b.n)); });
      } else vPed = Math.max(vPed, a.v);
    });
  }
  const rLim = 2.7 / Math.tan(35 * Math.PI / 180);
  check('Giao thông mặt đất: xe theo mô hình xe đạp động học (gia tốc ngang ≤ 3 m/s², +2,5/−4 m/s², bán kính ≥ L/tan 35°), người ≤ 1,4 m/s, không đâm nhau',
    latMax <= 3.05 && accMax <= 2.5 + 1e-9 && accMin >= -4 - 1e-9 && rMin >= rLim - 1e-6 && vPed <= 1.4 + 1e-9 && gapMin > 4 && off < 3,
    `a_ngang max ${latMax.toFixed(2)} · a ${accMin.toFixed(1)}…${accMax.toFixed(1)} m/s² · R min ${rMin.toFixed(1)} m · người ${vPed.toFixed(2)} m/s · xe gần nhất ${gapMin.toFixed(1)} m · lệch làn ${off.toFixed(2)} m`);
}

console.log(failures ? `\n${failures} kiểm tra thất bại` : '\nTất cả kiểm tra đều đạt');
process.exit(failures ? 1 : 0);
