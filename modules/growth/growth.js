// 攒钱期：年龄/收益率/通胀/已存 等输入；累积增长曲线落到「所需储蓄额」
Dashboard.register('growth', (() => {
  const controls = [
    {key: 'startAge', min: 25, max: 60, step: 1, unit: ' 岁'},
    {key: 'targetAge', min: 55, max: 75, step: 1, unit: ' 岁'},
    {key: 'currentAge', min: 25, max: 74, step: 1, unit: ' 岁'},
    {key: 'inflation', min: 0, max: 8, step: 0.1, unit: '%', isPct: true},
    {key: 'returnRate', min: 0, max: 10, step: 0.1, unit: '%', isPct: true},
    {key: 'currentSavings', min: 0, max: 500, step: 1, unit: ' 万'}
  ];
  const presets = {
    conservative: {returnRate: 0.02, inflation: 0.03},
    balanced:     {returnRate: 0.04, inflation: 0.025},
    aggressive:   {returnRate: 0.06, inflation: 0.025}
  };
  let chart;

  function renderGrowthCouple(s, chart) {
    const j = coupleSolve(s);
    const acc = j.traj.filter(t => t.y <= j.R_last);
    const ages = acc.map(t => (s.currentAge + t.y) + '岁');
    const balances = acc.map(t => +t.endBalance.toFixed(2));
    chart.setOption({
      tooltip: {trigger: 'axis', formatter: p => p[0].name + '<br/>家庭账户余额: ' + fmtWan(p[0].value)},
      grid: {left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true},
      xAxis: {type: 'category', boundaryGap: false, data: ages, axisLabel: {interval: 4}},
      yAxis: {type: 'value', name: '余额(万元·账面)', axisLabel: {formatter: v => fmtNum(v, 0)}},
      series: [{
        name: '家庭账户余额', type: 'line', smooth: true, symbol: 'none', data: balances,
        lineStyle: {color: '#e94560', width: 3}, itemStyle: {color: '#e94560'}, areaStyle: {color: 'rgba(233,69,96,0.15)'},
        markLine: {silent: true, symbol: 'none', data: [
          {xAxis: (s.currentAge + j.R_first) + '岁', lineStyle: {color: '#60a5fa', type: 'dashed'}, label: {formatter: '首人退休', color: '#60a5fa'}},
          {xAxis: (s.currentAge + j.R_last) + '岁', lineStyle: {color: '#fbbf24', type: 'dashed'}, label: {formatter: '两人均退休', color: '#fbbf24'}},
          {yAxis: j.peakC, lineStyle: {color: '#34d399', type: 'dashed'}, label: {formatter: '所需储蓄 ' + fmtNum(j.peakC, 0) + '万', color: '#34d399'}}
        ]}
      }]
    }, true);
  }

  function setValue(key, v) {
    const c = controls.find(x => x.key === key);
    v = Math.max(c.min, Math.min(c.max, v));
    const dec = (c.step + '').includes('.') ? (c.step + '').split('.')[1].length : 0;
    v = Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec);
    state[key] = v;
    if (key === 'startAge' && state.currentAge < state.startAge) state.currentAge = state.startAge;
    if (key === 'targetAge') {
      if (state.currentAge >= state.targetAge) state.currentAge = Math.max(state.startAge, state.targetAge - 1);
    }
    if (key === 'currentAge') state.currentAge = Math.max(state.startAge, Math.min(state.currentAge, state.targetAge - 1));
    Store.changed();
  }

  return {
    init(root) {
      chart = echarts.init(root.querySelector('#growthChart'), 'dashboard');
      controls.forEach(c => {
        const slider = root.querySelector('#' + c.key + 'Slider');
        const input = root.querySelector('#' + c.key + 'Input');
        if (!slider || !input) return;
        slider.min = c.min; slider.max = c.max; slider.step = c.step;
        input.min = c.min; input.max = c.max; input.step = c.step;
        slider.addEventListener('input', () => setValue(c.key, c.isPct ? parseFloat(slider.value) / 100 : parseFloat(slider.value)));
        input.addEventListener('change', () => setValue(c.key, c.isPct ? parseFloat(input.value) / 100 : parseFloat(input.value)));
      });
      root.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          Object.assign(state, presets[btn.dataset.preset]);
          Store.changed();
        });
      });
    },

    update(s, root) {
      controls.forEach(c => {
        const slider = root.querySelector('#' + c.key + 'Slider');
        const input = root.querySelector('#' + c.key + 'Input');
        const span = root.querySelector('#' + c.key + 'Value');
        let v = s[c.key];
        if (c.isPct) v = v * 100;
        if (slider) slider.value = v;
        if (input) input.value = v;
        if (span) span.textContent = (c.isPct ? v.toFixed(1) : fmtNum(v, 0)) + c.unit;
      });

      // 倒推：所需储蓄额 + 每月需存
      const C = requiredRetirementCorpus(s);
      const dep = requiredMonthlyDeposit(s, C.nominal);
      root.querySelector('#growthDepositReadout').textContent = Math.round(dep.realMonthly * 10000).toLocaleString('zh-CN') + ' 元/月（购买力恒定）';

      if (s.mode === 'couple') { renderGrowthCouple(s, chart); return; }

      // 累积路径用反解出的年存额 A，使曲线恰好落到 C
      const A = dep.realAnnual;
      const basePath = calculateRetirementPath(s.startAge, s.targetAge, A, s.currentSavings, s.returnRate, s.inflation);
      const conPath = calculateRetirementPath(s.startAge, s.targetAge, A, s.currentSavings, Math.max(0, s.returnRate - 0.01), s.inflation);
      const optPath = calculateRetirementPath(s.startAge, s.targetAge, A, s.currentSavings, Math.min(0.10, s.returnRate + 0.01), s.inflation);
      const ages = basePath.map(d => d.age + '岁');
      const principal = basePath.map(d => d.cumulative);
      const returns = basePath.map((d, i) => Math.max(0, d.nominal - d.cumulative));
      chart.setOption({
        tooltip: {trigger: 'axis', axisPointer: {type: 'cross'}, formatter: function(params) {
          let html = params[0].name + '<br/>';
          params.forEach(p => { if (p.value !== undefined && p.value !== null && p.value !== '-') html += '<span style=\'display:inline-block;width:10px;height:10px;border-radius:50%;background:' + p.color + ';margin-right:5px;\'></span>' + p.seriesName + ': ' + fmtWan(p.value) + '<br/>'; });
          return html;
        }},
        legend: {data: ['保守', '基准', '乐观', '累计存入', '投资收益'], top: 0, textStyle: {color: '#cbd5e1'}},
        grid: {left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true},
        xAxis: {type: 'category', boundaryGap: false, data: ages, axisLabel: {interval: 4}},
        yAxis: {type: 'value', name: '余额（万元·账面）', axisLabel: {formatter: v => fmtNum(v, 0)}},
        series: [
          {name: '累计存入', type: 'line', stack: 'total', areaStyle: {color: 'rgba(52,211,153,0.25)'}, lineStyle: {width: 0}, data: principal, symbol: 'none'},
          {name: '投资收益', type: 'line', stack: 'total', areaStyle: {color: 'rgba(233,69,96,0.25)'}, lineStyle: {width: 0}, data: returns, symbol: 'none'},
          {name: '保守', type: 'line', data: conPath.map(d => d.nominal), lineStyle: {color: '#60a5fa', width: 2}, itemStyle: {color: '#60a5fa'}, smooth: true, symbol: 'none'},
          {name: '基准', type: 'line', data: basePath.map(d => d.nominal), lineStyle: {color: '#e94560', width: 3}, itemStyle: {color: '#e94560'}, smooth: true, symbol: 'none', markLine: {silent: true, symbol: 'none', data: [{xAxis: s.targetAge + '岁', lineStyle: {color: '#fbbf24', type: 'dashed'}, label: {formatter: '退休日', color: '#fbbf24'}}, {yAxis: C.nominal, lineStyle: {color: '#34d399', type: 'dashed'}, label: {formatter: '所需储蓄 ' + fmtNum(C.nominal, 0) + '万', color: '#34d399'}}]}},
          {name: '乐观', type: 'line', data: optPath.map(d => d.nominal), lineStyle: {color: '#a78bfa', width: 2}, itemStyle: {color: '#a78bfa'}, smooth: true, symbol: 'none'}
        ]
      }, true);
    },

    resize() { chart && chart.resize(); }
  };
})());
