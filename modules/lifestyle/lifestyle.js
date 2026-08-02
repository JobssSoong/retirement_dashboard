// 花钱期（退休模拟器）：按所需储蓄额 C 支取，展示退休期支出结构与养老金覆盖
Dashboard.register('lifestyle', (() => {
  let chart, breakdown;
  const pensionPresets = {none:0, resident:220, employee:3000, civil:5500};

  function renderLifestyleCouple(s, root, chart, breakdown) {
    const j = coupleSolve(s);
    const dd = j.traj.filter(t => t.y >= j.R_first);
    const dep = j.deposit;
    const n = dd.length || 1;
    const infl = s.inflation;
    let totalOut = 0, totalIn = 0, totalOutReal = 0;
    dd.forEach(t => { totalOut += t.outflow; totalIn += t.income; totalOutReal += t.outflow / Math.pow(1 + infl, t.y); });

    root.querySelector('#avgExpense').textContent = fmtWan(totalOut / n);
    root.querySelector('#avgExpenseReal').textContent = fmtWan(totalOutReal / n);
    root.querySelector('#pensionCoverage').textContent = (totalOut > 0 ? totalIn / totalOut * 100 : 0).toFixed(0) + '%';
    root.querySelector('#pensionAnnual').textContent = fmtWan(totalIn / n) + '/年';
    root.querySelector('#totalExpense').textContent = fmtWan(totalOut);
    root.querySelector('#totalExpenseReal').textContent = fmtWan(totalOutReal);

    const laterDeath = Math.max(s.lifeExpectancy, s.spouse.lifeExpectancy);
    const riskEl = root.querySelector('#riskBar');
    riskEl.className = 'w-full h-10 rounded-lg flex items-center justify-center text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30';
    riskEl.textContent = '按每月存 ' + Math.round(dep.realMonthly * 10000).toLocaleString('zh-CN') + ' 元，家庭资金可支撑至较晚去世者 ' + laterDeath + ' 岁';

    // 余额曲线（左轴）+ 当年支出（右轴柱，丧偶期变色）+ 丧偶期标记
    const ages = dd.map(t => (s.currentAge + t.y) + '岁');
    const balances = dd.map(t => +t.endBalance.toFixed(2));
    const expenses = dd.map(t => ({value: +t.outflow.toFixed(2), itemStyle: {color: t.numAlive === 1 ? '#a78bfa' : 'rgba(96,165,250,0.55)'}}));
    // 丧偶期区段
    const survAreas = [];
    let st = null;
    dd.forEach((t, i) => {
      const alone = t.numAlive === 1;
      if (alone && st === null) st = t.y;
      if ((!alone || i === dd.length - 1) && st !== null) {
        const en = alone ? t.y : dd[i - 1].y;
        survAreas.push([{xAxis: (s.currentAge + st) + '岁', itemStyle: {color: 'rgba(167,139,250,0.12)'}}, {xAxis: (s.currentAge + en) + '岁'}]);
        st = null;
      }
    });
    chart.setOption({
      tooltip: {trigger: 'axis', formatter: p => p[0].name + '<br/>' + p.map(x => '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + x.color + ';margin-right:5px;"></span>' + x.seriesName + ': ' + fmtWan(x.value)).join('<br/>')},
      legend: {data: ['账户余额', '当年支出'], top: 0, textStyle: {color: '#cbd5e1', fontSize: 10}},
      grid: {left: '3%', right: '4%', bottom: '3%', top: '14%', containLabel: true},
      xAxis: {type: 'category', data: ages, axisLabel: {interval: 4}},
      yAxis: [
        {type: 'value', name: '余额(万)', axisLabel: {formatter: v => fmtNum(v, 0)}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
        {type: 'value', name: '支出(万)', axisLabel: {formatter: v => fmtNum(v, 0)}, splitLine: {show: false}}
      ],
      series: [
        {name: '账户余额', type: 'line', yAxisIndex: 0, smooth: true, symbol: 'none', data: balances, lineStyle: {color: '#e94560', width: 3}, itemStyle: {color: '#e94560'}, areaStyle: {color: 'rgba(233,69,96,0.15)'},
          markLine: {silent: true, symbol: 'none', data: [{xAxis: laterDeath + '岁', lineStyle: {color: '#94a3b8', type: 'dashed'}, label: {formatter: '较晚去世 ' + laterDeath + '岁', color: '#94a3b8'}}]},
          markArea: {silent: true, itemStyle: {color: 'rgba(167,139,250,0.08)'}, label: {color: '#a78bfa', fontSize: 10, formatter: '丧偶期'}, data: survAreas}},
        {name: '当年支出', type: 'bar', yAxisIndex: 1, data: expenses, barWidth: '60%'}
      ]
    }, true);

    // 三阶段支出构成（按较年长者在世者年龄分组）
    const cats = RETIREMENT_PHASES.map(p => p.name);
    const avgBase = [], avgMedical = [], avgCare = [];
    RETIREMENT_PHASES.forEach(ph => {
      const rows = dd.filter(t => phaseOfAge(Math.max(t.aAlive ? t.aAge : 0, t.bAlive ? t.bAge : 0)) === ph);
      const m = rows.length || 1;
      avgBase.push(rows.reduce((a, t) => a + t.living, 0) / m);
      avgMedical.push(rows.reduce((a, t) => a + t.medical, 0) / m);
      avgCare.push(rows.reduce((a, t) => a + t.care, 0) / m);
    });
    breakdown.setOption({
      tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}, formatter: p => p[0].name + '<br/>' + p.map(x => x.seriesName + ': ' + fmtWan(x.value)).join('<br/>')},
      legend: {data: ['生活支出', '医疗自付', '护理支出'], top: 0, textStyle: {color: '#cbd5e1', fontSize: 10}},
      grid: {left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true},
      xAxis: {type: 'category', data: cats},
      yAxis: {type: 'value', name: '年均（万元）', axisLabel: {formatter: v => fmtNum(v, 0)}},
      series: [
        {name: '生活支出', type: 'bar', stack: 't', data: avgBase, itemStyle: {color: '#60a5fa', borderRadius: [4,4,0,0]}},
        {name: '医疗自付', type: 'bar', stack: 't', data: avgMedical, itemStyle: {color: '#f472b6'}},
        {name: '护理支出', type: 'bar', stack: 't', data: avgCare, itemStyle: {color: '#fbbf24'}}
      ]
    }, true);
  }

  function bind(root, id, handler) {
    const el = root.querySelector('#' + id);
    el.addEventListener('change', e => handler(e.target.value));
  }
  const spousePresets = {none:0, resident:220, employee:2500, civil:5500};

  return {
    init(root) {
      chart = echarts.init(root.querySelector('#lifestyleChart'), 'dashboard');
      breakdown = echarts.init(root.querySelector('#lifestyleBreakdown'), 'dashboard');

      bind(root, 'lifestyleSelect', v => { state.lifestyle = v; Store.changed(); });
      bind(root, 'careSelect', v => { state.careType = v; Store.changed(); });
      bind(root, 'medicalSelect', v => { state.medicalScenario = v; Store.changed(); });
      bind(root, 'insuranceSelect', v => { state.insuranceRate = parseFloat(v); Store.changed(); });
      bind(root, 'medicalInflationSelect', v => { state.medicalInflation = parseFloat(v); Store.changed(); });
      bind(root, 'pensionTypeSelect', v => {
        state.pensionType = v;
        state.pensionMonthly = pensionPresets[v];
        Store.changed();
      });
      const pensionInput = root.querySelector('#pensionInput');
      pensionInput.addEventListener('change', () => { state.pensionMonthly = Math.max(0, parseFloat(pensionInput.value) || 0); Store.changed(); });

      const lifeSlider = root.querySelector('#lifeExpectancySlider');
      lifeSlider.min = 75; lifeSlider.max = 105; lifeSlider.step = 1;
      lifeSlider.addEventListener('input', () => { state.lifeExpectancy = parseInt(lifeSlider.value); Store.changed(); });

      bind(root, 'spousePensionSelect', v => { state.spouse.pensionType = v; state.spouse.pensionMonthly = spousePresets[v]; Store.changed(); });
      const spousePensionInput = root.querySelector('#spousePensionInput');
      spousePensionInput.addEventListener('change', () => { state.spouse.pensionMonthly = Math.max(0, parseFloat(spousePensionInput.value) || 0); Store.changed(); });
      const spouseLifeSlider = root.querySelector('#spouseLifeSlider');
      spouseLifeSlider.min = 75; spouseLifeSlider.max = 105; spouseLifeSlider.step = 1;
      spouseLifeSlider.addEventListener('input', () => { state.spouse.lifeExpectancy = parseInt(spouseLifeSlider.value); Store.changed(); });
      const survSlider = root.querySelector('#survivorSlider');
      survSlider.addEventListener('input', () => { state.survivorFactor = parseInt(survSlider.value) / 100; Store.changed(); });

      const bindPhaseMul = (id, key) => {
        const el = root.querySelector('#' + id);
        el.addEventListener('change', () => { state.phaseMul[key] = Math.max(0, parseFloat(el.value) || 0); Store.changed(); });
      };
      bindPhaseMul('phaseMulActive', 'active');
      bindPhaseMul('phaseMulDecline', 'decline');
      bindPhaseMul('phaseMulCare', 'care');
    },

    update(s, root) {
      // 同步本人控件
      root.querySelector('#lifestyleSelect').value = s.lifestyle;
      const lifeRetireNominal = lifestyleOptions[s.lifestyle] * Math.pow(1 + s.inflation, yearsToRetire(s));
      root.querySelector('#lifestyleRetireNominal').textContent = fmtWan(lifeRetireNominal);
      // 各未来金额的「退休时账面」小字（购买力输入 → 按通胀/医疗通胀推算）
      const nA = yearsToRetire(s);
      const nB = Math.max(0, s.spouse.targetAge - s.spouse.currentAge);
      const inflF = Math.pow(1 + s.inflation, nA);
      const medF = Math.pow(1 + s.medicalInflation, nA);
      root.querySelector('#pensionRetireNominal').textContent = Math.round(s.pensionMonthly * inflF).toLocaleString('zh-CN') + ' 元';
      root.querySelector('#spousePensionRetireNominal').textContent = Math.round(s.spouse.pensionMonthly * Math.pow(1 + s.inflation, nB)).toLocaleString('zh-CN') + ' 元';
      root.querySelector('#careRetireNominal').textContent = fmtWan(careOptions[s.careType] * medF);
      const medOpt = medicalOptions[s.medicalScenario];
      root.querySelector('#medicalRetireNominal').textContent = medOpt.base > 0 ? fmtWan(medOpt.base * medF) : '—';
      root.querySelector('#careSelect').value = s.careType;
      root.querySelector('#medicalSelect').value = s.medicalScenario;
      root.querySelector('#pensionTypeSelect').value = s.pensionType;
      root.querySelector('#pensionInput').value = s.pensionMonthly;
      root.querySelector('#insuranceSelect').value = s.insuranceRate;
      root.querySelector('#medicalInflationSelect').value = s.medicalInflation;
      root.querySelector('#lifeExpectancySlider').value = s.lifeExpectancy;
      root.querySelector('#lifeExpectancyValue').textContent = s.lifeExpectancy + ' 岁';
      // 同步配偶控件
      root.querySelector('#spousePensionSelect').value = s.spouse.pensionType;
      root.querySelector('#spousePensionInput').value = s.spouse.pensionMonthly;
      root.querySelector('#spouseLifeSlider').value = s.spouse.lifeExpectancy;
      root.querySelector('#spouseLifeValue').textContent = s.spouse.lifeExpectancy + ' 岁';
      root.querySelector('#survivorSlider').value = Math.round(s.survivorFactor * 100);
      root.querySelector('#survivorValue').textContent = Math.round(s.survivorFactor * 100) + '%';
      root.querySelector('#phaseMulActive').value = s.phaseMul.active;
      root.querySelector('#phaseMulDecline').value = s.phaseMul.decline;
      root.querySelector('#phaseMulCare').value = s.phaseMul.care;

      renderLifestyleCouple(s, root, chart, breakdown);
    },

    resize() { chart && chart.resize(); breakdown && breakdown.resize(); }
  };
})());
