// ECharts 主题：所有模块初始化图表时使用 'dashboard' 主题
echarts.registerTheme('dashboard', {
  backgroundColor: 'transparent',
  textStyle: {fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans SC, sans-serif'},
  title: {textStyle: {color: '#f8fafc'}, subtextStyle: {color: '#94a3b8'}},
  legend: {textStyle: {color: '#cbd5e1'}, pageTextStyle: {color: '#cbd5e1'}},
  tooltip: {backgroundColor: 'rgba(22,33,62,0.96)', borderColor: '#e94560', borderWidth: 1, textStyle: {color: '#f1f5f9'}, padding: 12},
  categoryAxis: {axisLine: {lineStyle: {color: '#475569'}}, axisTick: {show: false}, axisLabel: {color: '#94a3b8'}, splitLine: {show: false}},
  valueAxis: {axisLine: {show: false}, axisTick: {show: false}, axisLabel: {color: '#94a3b8'}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
  line: {smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: {width: 2}},
  bar: {itemStyle: {borderRadius: [4, 4, 0, 0]}},
  pie: {label: {color: '#e2e8f0'}, labelLine: {lineStyle: {color: '#64748b'}}}
});
