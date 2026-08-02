// 攒钱期：本人/配偶年龄 + 共享参数；家庭累积曲线（始终夫妻模式）
Dashboard.register('growth', (() => {
  const controls = [
    {key:'currentAge', id:'currentAge', min:25, max:74, step:1, unit:' 岁'},
    {key:'targetAge', id:'targetAge', min:55, max:75, step:1, unit:' 岁'},
    {key:'currentAge', id:'spouseAge', group:'spouse', min:25, max:74, step:1, unit:' 岁'},
    {key:'targetAge', id:'spouseRetire', group:'spouse', min:55, max:75, step:1, unit:' 岁'},
    {key:'inflation', id:'inflation', min:0, max:8, step:0.1, unit:'%', isPct:true},
    {key:'returnRate', id:'returnRate', min:0, max:10, step:0.1, unit:'%', isPct:true},
    {key:'currentSavings', id:'currentSavings', min:0, max:500, step:1, unit:' 万'}
  ];
  const presets = {
    conservative: {returnRate: 0.02, inflation: 0.03},
    balanced:     {returnRate: 0.04, inflation: 0.025},
    aggressive:   {returnRate: 0.06, inflation: 0.025}
  };
  let chart;

  function setValue(c, val) {
    const obj = c.group ? state[c.group] : state;
    // clamp / round 都在滑块的原始量纲（百分比 isPct 时为 % 值）里做，最后再换算
    let v = Math.max(c.min, Math.min(c.max, val));
    const dec = (c.step + '').includes('.') ? (c.step + '').split('.')[1].length : 0;
    v = Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec);
    // 保持当前年龄 ≤ 退休年龄
    if (c.key === 'currentAge' && obj.targetAge !== undefined) v = Math.min(v, obj.targetAge);
    if (c.key === 'targetAge' && obj.currentAge !== undefined) v = Math.max(v, obj.currentAge);
    obj[c.key] = c.isPct ? v / 100 : v;
    Store.changed();
  }

  function renderChart(s, j) {
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

  return {
    init(root) {
      chart = echarts.init(root.querySelector('#growthChart'), 'dashboard');
      controls.forEach(c => {
        const slider = root.querySelector('#' + c.id + 'Slider');
        const input = root.querySelector('#' + c.id + 'Input');
        if (!slider || !input) return;
        slider.min = c.min; slider.max = c.max; slider.step = c.step;
        input.min = c.min; input.max = c.max; input.step = c.step;
        slider.addEventListener('input', () => setValue(c, parseFloat(slider.value)));
        input.addEventListener('change', () => setValue(c, parseFloat(input.value)));
      });
      root.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => { Object.assign(state, presets[btn.dataset.preset]); Store.changed(); });
      });
    },

    update(s, root) {
      controls.forEach(c => {
        const obj = c.group ? s[c.group] : s;
        const slider = root.querySelector('#' + c.id + 'Slider');
        const input = root.querySelector('#' + c.id + 'Input');
        const span = root.querySelector('#' + c.id + 'Value');
        let v = obj[c.key];
        if (c.isPct) v = v * 100;
        if (slider) slider.value = v;
        if (input) input.value = v;
        if (span) span.textContent = (c.isPct ? v.toFixed(1) : fmtNum(v, 0)) + c.unit;
      });
      const j = coupleSolve(s);
      root.querySelector('#growthDepositReadout').textContent = Math.round(j.deposit.realMonthly * 10000).toLocaleString('zh-CN') + ' 元/月（购买力恒定）';
      renderChart(s, j);

      // 通胀率提示：近10年CPI均值参考
      const cpiAvg = cpiData.slice(-10).reduce((a, d) => a + d.cpi, 0) / Math.min(10, cpiData.length);
      root.querySelector('#inflationHint').textContent = '参考：近10年 CPI 年均约 ' + cpiAvg.toFixed(1) + '%；长期保守可取 3%';
      // 收益率提示：偏保守/稳健/激进
      const rr = s.returnRate;
      const rrLabel = rr < 0.03 ? '偏保守（类定存/国债，跑不赢通胀）'
        : rr < 0.05 ? '稳健（固收+/理财）'
        : rr < 0.08 ? '较积极（含权益/红利）'
        : '激进（高权益，波动大）';
      root.querySelector('#returnRateHint').textContent = '当前 ' + rrLabel + '；实际能否长期达到存在不确定性';
    },

    resize() { chart && chart.resize(); }
  };
})());
