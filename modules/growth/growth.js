// 规划面板（合并）：攒钱+花钱参数 / 终身组合图（余额+每年应存柱+每年支出柱）/ 支出构成
Dashboard.register('growth', (() => {
  let chart, breakdown;
  const controls = [
    {key:'currentAge', id:'currentAge', min:25, max:74, step:1, unit:' 岁'},
    {key:'targetAge', id:'targetAge', min:50, max:75, step:1, unit:' 岁'},
    {key:'currentAge', id:'spouseAge', group:'spouse', min:25, max:74, step:1, unit:' 岁'},
    {key:'targetAge', id:'spouseRetire', group:'spouse', min:50, max:75, step:1, unit:' 岁'},
    {key:'inflation', id:'inflation', min:0, max:8, step:0.1, unit:'%', isPct:true},
    {key:'returnRate', id:'returnRate', min:0, max:10, step:0.1, unit:'%', isPct:true},
    {key:'currentSavings', id:'currentSavings', min:0, max:500, step:1, unit:' 万'}
  ];
  const presets = {conservative:{returnRate:0.02,inflation:0.03}, balanced:{returnRate:0.04,inflation:0.025}, aggressive:{returnRate:0.06,inflation:0.025}};
  const pensionPresets = {none:0, resident:220, employee:3000, civil:5500};
  const spousePresets = {none:0, resident:220, employee:2500, civil:5500};
  // 滑块用的有序选项（key 对应 calc 里的 map，label/sub 用于显示）
  const lifestyleChoices = [
    {key:'basic', label:'基础生活', sub:'6万/年'}, {key:'normal', label:'普通生活', sub:'12万/年'},
    {key:'comfortable', label:'舒适养老', sub:'20万/年'}, {key:'premium', label:'品质养老', sub:'35万/年'},
    {key:'luxury', label:'奢侈养老', sub:'60万/年'}
  ];
  const careChoices = [
    {key:'self', label:'居家自理', sub:'0'}, {key:'daycare', label:'社区日托', sub:'4千/月'},
    {key:'homehelp', label:'居家护工', sub:'6千/月'}, {key:'normal', label:'普通养老院', sub:'8千/月'},
    {key:'mid', label:'中高端社区', sub:'2万/月'}, {key:'high', label:'高端护理院', sub:'3万/月'}
  ];
  const medicalChoices = [
    {key:'none', label:'无', sub:'0'}, {key:'low', label:'低', sub:'1万/年'},
    {key:'mid', label:'中', sub:'3万/年'}, {key:'high', label:'高', sub:'5万/年'},
    {key:'severe', label:'重', sub:'8万/年'}
  ];

  function setValue(c, val) {
    const obj = c.group ? state[c.group] : state;
    let v = Math.max(c.min, Math.min(c.max, val));
    const dec = (c.step + '').includes('.') ? (c.step + '').split('.')[1].length : 0;
    v = Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec);
    if (c.key === 'currentAge') v = Math.min(v, obj.targetAge);
    if (c.key === 'targetAge') { v = Math.max(v, obj.currentAge); if (obj.lifeExpectancy) v = Math.min(v, obj.lifeExpectancy - 5); }
    obj[c.key] = c.isPct ? v / 100 : v;
    Store.changed();
  }

  function bind(id, fn) { const el = document.getElementById(id); el.addEventListener('change', e => fn(e.target.value)); }

  function renderChart(s, j) {
    const cy = new Date().getFullYear();
    const acc = j.traj;
    const years = acc.map(t => String(cy + t.y));
    const balances = acc.map(t => +t.endBalance.toFixed(2));
    const depBars = acc.map(t => t.deposit > 0 ? +t.deposit.toFixed(2) : null);
    const livingBars = acc.map(t => t.y >= j.R_last ? +t.living.toFixed(2) : null);
    const medicalBars = acc.map(t => t.y >= j.R_last ? +t.medical.toFixed(2) : null);
    const careBars = acc.map(t => t.y >= j.R_last ? +t.care.toFixed(2) : null);
    const retireAYear = cy + (s.targetAge - s.currentAge);
    const retireBYear = cy + (s.spouse.targetAge - s.spouse.currentAge);
    const lastYear = years[years.length - 1];
    const lastLife = Math.max(s.lifeExpectancy, s.spouse.lifeExpectancy);
    const survAreas = [];
    let st = null;
    acc.forEach((t, i) => {
      const alone = t.numAlive === 1;
      if (alone && st === null) st = years[i];
      if ((!alone || i === acc.length - 1) && st !== null) { survAreas.push([{xAxis: st, itemStyle: {color: 'rgba(167,139,250,0.10)'}}, {xAxis: alone ? years[i] : years[i - 1]}]); st = null; }
    });
    chart.setOption({
      tooltip: {trigger: 'axis', formatter: function(p) {
        const yr = parseInt(p[0].name); const y = yr - cy;
        let html = yr + ' 年（本人 ' + (s.currentAge + y) + ' · 配偶 ' + (s.spouse.currentAge + y) + ' 岁）<br/>';
        p.forEach(x => { if (x.value != null) html += '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + x.color + ';margin-right:5px;"></span>' + x.seriesName + ': ' + fmtWan(x.value) + '<br/>'; });
        return html;
      }},
      legend: {data: ['账户余额', '每年应存', '生活支出', '医疗支出', '护理支出'], top: 0, textStyle: {color: '#cbd5e1', fontSize: 10}},
      grid: {left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true},
      xAxis: {type: 'category', boundaryGap: true, data: years, name: '年份', nameLocation: 'middle', nameGap: 28, axisLabel: {interval: 4}},
      yAxis: [
        {type: 'value', name: '余额(万)', axisLabel: {formatter: v => fmtNum(v, 0)}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
        {type: 'value', name: '年存/年支(万)', axisLabel: {formatter: v => fmtNum(v, 0)}, splitLine: {show: false}}
      ],
      series: [
        {name: '每年应存', type: 'bar', yAxisIndex: 1, data: depBars, itemStyle: {color: 'rgba(52,211,153,0.75)', borderRadius: [3,3,0,0]}},
        {name: '生活支出', type: 'bar', yAxisIndex: 1, stack: 'exp', data: livingBars, itemStyle: {color: '#60a5fa'}},
        {name: '医疗支出', type: 'bar', yAxisIndex: 1, stack: 'exp', data: medicalBars, itemStyle: {color: '#f472b6'}},
        {name: '护理支出', type: 'bar', yAxisIndex: 1, stack: 'exp', data: careBars, itemStyle: {color: '#fbbf24', borderRadius: [3,3,0,0]}},
        {name: '账户余额', type: 'line', yAxisIndex: 0, smooth: true, symbol: 'none', data: balances, lineStyle: {color: '#e94560', width: 3}, itemStyle: {color: '#e94560'}, areaStyle: {color: 'rgba(233,69,96,0.10)'},
          markLine: {silent: true, symbol: 'none', data: [
            {xAxis: String(retireAYear), lineStyle: {color: '#60a5fa', type: 'dashed'}, label: {formatter: '本人退休 ' + s.targetAge + '岁', color: '#60a5fa'}},
            {xAxis: String(retireBYear), lineStyle: {color: '#f472b6', type: 'dashed'}, label: {formatter: '配偶退休 ' + s.spouse.targetAge + '岁', color: '#f472b6'}},
            {xAxis: lastYear, lineStyle: {color: '#94a3b8', type: 'dotted'}, label: {formatter: '较晚去世 ' + lastLife + '岁', color: '#94a3b8'}},
            {yAxis: j.peakC, lineStyle: {color: '#34d399', type: 'dashed'}, label: {formatter: '所需储蓄 ' + fmtNum(j.peakC, 0) + '万', color: '#34d399'}}
          ]},
          markArea: {silent: true, label: {color: '#a78bfa', fontSize: 10, formatter: '丧偶期'}, data: survAreas}}
      ]
    }, true);
  }

  function renderBreakdown(s, j) {
    const dd = j.traj.filter(t => t.y >= j.R_last);
    const infl = s.inflation, yt = j.R_last;
    let totalOut = 0, totalIn = 0, totalOutReal = 0;
    dd.forEach(t => { totalOut += t.outflow; totalIn += t.income; totalOutReal += t.outflow / Math.pow(1 + infl, t.y); });
    const n = dd.length || 1;
    document.getElementById('avgExpense').textContent = fmtWan(totalOut / n);
    document.getElementById('avgExpenseReal').textContent = fmtWan(totalOutReal / n);
    document.getElementById('pensionCoverage').textContent = (totalOut > 0 ? totalIn / totalOut * 100 : 0).toFixed(0) + '%';
    document.getElementById('pensionAnnual').textContent = fmtWan(totalIn / n) + '/年';
    document.getElementById('totalExpense').textContent = fmtWan(totalOut);
    document.getElementById('totalExpenseReal').textContent = fmtWan(totalOutReal);
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
      yAxis: {type: 'value', name: '年均(万)', axisLabel: {formatter: v => fmtNum(v, 0)}},
      series: [
        {name: '生活支出', type: 'bar', stack: 't', data: avgBase, itemStyle: {color: '#60a5fa', borderRadius: [4,4,0,0]}},
        {name: '医疗自付', type: 'bar', stack: 't', data: avgMedical, itemStyle: {color: '#f472b6'}},
        {name: '护理支出', type: 'bar', stack: 't', data: avgCare, itemStyle: {color: '#fbbf24'}}
      ]
    }, true);
  }

  function renderNominals(s) {
    const cy = new Date().getFullYear();
    const nA = Math.max(0, s.targetAge - s.currentAge);
    const nB = Math.max(0, s.spouse.targetAge - s.spouse.currentAge);
    const inflF = Math.pow(1 + s.inflation, nA);
    const medFA = Math.pow(1 + s.medicalInflation, nA);
    const retireAYear = cy + nA, retireBYear = cy + nB;
    document.getElementById('lifestyleRetireYear').textContent = retireAYear;
    document.getElementById('lifestyleRetireNominal').textContent = fmtWan(lifestyleOptions[s.lifestyle] * inflF);
    document.getElementById('pensionRetireYear').textContent = retireAYear;
    document.getElementById('pensionRetireNominal').textContent = Math.round(s.pensionMonthly * inflF).toLocaleString('zh-CN') + ' 元';
    document.getElementById('spousePensionRetireYear').textContent = retireBYear;
    document.getElementById('spousePensionRetireNominal').textContent = Math.round(s.spouse.pensionMonthly * Math.pow(1 + s.inflation, nB)).toLocaleString('zh-CN') + ' 元';
    document.getElementById('medicalRetireYear').textContent = retireAYear;
    const crit = medicalOptions[s.medicalScenario];
    document.getElementById('medicalRetireNominal').textContent = crit > 0 ? fmtWan(crit * medFA) : '—';
    // 护理：按较年长者进入护理期(≈83岁)那年算
    const olderAge = Math.max(s.currentAge, s.spouse.currentAge);
    const yearsToCare = Math.max(0, 83 - olderAge);
    document.getElementById('careRetireYear').textContent = cy + yearsToCare;
    document.getElementById('careRetireNominal').textContent = fmtWan(careOptions[s.careType] * Math.pow(1 + s.medicalInflation, yearsToCare));
  }

  return {
    init(root) {
      chart = echarts.init(root.querySelector('#growthChart'), 'dashboard');
      breakdown = echarts.init(root.querySelector('#breakdownChart'), 'dashboard');
      controls.forEach(c => {
        const slider = root.querySelector('#' + c.id + 'Slider');
        const input = root.querySelector('#' + c.id + 'Input');
        if (!slider || !input) return;
        slider.min = c.min; slider.max = c.max; slider.step = c.step;
        input.min = c.min; input.max = c.max; input.step = c.step;
        slider.addEventListener('input', () => setValue(c, parseFloat(slider.value)));
        input.addEventListener('change', () => setValue(c, parseFloat(input.value)));
      });
      root.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => { Object.assign(state, presets[btn.dataset.preset]); Store.changed(); }));

      const lifeSlider = root.querySelector('#lifeExpectancySlider');
      lifeSlider.min = 75; lifeSlider.max = 105; lifeSlider.step = 1;
      lifeSlider.addEventListener('input', () => { state.lifeExpectancy = Math.max(state.targetAge + 5, parseInt(lifeSlider.value)); Store.changed(); });
      const spouseLifeSlider = root.querySelector('#spouseLifeSlider');
      spouseLifeSlider.min = 75; spouseLifeSlider.max = 105; spouseLifeSlider.step = 1;
      spouseLifeSlider.addEventListener('input', () => { state.spouse.lifeExpectancy = Math.max(state.spouse.targetAge + 5, parseInt(spouseLifeSlider.value)); Store.changed(); });

      const bindSel = (id, fn) => root.querySelector('#' + id).addEventListener('change', e => fn(e.target.value));
      // 生活/护理/重大医疗 改为滑块
      const bindChoiceSlider = (id, choices, key) => {
        const sl = root.querySelector('#' + id);
        sl.min = 0; sl.max = choices.length - 1; sl.step = 1;
        sl.addEventListener('input', () => { state[key] = choices[parseInt(sl.value)].key; Store.changed(); });
      };
      bindChoiceSlider('lifestyleSlider', lifestyleChoices, 'lifestyle');
      bindChoiceSlider('careSlider', careChoices, 'careType');
      bindChoiceSlider('medicalSlider', medicalChoices, 'medicalScenario');
      bindSel('pensionTypeSelect', v => { state.pensionType = v; state.pensionMonthly = pensionPresets[v]; Store.changed(); });
      root.querySelector('#pensionInput').addEventListener('change', e => { state.pensionMonthly = Math.max(0, parseFloat(e.target.value) || 0); Store.changed(); });
      bindSel('spousePensionSelect', v => { state.spouse.pensionType = v; state.spouse.pensionMonthly = spousePresets[v]; Store.changed(); });
      root.querySelector('#spousePensionInput').addEventListener('change', e => { state.spouse.pensionMonthly = Math.max(0, parseFloat(e.target.value) || 0); Store.changed(); });
      bindSel('insuranceSelect', v => { state.insuranceRate = parseFloat(v); Store.changed(); });
      bindSel('medicalInflationSelect', v => { state.medicalInflation = parseFloat(v); Store.changed(); });
      const surv = root.querySelector('#survivorSlider');
      surv.addEventListener('input', () => { state.survivorFactor = parseInt(surv.value) / 100; Store.changed(); });
      const bindPM = (id, key) => root.querySelector('#' + id).addEventListener('change', e => { state.phaseMul[key] = Math.max(0, parseFloat(e.target.value) || 0); Store.changed(); });
      bindPM('phaseMulActive', 'active'); bindPM('phaseMulDecline', 'decline'); bindPM('phaseMulCare', 'care');
    },

    update(s, root) {
      controls.forEach(c => {
        const obj = c.group ? s[c.group] : s;
        const slider = root.querySelector('#' + c.id + 'Slider');
        const input = root.querySelector('#' + c.id + 'Input');
        const span = root.querySelector('#' + c.id + 'Value');
        let v = obj[c.key]; if (c.isPct) v = v * 100;
        if (slider) slider.value = v; if (input) input.value = v;
        if (span) span.textContent = (c.isPct ? v.toFixed(1) : fmtNum(v, 0)) + c.unit;
      });
      root.querySelector('#lifeExpectancySlider').value = s.lifeExpectancy;
      root.querySelector('#lifeExpectancyValue').textContent = s.lifeExpectancy + ' 岁';
      root.querySelector('#spouseLifeSlider').value = s.spouse.lifeExpectancy;
      root.querySelector('#spouseLifeValue').textContent = s.spouse.lifeExpectancy + ' 岁';
      root.querySelector('#survivorSlider').value = Math.round(s.survivorFactor * 100);
      root.querySelector('#survivorValue').textContent = Math.round(s.survivorFactor * 100) + '%';
      root.querySelector('#phaseMulActive').value = s.phaseMul.active;
      root.querySelector('#phaseMulDecline').value = s.phaseMul.decline;
      root.querySelector('#phaseMulCare').value = s.phaseMul.care;
      // 生活/护理/重大医疗 滑块同步 + 当前档位标签
      const syncChoice = (id, choices, key, labelId) => {
        const idx = Math.max(0, choices.findIndex(c => c.key === s[key]));
        const sl = root.querySelector('#' + id); if (sl) sl.value = idx;
        const c = choices[idx];
        const lab = root.querySelector('#' + labelId); if (lab) lab.textContent = c.label + ' (' + c.sub + ')';
      };
      syncChoice('lifestyleSlider', lifestyleChoices, 'lifestyle', 'lifestyleLabel');
      syncChoice('careSlider', careChoices, 'careType', 'careLabel');
      syncChoice('medicalSlider', medicalChoices, 'medicalScenario', 'medicalLabel');
      // 其余下拉
      const sels = ['pensionTypeSelect','spousePensionSelect','insuranceSelect','medicalInflationSelect'];
      const vals = [s.pensionType, s.spouse.pensionType, s.insuranceRate, s.medicalInflation];
      sels.forEach((id, i) => root.querySelector('#' + id).value = vals[i]);
      root.querySelector('#pensionInput').value = s.pensionMonthly;
      root.querySelector('#spousePensionInput').value = s.spouse.pensionMonthly;

      // 通胀/收益率提示
      const cpiAvg = cpiData.filter(d => !d.forecast).slice(-10).reduce((a, d) => a + d.cpi, 0) / 10;
      root.querySelector('#inflationHint').textContent = '近10年CPI均' + cpiAvg.toFixed(1) + '%，保守取3%';
      const rr = s.returnRate;
      root.querySelector('#returnRateHint').textContent = '当前 ' + (rr < 0.03 ? '偏保守(类定存/国债)' : rr < 0.05 ? '稳健(固收+)' : rr < 0.08 ? '较积极(含权益)' : '激进(高权益)');

      const j = coupleSolve(s);
      root.querySelector('#growthDepositReadout').textContent = Math.round(j.deposit.realMonthly * 10000).toLocaleString('zh-CN') + ' 元/月（购买力恒定）';
      renderChart(s, j);
      renderBreakdown(s, j);
      renderNominals(s);
    },

    resize() { chart && chart.resize(); breakdown && breakdown.resize(); }
  };
})());
