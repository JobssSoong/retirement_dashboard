// 宏观数据仪表盘：CPI / 存款利率 / 储蓄率 / M2-GDP / 养老金池 / 房价（纯展示，无控件）
Dashboard.register('macro', (() => {
  let cpi, deposit, savings, m2gdp, pension, house;
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
      cpi.setOption({
        tooltip: {trigger: 'axis', formatter: p => p[0].name + '年<br/>CPI: ' + p[0].value + '%'},
        grid: {left: '10%', right: '5%', top: '15%', bottom: '15%'},
        xAxis: {type: 'category', data: cpiData.map(d => d.year), axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '%', axisLabel: {fontSize: 10}},
        series: [{type: 'line', data: cpiData.map(d => d.cpi), smooth: true, areaStyle: {color: 'rgba(233,69,96,0.2)'}, lineStyle: {color: '#e94560'}, symbol: 'none'}]
      });
      deposit.setOption({
        tooltip: {trigger: 'axis', formatter: p => p[0].name + '年<br/>利率: ' + p[0].value + '%'},
        grid: {left: '10%', right: '5%', top: '15%', bottom: '15%'},
        xAxis: {type: 'category', data: depositRateData.map(d => d.year), axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '%', axisLabel: {fontSize: 10}},
        series: [{type: 'line', step: 'start', data: depositRateData.map(d => d.rate), lineStyle: {color: '#60a5fa'}, areaStyle: {color: 'rgba(96,165,250,0.15)'}, symbol: 'none'}]
      });
      savings.setOption({
        tooltip: {trigger: 'axis', formatter: p => p[0].name + '年<br/>国内总储蓄率: ' + p[0].value + '%'},
        grid: {left: '10%', right: '5%', top: '15%', bottom: '15%'},
        xAxis: {type: 'category', data: savingsRateData.map(d => d.year), axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '%', axisLabel: {fontSize: 10}},
        series: [{type: 'line', data: savingsRateData.map(d => d.rate), smooth: true, areaStyle: {color: 'rgba(52,211,153,0.2)'}, lineStyle: {color: '#34d399'}, symbol: 'none'}]
      });
      const years = m2gdpData.map(d => d.year);
      m2gdp.setOption({
        tooltip: {trigger: 'axis'},
        legend: {data: ['M2增速', 'GDP增速'], top: 0, textStyle: {fontSize: 10, color: '#cbd5e1'}},
        grid: {left: '10%', right: '12%', top: '18%', bottom: '15%'},
        xAxis: {type: 'category', data: years, axisLabel: {fontSize: 10}},
        yAxis: [
          {type: 'value', name: 'GDP%', min: 0, max: 16, axisLabel: {fontSize: 10}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
          {type: 'value', name: 'M2%', min: 0, max: 32, axisLabel: {fontSize: 10}, splitLine: {show: false}}
        ],
        series: [
          {name: 'GDP增速', type: 'line', data: m2gdpData.map(d => d.gdp), yAxisIndex: 0, lineStyle: {color: '#34d399'}, symbol: 'none'},
          {name: 'M2增速', type: 'line', data: m2gdpData.map(d => d.m2), yAxisIndex: 1, lineStyle: {color: '#fbbf24'}, symbol: 'none'}
        ]
      });

      // 养老金池：收入/支出（柱）+ 累计结余（线）
      pension.setOption({
        tooltip: {trigger: 'axis', axisPointer: {type: 'shadow'}, valueFormatter: v => v == null ? '—' : (v + ' 亿元')},
        legend: {data: ['基金收入', '基金支出', '累计结余'], top: 0, textStyle: {fontSize: 10, color: '#cbd5e1'}},
        grid: {left: '8%', right: '10%', top: '18%', bottom: '12%', containLabel: true},
        xAxis: {type: 'category', data: pensionFundData.map(d => d.year), axisLabel: {fontSize: 10}},
        yAxis: [
          {type: 'value', name: '收入/支出(亿元)', axisLabel: {fontSize: 10}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
          {type: 'value', name: '结余(亿元)', axisLabel: {fontSize: 10}, splitLine: {show: false}}
        ],
        series: [
          {name: '基金收入', type: 'bar', data: pensionFundData.map(d => d.revenue), itemStyle: {color: '#34d399'}},
          {name: '基金支出', type: 'bar', data: pensionFundData.map(d => d.expense), itemStyle: {color: '#f472b6'}},
          {name: '累计结余', type: 'line', yAxisIndex: 1, connectNulls: true, data: pensionFundData.map(d => d.balance), lineStyle: {color: '#fbbf24', width: 2}, itemStyle: {color: '#fbbf24'}, symbol: 'circle', symbolSize: 5}
        ]
      });

      // 房价：全国商品房均价 + 百城新建住宅均价
      house.setOption({
        tooltip: {trigger: 'axis', valueFormatter: v => v == null ? '—' : (v.toLocaleString() + ' 元/㎡')},
        legend: {data: ['全国商品房均价', '百城新建住宅均价'], top: 0, textStyle: {fontSize: 10, color: '#cbd5e1'}},
        grid: {left: '8%', right: '8%', top: '18%', bottom: '12%', containLabel: true},
        xAxis: {type: 'category', data: housePriceData.map(d => d.year), axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '元/㎡', axisLabel: {formatter: v => (v / 1000) + 'k'}},
        series: [
          {name: '全国商品房均价', type: 'line', data: housePriceData.map(d => d.price), smooth: true, lineStyle: {color: '#e94560', width: 2}, itemStyle: {color: '#e94560'}, areaStyle: {color: 'rgba(233,69,96,0.12)'}},
          {name: '百城新建住宅均价', type: 'line', connectNulls: true, data: housePriceData.map(d => d.baiCity), lineStyle: {color: '#60a5fa', width: 2}, itemStyle: {color: '#60a5ba'}, symbol: 'circle', symbolSize: 5}
        ]
      });
    },

    resize() { [cpi, deposit, savings, m2gdp, pension, house].forEach(c => c && c.resize()); }
  };
})());
