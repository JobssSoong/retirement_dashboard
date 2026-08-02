// 人口结构金字塔：年份滑块 + 播放动画
Dashboard.register('pyramid', (() => {
  let chart;
  let playInterval = null;
  let rootEl;

  function stopPlay() {
    if (playInterval) { clearInterval(playInterval); playInterval = null; rootEl.querySelector('#playPyramidBtn').textContent = '播放'; }
  }

  return {
    init(root) {
      rootEl = root;
      chart = echarts.init(root.querySelector('#pyramidChart'), 'dashboard');
      const slider = root.querySelector('#pyramidYearSlider');
      slider.min = 1950; slider.max = 2050; slider.step = 1;
      slider.addEventListener('input', () => { state.pyramidYear = parseInt(slider.value); stopPlay(); Store.changed(); });
      root.querySelector('#playPyramidBtn').addEventListener('click', () => {
        if (playInterval) stopPlay();
        else {
          playInterval = setInterval(() => {
            let y = state.pyramidYear + 1;
            if (y > 2050) y = 1950;
            state.pyramidYear = y;
            Store.changed();
          }, 150);
          root.querySelector('#playPyramidBtn').textContent = '暂停';
        }
      });
    },

    update(s, root) {
      root.querySelector('#pyramidYearSlider').value = s.pyramidYear;
      root.querySelector('#pyramidYearValue').textContent = s.pyramidYear;

      const pop = getPopulation(s.pyramidYear);
      const maleData = pop.male.map(v => -v);
      const femaleData = pop.female;

      // 当前用户在所选年份的年龄，并在对应年龄段画标记线
      const currentYear = new Date().getFullYear();
      const userAge = Math.round(s.currentAge + (s.pyramidYear - currentYear));
      let userMark = null;
      if (userAge >= 0) {
        const bandIdx = Math.max(0, Math.min(ageGroups.length - 1, Math.floor(userAge / 5)));
        userMark = {
          silent: true, symbol: 'none',
          data: [{yAxis: ageGroups[bandIdx], lineStyle: {color: '#fbbf24', type: 'dashed', width: 2}, label: {formatter: '您 ' + userAge + ' 岁', color: '#fbbf24', position: 'insideStartTop'}}]
        };
      }

      chart.setOption({
        tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}, formatter: function(params) {
          const m = Math.abs(params[0].value);
          const f = params[1].value;
          return params[0].name + '<br/>男性: ' + fmtNum(m, 0) + ' 万人<br/>女性: ' + fmtNum(f, 0) + ' 万人<br/>合计: ' + fmtNum(m + f, 0) + ' 万人';
        }},
        legend: {data: ['男性', '女性'], top: 0, textStyle: {color: '#cbd5e1'}},
        grid: {left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true},
        xAxis: {type: 'value', axisLabel: {formatter: v => fmtNum(Math.abs(v), 0)}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
        yAxis: {type: 'category', data: pop.ageGroups, axisLabel: {color: '#94a3b8'}},
        series: [
          {name: '男性', type: 'bar', stack: 'total', data: maleData, itemStyle: {color: '#60a5fa', borderRadius: [4, 0, 0, 4]}, markLine: userMark || undefined},
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
    },

    resize() { chart && chart.resize(); }
  };
})());
