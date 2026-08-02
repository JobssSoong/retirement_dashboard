// 人口结构金字塔：年份滑块 + 播放。年份变化只局部重绘（不触发全局重算）
Dashboard.register('pyramid', (() => {
  let chart;
  let playInterval = null;
  let rootEl;

  function stopPlay() {
    if (playInterval) { clearInterval(playInterval); playInterval = null; rootEl.querySelector('#playPyramidBtn').textContent = '播放'; }
  }

  // 局部刷新（仅本图），避免拖动滑块时连带重算热力图/资产等
  function refresh() {
    saveState();
    update(state, rootEl);
  }

  function update(s, root) {
    root.querySelector('#pyramidYearSlider').value = s.pyramidYear;
    root.querySelector('#pyramidYearValue').textContent = s.pyramidYear;

    const pop = getPopulation(s.pyramidYear);
    const maleData = pop.male.map(v => -v);
    const femaleData = pop.female;

    // x 轴对称固定范围，使 0（中线）稳定居中，不随数据跳动
    const maxVal = Math.max.apply(null, pop.male.concat(pop.female).map(Math.abs));
    const bound = maxVal * 1.08;

    // 本人 + 配偶 在所选年份的年龄，各画一条标记线
    const currentYear = new Date().getFullYear();
    const offset = s.pyramidYear - currentYear;
    const clamp = (a, b, x) => Math.max(a, Math.min(b, x));
    const bandIdx = age => clamp(0, ageGroups.length - 1, Math.floor(age / 5));
    const marks = [];
    const addAgeMark = (age, label, color) => {
      if (age >= 0 && age < 105) marks.push({yAxis: ageGroups[bandIdx(age)], lineStyle: {color, type: 'dashed', width: 2}, label: {formatter: label + ' ' + age + '岁', color, position: 'insideStartTop'}});
    };
    addAgeMark(Math.round(s.currentAge + offset), '本人', '#fbbf24');
    addAgeMark(Math.round(s.spouse.currentAge + offset), '配偶', '#22d3ee');
    const ageMark = marks.length ? {silent: true, symbol: 'none', data: marks} : undefined;

    chart.setOption({
      animation: false,
      tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}, formatter: function(params) {
        const m = Math.abs(params[0].value);
        const f = params[1].value;
        return params[0].name + '<br/>男性: ' + fmtNum(m, 0) + ' 万人<br/>女性: ' + fmtNum(f, 0) + ' 万人<br/>合计: ' + fmtNum(m + f, 0) + ' 万人';
      }},
      legend: {data: ['男性', '女性'], top: 0, textStyle: {color: '#cbd5e1'}},
      grid: {left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true},
      xAxis: {type: 'value', name: '万人', min: -bound, max: bound, splitNumber: 5, axisLine: {onZero: true, lineStyle: {color: '#475569'}}, axisLabel: {formatter: v => fmtNum(Math.abs(v), 0)}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
      yAxis: {type: 'category', data: pop.ageGroups, axisLabel: {color: '#94a3b8'}},
      series: [
        {name: '男性', type: 'bar', stack: 'total', data: maleData, itemStyle: {color: '#60a5fa', borderRadius: [4, 0, 0, 4]}, markLine: ageMark},
        {name: '女性', type: 'bar', stack: 'total', data: femaleData, itemStyle: {color: '#f472b6', borderRadius: [0, 4, 4, 0]}}
      ]
    }, true);

    let total = 0, elderly = 0, young = 0, working = 0;
    pop.ageGroups.forEach((g, i) => {
      const sum = pop.male[i] + pop.female[i];
      total += sum;
      const start = parseInt(g);
      if (start >= 65) elderly += sum;
      if (start < 15) young += sum;
      if (start >= 15 && start < 65) working += sum;
    });
    root.querySelector('#agingRate').textContent = (elderly / total * 100).toFixed(1) + '%';
    root.querySelector('#dependencyRatio').textContent = ((young + elderly) / working * 100).toFixed(1) + '%';
  }

  return {
    init(root) {
      rootEl = root;
      chart = echarts.init(root.querySelector('#pyramidChart'), 'dashboard');
      const slider = root.querySelector('#pyramidYearSlider');
      slider.min = 1950; slider.max = 2090; slider.step = 1;
      slider.addEventListener('input', () => { state.pyramidYear = parseInt(slider.value); stopPlay(); refresh(); });
      root.querySelector('#playPyramidBtn').addEventListener('click', () => {
        if (playInterval) stopPlay();
        else {
          playInterval = setInterval(() => {
            let y = state.pyramidYear + 1;
            if (y > 2090) y = 1950;
            state.pyramidYear = y;
            refresh();
          }, 150);
          root.querySelector('#playPyramidBtn').textContent = '暂停';
        }
      });
    },
    update,
    resize() { chart && chart.resize(); }
  };
})());
