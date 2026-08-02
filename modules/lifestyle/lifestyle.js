// 花钱期（退休模拟器）：按所需储蓄额 C 支取，展示退休期支出结构与养老金覆盖
Dashboard.register('lifestyle', (() => {
  let chart, breakdown;
  const pensionPresets = {none:0, resident:220, employee:3000, civil:5500};

  function bind(root, id, handler) {
    const el = root.querySelector('#' + id);
    el.addEventListener('change', e => handler(e.target.value));
  }

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
      lifeSlider.min = 75; lifeSlider.max = 95; lifeSlider.step = 1;
      lifeSlider.addEventListener('input', () => { state.lifeExpectancy = parseInt(lifeSlider.value); Store.changed(); });
    },

    update(s, root) {
      root.querySelector('#lifestyleSelect').value = s.lifestyle;
      root.querySelector('#careSelect').value = s.careType;
      root.querySelector('#medicalSelect').value = s.medicalScenario;
      root.querySelector('#pensionTypeSelect').value = s.pensionType;
      root.querySelector('#pensionInput').value = s.pensionMonthly;
      root.querySelector('#insuranceSelect').value = s.insuranceRate;
      root.querySelector('#medicalInflationSelect').value = s.medicalInflation;
      const lifeSlider = root.querySelector('#lifeExpectancySlider');
      lifeSlider.value = s.lifeExpectancy;
      root.querySelector('#lifeExpectancyValue').textContent = s.lifeExpectancy + ' 岁';

      const C = requiredRetirementCorpus(s).nominal;
      const r = simulateRetirementCashflow(s, C);
      const dep = requiredMonthlyDeposit(s, C);

      // 支出汇总：账面 + 折回当前的购买力
      const n = r.detail.length || 1;
      const yt = yearsToRetire(s);
      let totalExpense = 0, totalIncome = 0, totalExpenseReal = 0;
      r.detail.forEach(d => {
        totalExpense += d.expenses;
        totalIncome += d.income;
        totalExpenseReal += d.expenses / Math.pow(1 + s.inflation, yt + (d.age - s.targetAge));
      });
      const avgExpenseReal = totalExpenseReal / n;
      const pensionAnnualAvg = totalIncome / n;

      root.querySelector('#avgExpense').textContent = fmtWan(totalExpense / n);
      root.querySelector('#avgExpenseReal').textContent = fmtWan(avgExpenseReal);
      root.querySelector('#pensionCoverage').textContent = (totalExpense > 0 ? totalIncome / totalExpense * 100 : 0).toFixed(0) + '%';
      root.querySelector('#pensionAnnual').textContent = fmtWan(pensionAnnualAvg) + '/年';
      root.querySelector('#totalExpense').textContent = fmtWan(totalExpense);
      root.querySelector('#totalExpenseReal').textContent = fmtWan(totalExpenseReal);

      // 计划达标提示
      const riskEl = root.querySelector('#riskBar');
      riskEl.className = 'w-full h-10 rounded-lg flex items-center justify-center text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30';
      riskEl.textContent = '按每月存 ' + Math.round(dep.realMonthly * 10000).toLocaleString('zh-CN') + ' 元，资金可支撑至预期寿命 ' + s.lifeExpectancy + ' 岁';

      // 图1：余额曲线（左轴）+ 当年支出（右轴柱）+ 进入消耗期/预期寿命标识
      const ages = r.detail.map(d => d.age + '岁');
      const balances = r.detail.map(d => +d.endBalance.toFixed(2));
      const expenses = r.detail.map(d => +d.expenses.toFixed(2));
      chart.setOption({
        tooltip: {trigger: 'axis', formatter: p => p[0].name + '<br/>' + p.map(x => '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + x.color + ';margin-right:5px;"></span>' + x.seriesName + ': ' + fmtWan(x.value)).join('<br/>')},
        legend: {data: ['账户余额', '当年支出'], top: 0, textStyle: {color: '#cbd5e1', fontSize: 10}},
        grid: {left: '3%', right: '4%', bottom: '3%', top: '14%', containLabel: true},
        xAxis: {type: 'category', boundaryGap: true, data: ages, axisLabel: {interval: 4}},
        yAxis: [
          {type: 'value', name: '余额(万)', axisLabel: {formatter: v => fmtNum(v, 0)}, splitLine: {lineStyle: {color: '#334155', type: 'dashed'}}},
          {type: 'value', name: '支出(万)', axisLabel: {formatter: v => fmtNum(v, 0)}, splitLine: {show: false}}
        ],
        series: [
          {
            name: '账户余额', type: 'line', yAxisIndex: 0, smooth: true, symbol: 'none',
            data: balances, lineStyle: {color: '#e94560', width: 3}, itemStyle: {color: '#e94560'},
            areaStyle: {color: 'rgba(233,69,96,0.15)'},
            markLine: {silent: true, symbol: 'none', data: [{xAxis: s.lifeExpectancy + '岁', lineStyle: {color: '#94a3b8', type: 'dashed'}, label: {formatter: '预期寿命', color: '#94a3b8'}}]},
            markPoint: {symbol: 'pin', symbolSize: 46, data: [{coord: [ages[0], balances[0]], value: '进入消耗期'}], itemStyle: {color: '#fbbf24'}, label: {color: '#1a1a2e', fontSize: 9}}
          },
          {name: '当年支出', type: 'bar', yAxisIndex: 1, data: expenses, barWidth: '60%', itemStyle: {color: 'rgba(96,165,250,0.55)', borderRadius: [3,3,0,0]}}
        ]
      }, true);

      // 图2：三阶段年均支出构成
      const cats = RETIREMENT_PHASES.map(p => p.name);
      const avgBase = [], avgMedical = [], avgCare = [];
      RETIREMENT_PHASES.forEach(ph => {
        const rows = r.detail.filter(d => phaseOfAge(d.age) === ph);
        const m = rows.length || 1;
        avgBase.push(rows.reduce((a, d) => a + d.base, 0) / m);
        avgMedical.push(rows.reduce((a, d) => a + d.medical, 0) / m);
        avgCare.push(rows.reduce((a, d) => a + d.care, 0) / m);
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
    },

    resize() { chart && chart.resize(); breakdown && breakdown.resize(); }
  };
})());
