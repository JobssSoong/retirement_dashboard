// 敏感性分析：收益率 × 通胀率 → 每月需存额（元/月）
Dashboard.register('heatmap', (() => {
  let chart;
  const CAP = 15000; // 色阶上限（元/月）

  function monthlyAt(s, retPct, infPct) {
    const sc = Object.assign({}, s, {returnRate: retPct / 100, inflation: infPct / 100});
    const C = requiredRetirementCorpus(sc).nominal;
    return requiredMonthlyDeposit(sc, C).realMonthly * 10000;   // 元/月
  }

  return {
    init(root) {
      chart = echarts.init(root.querySelector('#heatmapChart'), 'dashboard');
    },

    update(s) {
      const returns = [];
      for (let r = 0; r <= 8; r += 0.5) returns.push(r);
      const inflations = [];
      for (let i = 0; i <= 6; i += 0.5) inflations.push(i);
      const data = [];
      inflations.forEach((inf, yi) => {
        returns.forEach((ret, xi) => {
          const m = monthlyAt(s, ret, inf);
          data.push([xi, yi, Math.min(m, CAP)]);
        });
      });

      const curMonthly = Math.min(monthlyAt(s, s.returnRate * 100, s.inflation * 100), CAP);
      const curX = returns.indexOf(Math.round(s.returnRate * 100 * 2) / 2);
      const curY = inflations.indexOf(Math.round(s.inflation * 100 * 2) / 2);

      chart.setOption({
        tooltip: {position: 'top', formatter: p => '收益率 ' + returns[p.data[0]] + '%<br/>通胀率 ' + inflations[p.data[1]] + '%<br/>每月需存 ' + Math.round(p.data[2]).toLocaleString('zh-CN') + ' 元'},
        grid: {left: '12%', right: '12%', top: '10%', bottom: '18%'},
        xAxis: {type: 'category', data: returns.map(r => r + '%'), splitArea: {show: true}, axisLabel: {fontSize: 10}, name: '投资收益率', nameLocation: 'middle', nameGap: 28},
        yAxis: {type: 'category', data: inflations.map(i => i + '%'), splitArea: {show: true}, axisLabel: {fontSize: 10}, name: '年通胀率', nameLocation: 'middle', nameGap: 30},
        visualMap: {min: 0, max: CAP, calculable: true, orient: 'horizontal', left: 'center', bottom: '0%', inRange: {color: ['#34d399', '#fbbf24', '#e94560']}, textStyle: {color: '#cbd5e1'}},
        series: [
          {name: '每月需存', type: 'heatmap', data: data, label: {show: false}, emphasis: {itemStyle: {shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)'}}},
          {
            type: 'effectScatter', symbolSize: 16,
            data: [[curX, curY, 0]],
            itemStyle: {color: '#fff'},
            rippleEffect: {brushType: 'stroke', scale: 3},
            label: {
              show: true, position: 'right', color: '#fff', fontSize: 11, fontWeight: 'bold',
              backgroundColor: 'rgba(233,69,96,0.85)', padding: [3, 6], borderRadius: 4,
              formatter: '当前: ' + Math.round(curMonthly).toLocaleString('zh-CN') + ' 元/月'
            }
          }
        ]
      }, true);
    },

    resize() { chart && chart.resize(); }
  };
})());
