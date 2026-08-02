// 计算层：格式化、累积路径、人口模型、资产等效收益、目标导向倒推（所需储蓄额 + 每月需存）
// 读取全局 state（由 store.js 提供），关键函数也可接收 s 以支持敏感性扫描
function fmtNum(n, digits) {
  if (n === null || n === undefined || isNaN(n)) return '--';
  return n.toLocaleString('zh-CN', {minimumFractionDigits: digits || 0, maximumFractionDigits: digits === undefined ? 2 : digits});
}
function fmtWan(n) { return fmtNum(n, 1) + ' 万'; }
function fmtPct(n, d) { return (n * 100).toFixed(d === undefined ? 1 : d) + '%'; }

function yearsToRetire(s) { s = s || state; return Math.max(0, s.targetAge - s.currentAge); }

// 累积路径：从 startAge 起，每年存入（名义，按通胀递增）currentSavings 起步，按收益率复利
function calculateRetirementPath(startAge, targetAge, annualDeposit, currentSavings, returnRate, inflationRate) {
  const data = [];
  let balance = currentSavings;
  let cumulative = 0;
  for (let year = 0; year <= 100 - startAge; year++) {
    const age = startAge + year;
    const deposit = age < targetAge ? annualDeposit * Math.pow(1 + inflationRate, year) : 0;
    if (year === 0) balance += deposit;
    else balance = balance * (1 + returnRate) + deposit;
    cumulative += deposit;
    const real = balance / Math.pow(1 + (state ? state.inflation : inflationRate), year);
    data.push({age: age, nominal: balance, real: real, cumulative: cumulative});
  }
  return data;
}

// 退休阶段（按绝对年龄划分）
const RETIREMENT_PHASES = [
  {key:'active',  name:'健康活跃期', maxAge:75,  baseMul:1.2, medical:3,  care:false},
  {key:'decline', name:'缓慢衰退期', maxAge:85,  baseMul:1.0, medical:6,  care:false},
  {key:'care',    name:'护理依赖期', maxAge:1e9, baseMul:0.7, medical:10, care:true}
];
function phaseOfAge(age) {
  return RETIREMENT_PHASES.find(p => age < p.maxAge) || RETIREMENT_PHASES[RETIREMENT_PHASES.length - 1];
}

// 退休期逐年「净现金流」（不含初始本金）：收入=养老金，支出=生活+医疗自付+护理
function retirementNetFlows(s) {
  s = s || state;
  const lifestyleAnnual = lifestyleOptions[s.lifestyle];
  const careMonthly = careOptions[s.careType];
  const medical = medicalOptions[s.medicalScenario];
  const insRate = s.insuranceRate;
  const medInfl = s.medicalInflation;
  const infl = s.inflation;
  const pensionAnnual = s.pensionMonthly * 12 / 10000;   // 元/月 → 万元/年
  const flows = [];
  for (let y = 0; s.targetAge + y < s.lifeExpectancy; y++) {
    const ph = phaseOfAge(s.targetAge + y);
    const base = lifestyleAnnual * ph.baseMul * Math.pow(1 + infl, y);
    const medicalNet = ph.medical * Math.pow(1 + medInfl, y) * (1 - insRate);
    let extraMedical = 0;
    if (medical.freq > 0 && y > 0 && y % medical.freq === 0) {
      extraMedical = medical.base * Math.pow(1 + medInfl, y) * (1 - insRate);
    }
    const care = (ph.care && careMonthly) ? careMonthly * 12 * Math.pow(1 + medInfl, y) : 0;
    const income = pensionAnnual * Math.pow(1 + infl, y);
    const expenses = base + medicalNet + extraMedical + care;
    flows.push({y, age: s.targetAge + y, income, expenses, net: income - expenses, base, medical: medicalNet + extraMedical, care});
  }
  return flows;
}

// 所需养老储蓄额 C（单人）：使资金恰好支撑退休净现金流至预期寿命
function requiredRetirementCorpus(s) {
  s = s || state;
  return s.mode === 'couple' ? coupleCorpus(s) : singleCorpus(s);
}
function singleCorpus(s) {
  const r = s.returnRate;
  const flows = retirementNetFlows(s);
  let bal = 0;
  flows.forEach(f => { bal = bal * (1 + r) + f.net; });
  const T = flows.length;
  const C = T > 0 ? Math.max(0, -bal / Math.pow(1 + r, T)) : 0;
  const n = yearsToRetire(s);
  return { nominal: C, real: n > 0 ? C / Math.pow(1 + s.inflation, n) : C, flows, T };
}

// 每月需存（单人）：线性反解
function requiredMonthlyDeposit(s, C) {
  s = s || state;
  return s.mode === 'couple' ? coupleSolve(s).deposit : singleMonthlyDeposit(s, C);
}
function singleMonthlyDeposit(s, C) {
  const n = yearsToRetire(s);
  if (n <= 0) return {realAnnual:0, realMonthly:0, nominalFirst:0, nominalLast:0};
  const at = path => { const p = path.find(d => d.age === s.targetAge) || path[path.length - 1]; return p ? p.nominal : 0; };
  const B0 = at(calculateRetirementPath(s.startAge, s.targetAge, 0, s.currentSavings, s.returnRate, s.inflation));
  const B1 = at(calculateRetirementPath(s.startAge, s.targetAge, 1, s.currentSavings, s.returnRate, s.inflation));
  const slope = B1 - B0;
  const A = slope <= 0 ? 0 : Math.max(0, (C - B0) / slope);
  const D = A / 12;
  const g = 1 + s.inflation;
  return { realAnnual: A, realMonthly: D, nominalFirst: D, nominalLast: D * Math.pow(g, n - 1) };
}

// 退休支取模拟（单人）
function simulateRetirementCashflow(s, initialCapital) {
  s = s || state;
  return s.mode === 'couple' ? coupleSim(s) : singleSim(s, initialCapital);
}
function singleSim(s, initialCapital) {
  s = s || state;
  const C = initialCapital !== undefined ? initialCapital : requiredRetirementCorpus(s).nominal;
  const r = s.returnRate;
  const flows = retirementNetFlows(s);
  let bal = C;
  const detail = [];
  for (const f of flows) {
    bal = bal * (1 + r) + f.net;
    detail.push({age: f.age, income: f.income, expenses: f.expenses, base: f.base, medical: f.medical, care: f.care, endBalance: bal});
    if (bal <= 0) return {depletionAge: f.age, survives: false, finalBalance: bal, detail};
  }
  return {depletionAge: s.lifeExpectancy, survives: bal >= 0, finalBalance: bal, detail};
}

// ============ 夫妻共同规划（独立时间线）============
// 两人各自有退休/去世年份；家庭作为一个经济单元：共同储蓄(到较晚退休)、共同支取(到较晚去世)。
// 丧偶期：仅一人在世时，家庭生活支出按 survivorFactor 下调；医疗/护理按在世者本人算。
function couplePersons(s) {
  return [
    {age: s.currentAge, retire: s.targetAge, death: s.lifeExpectancy, pension: s.pensionMonthly},
    {age: s.spouse.currentAge, retire: s.spouse.targetAge, death: s.spouse.lifeExpectancy, pension: s.spouse.pensionMonthly}
  ];
}
function coupleSolve(s) {
  s = s || state;
  const [A, B] = couplePersons(s);
  const eA = {retire: A.retire - A.age, death: A.death - A.age};
  const eB = {retire: B.retire - B.age, death: B.death - B.age};
  const H = Math.max(eA.death, eB.death);
  const R_first = Math.min(eA.retire, eB.retire);
  const R_last = Math.max(eA.retire, eB.retire);
  const r = s.returnRate, infl = s.inflation, medInfl = s.medicalInflation, ins = s.insuranceRate;
  const lifeH = lifestyleOptions[s.lifestyle], careM = careOptions[s.careType], medical = medicalOptions[s.medicalScenario], surv = s.survivorFactor;

  function run(D) {
    let bal = s.currentSavings;
    const traj = [];
    for (let y = 0; y < H; y++) {
      const aAge = A.age + y, bAge = B.age + y;
      const aAlive = y < eA.death, bAlive = y < eB.death;
      const aRet = aAlive && y >= eA.retire, bRet = bAlive && y >= eB.retire;
      const numAlive = (aAlive ? 1 : 0) + (bAlive ? 1 : 0);
      // 养老金收入（各自退休且在世）
      let income = 0;
      if (aRet) income += (A.pension * 12 / 1e4) * Math.pow(1 + infl, y);
      if (bRet) income += (B.pension * 12 / 1e4) * Math.pow(1 + infl, y);
      // 共同储蓄（直到较晚退休）
      const deposit = y < R_last ? 12 * D * Math.pow(1 + infl, y) : 0;
      // 家庭生活支出（进入退休期后；丧偶期按系数下调）
      let living = 0;
      if (y >= R_first && numAlive > 0) {
        const survMul = numAlive === 2 ? 1 : surv;
        const older = Math.max(aAlive ? aAge : 0, bAlive ? bAge : 0);
        living = lifeH * survMul * phaseOfAge(older).baseMul * Math.pow(1 + infl, y);
      }
      // 医疗/护理按在世者本人叠加
      let med = 0, care = 0;
      [[aAlive, aAge], [bAlive, bAge]].forEach(([al, ag]) => {
        if (!al) return;
        const ph = phaseOfAge(ag);
        med += ph.medical * Math.pow(1 + medInfl, y) * (1 - ins);
        if (ph.care && careM) care += careM * 12 * Math.pow(1 + medInfl, y);
      });
      let extra = 0;
      if (y >= R_first && medical.freq > 0 && y > 0 && y % medical.freq === 0) extra = medical.base * Math.pow(1 + medInfl, y) * (1 - ins);
      const outflow = living + med + care + extra;
      bal = bal * (1 + r) + deposit + income - outflow;
      traj.push({y, aAge, bAge, aAlive, bAlive, numAlive, deposit, income, living, medical: med + extra, care, outflow, endBalance: bal});
    }
    return {traj, final: bal};
  }
  if (H <= 0) return {D: 0, peakC: s.currentSavings, peakCreal: s.currentSavings, traj: [], H: 0, R_first: 0, R_last: 0, n: 0, deposit: {realAnnual:0, realMonthly:0, nominalFirst:0, nominalLast:0}};
  const f0 = run(0).final, f1 = run(1).final;
  const D = Math.abs(f1 - f0) < 1e-9 ? 0 : Math.max(0, -f0 / (f1 - f0));
  const traj = run(D).traj;
  let peak = s.currentSavings, peakYear = 0;
  traj.forEach(t => { if (t.endBalance > peak) { peak = t.endBalance; peakYear = t.y; } });
  const n = R_last, g = 1 + infl;
  return {D, peakC: peak, peakCreal: peak / Math.pow(1 + infl, peakYear), traj, H, R_first, R_last, n,
    deposit: {realAnnual: D * 12, realMonthly: D, nominalFirst: D, nominalLast: n > 0 ? D * Math.pow(g, n - 1) : D}};
}
function coupleCorpus(s) {
  const j = coupleSolve(s);
  return {nominal: j.peakC, real: j.peakCreal};
}
function coupleSim(s) {
  const j = coupleSolve(s);
  const last = j.traj[j.traj.length - 1];
  return {detail: j.traj.filter(t => t.y >= j.R_first), full: j.traj, survives: last ? last.endBalance >= -1e-6 : true, finalBalance: last ? last.endBalance : 0, R_first: j.R_first, H: j.H};
}

function getPopulation(year) {
  year = parseInt(year);
  const keys = Object.keys(populationByYear).map(Number).sort((a, b) => a - b);
  const grab = y => { const d = populationByYear[y]; return {male: d.male.slice(), female: d.female.slice(), ageGroups: ageGroups}; };
  if (populationByYear[year]) return grab(year);
  if (year <= keys[0]) return grab(keys[0]);
  if (year >= keys[keys.length - 1]) return grab(keys[keys.length - 1]);
  let y0 = keys[0], y1 = keys[1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (year > keys[i] && year < keys[i + 1]) { y0 = keys[i]; y1 = keys[i + 1]; break; }
  }
  const t = (year - y0) / (y1 - y0);
  const d0 = populationByYear[y0], d1 = populationByYear[y1];
  const lerp = (a, b) => a + (b - a) * t;
  return {
    male: d0.male.map((v, i) => lerp(v, d1.male[i])),
    female: d0.female.map((v, i) => lerp(v, d1.female[i])),
    ageGroups: ageGroups
  };
}

function calcRiskEquivalent(rate, vol, maxDD, liqPenalty, behPremium) {
  return rate - 0.5 * vol * vol - 0.1 * maxDD - liqPenalty + behPremium;
}
function calcAssetEquiv(name) {
  const p = assetParams[name];
  const beh = p.beh > 0 ? state.behaviorPremium / 100 : 0;
  return calcRiskEquivalent(p.rate, p.vol, p.dd, p.liq, beh);
}
function pmt(fv, pv, n, r) {
  if (n <= 0) return 0;
  const futurePv = pv * Math.pow(1 + r, n);
  if (Math.abs(r) < 0.0001) return Math.max(0, (fv - futurePv) / n);
  return Math.max(0, (fv - futurePv) * r / (Math.pow(1 + r, n) - 1));
}
