// 宏观数据仪表盘：历史(实线) + 2025-2030 预测(虚线/浅色)。预测为趋势外推(估算)
Dashboard.register('macro', (() => {
  let cpi, deposit, savings, m2gdp, pension, house;
  const CUT = 2024;  // 预测起点
  // 将序列拆成 历史(<=CUT) 与 预测(>=CUT，含CUT以衔接)
  const pair = (data, fn) => ({
    hist: data.map(d => d.year <= CUT ? fn(d) : null),
    fc: data.map(d => d.year >= CUT ? fn(d) : null)
  });
  const fcMark = {silent: true, symbol: 'none', data: [{xAxis: '2024', lineStyle: {color: '#64748b', type: 'dotted'}, label: {formatter: '预测→', color: '#94a3b8', position: 'insideEndTop'}}]};

  return {
    init(root) {
      cpi = echarts.init(root.querySelector('#cpiChart'), 'dashboard');
      deposit = echarts.init(root.querySelector('#depositChart'), 'dashboard');
      savings = echarts.init(root.querySelector('#savingsChart'), 'dashboard');
      m2gdp = echarts.init(root.querySelector('#m2gdpChart'), 'dashboard');
      pension = echarts.init(root.querySelector('#pensionFundChart'), 'dashboard');
      house = echarts.init(root.querySelector('#houseChart'), 'dashboard');
    },

    update() {
      const allYears = d => d.year;

      // CPI
      const cpiP = pair(cpiData, d => d.cpi);
      cpi.setOption({
        tooltip: {trigger: 'axis', formatter: p => p[0].name + '年<br/>' + p.filter(x => x.value != null).map(x => x.seriesName + ': ' + x.value + '%').join('<br/>')},
        grid: {left: '10%', right: '5%', top: '15%', bottom: '15%'},
        xAxis: {type: 'category', data: cpiData.map(allYears), axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '%', axisLabel: {fontSize: 10}},
        series: [
          {name: 'CPI', type: 'line', data: cpiP.hist, smooth: true, areaStyle: {color: 'rgba(45,212,191,0.2)'}, lineStyle: {color: '#2dd4bf'}, symbol: 'none', markLine: fcMark},
          {name: 'CPI预测', type: 'line', data: cpiP.fc, smooth: true, lineStyle: {color: '#2dd4bf', type: 'dashed'}, symbol: 'none'}
        ]
      });

      // 存款利率
      const depP = pair(depositRateData, d => d.rate);
      deposit.setOption({
        tooltip: {trigger: 'axis', formatter: p => p[0].name + '年<br/>' + p.filter(x => x.value != null).map(x => x.value + '%').join('<br/>')},
        grid: {left: '10%', right: '5%', top: '15%', bottom: '15%'},
        xAxis: {type: 'category', data: depositRateData.map(allYears), axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '%', axisLabel: {fontSize: 10}},
        series: [
          {type: 'line', step: 'start', data: depP.hist, lineStyle: {color: '#60a5fa'}, areaStyle: {color: 'rgba(96,165,250,0.15)'}, symbol: 'none', markLine: fcMark},
          {type: 'line', step: 'start', data: depP.fc, lineStyle: {color: '#60a5fa', type: 'dashed'}, symbol: 'none'}
        ]
      });

      // 储蓄率
      const savP = pair(savingsRateData, d => d.rate);
      savings.setOption({
        tooltip: {trigger: 'axis', formatter: p => p[0].name + '年<br/>储蓄率: ' + p.filter(x => x.value != null)[0].value + '%'},
        grid: {left: '10%', right: '5%', top: '15%', bottom: '15%'},
        xAxis: {type: 'category', data: savingsRateData.map(allYears), axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '%', axisLabel: {fontSize: 10}},
        series: [
          {type: 'line', data: savP.hist, smooth: true, areaStyle: {color: 'rgba(52,211,153,0.2)'}, lineStyle: {color: '#34d399'}, symbol: 'none', markLine: fcMark},
          {type: 'line', data: savP.fc, smooth: true, lineStyle: {color: '#34d399', type: 'dashed'}, symbol: 'none'}
        ]
      });

      // M2 / GDP
      const m2P = pair(m2gdpData, d => d.m2);
      const gdpP = pair(m2gdpData, d => d.gdp);
      m2gdp.setOption({
        tooltip: {trigger: 'axis'},
        legend: {data: ['M2增速', 'GDP增速'], top: 0, textStyle: {fontSize: 10, color: '#cbd5e1'}},
        grid: {left: '10%', right: '12%', top: '18%', bottom: '15%'},
        xAxis: {type: 'category', data: m2gdpData.map(allYears), axisLabel: {fontSize: 10}},
        yAxis: [
          {type: 'value', name: 'GDP%', min: 0, max: 16, axisLabel: {fontSize: 10}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
          {type: 'value', name: 'M2%', min: 0, max: 32, axisLabel: {fontSize: 10}, splitLine: {show: false}}
        ],
        series: [
          {name: 'GDP增速', type: 'line', data: gdpP.hist, yAxisIndex: 0, lineStyle: {color: '#34d399'}, symbol: 'none', markLine: fcMark},
          {type: 'line', data: gdpP.fc, yAxisIndex: 0, lineStyle: {color: '#34d399', type: 'dashed'}, symbol: 'none'},
          {name: 'M2增速', type: 'line', data: m2P.hist, yAxisIndex: 1, lineStyle: {color: '#fbbf24'}, symbol: 'none'},
          {type: 'line', data: m2P.fc, yAxisIndex: 1, lineStyle: {color: '#fbbf24', type: 'dashed'}, symbol: 'none'}
        ]
      });

      // 养老金池
      const revP = pair(pensionFundData, d => d.revenue);
      const expP = pair(pensionFundData, d => d.expense);
      const balP = pair(pensionFundData, d => d.balance);
      pension.setOption({
        tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}, valueFormatter: v => v == null ? '—' : (v + ' 亿元')},
        legend: {data: ['基金收入', '基金支出', '累计结余'], top: 0, textStyle: {fontSize: 10, color: '#cbd5e1'}},
        grid: {left: '8%', right: '10%', top: '18%', bottom: '12%', containLabel: true},
        xAxis: {type: 'category', data: pensionFundData.map(allYears), axisLabel: {fontSize: 10}},
        yAxis: [
          {type: 'value', name: '收入/支出(亿元)', axisLabel: {fontSize: 10}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
          {type: 'value', name: '结余(亿元)', axisLabel: {fontSize: 10}, splitLine: {show: false}}
        ],
        series: [
          {name: '基金收入', type: 'bar', data: revP.hist, itemStyle: {color: '#34d399'}},
          {type: 'bar', data: revP.fc, itemStyle: {color: 'rgba(52,211,153,0.4)'}},
          {name: '基金支出', type: 'bar', data: expP.hist, itemStyle: {color: '#f472b6'}},
          {type: 'bar', data: expP.fc, itemStyle: {color: 'rgba(244,114,182,0.4)'}},
          {name: '累计结余', type: 'line', yAxisIndex: 1, connectNulls: true, data: balP.hist, lineStyle: {color: '#fbbf24', width: 2}, itemStyle: {color: '#fbbf24'}, symbol: 'circle', symbolSize: 5, markLine: fcMark},
          {type: 'line', yAxisIndex: 1, connectNulls: true, data: balP.fc, lineStyle: {color: '#fbbf24', width: 2, type: 'dashed'}, itemStyle: {color: '#fbbf24'}, symbol: 'circle', symbolSize: 5}
        ]
      });

      // 房价
      const priceP = pair(housePriceData, d => d.price);
      const baiP = pair(housePriceData, d => d.baiCity);
      house.setOption({
        tooltip: {trigger: 'axis', valueFormatter: v => v == null ? '—' : (v.toLocaleString() + ' 元/㎡')},
        legend: {data: ['全国商品房均价', '百城新建住宅均价'], top: 0, textStyle: {fontSize: 10, color: '#cbd5e1'}},
        grid: {left: '8%', right: '8%', top: '18%', bottom: '12%', containLabel: true},
        xAxis: {type: 'category', data: housePriceData.map(allYears), axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '元/㎡', axisLabel: {formatter: v => (v / 1000) + 'k'}},
        series: [
          {name: '全国商品房均价', type: 'line', data: priceP.hist, smooth: true, lineStyle: {color: '#2dd4bf', width: 2}, itemStyle: {color: '#2dd4bf'}, areaStyle: {color: 'rgba(45,212,191,0.12)'}, markLine: fcMark},
          {type: 'line', data: priceP.fc, smooth: true, lineStyle: {color: '#2dd4bf', width: 2, type: 'dashed'}, itemStyle: {color: '#2dd4bf'}},
          {name: '百城新建住宅均价', type: 'line', connectNulls: true, data: baiP.hist, lineStyle: {color: '#60a5fa', width: 2}, itemStyle: {color: '#60a5fa'}, symbol: 'circle', symbolSize: 5},
          {type: 'line', connectNulls: true, data: baiP.fc, lineStyle: {color: '#60a5fa', width: 2, type: 'dashed'}, itemStyle: {color: '#60a5fa'}, symbol: 'circle', symbolSize: 5}
        ]
      });
    },

    resize() { [cpi, deposit, savings, m2gdp, pension, house].forEach(c => c && c.resize()); }
  };
})());
