// 资产配置建议器：7 类资产权重（联动归一）、行为溢价、等效收益、每年需存曲线
Dashboard.register('asset', (() => {
  let pie, deposit;
  let rootEl;

  function onAssetWeightChange(name, newVal) {
    const others = assetNames.filter(n => n !== name);
    const oldOthers = others.reduce((s, n) => s + state.assetWeights[n], 0);
    const remaining = 100 - newVal;
    if (oldOthers === 0) {
      others.forEach(n => state.assetWeights[n] = Math.round(remaining / others.length));
    } else {
      const factor = remaining / oldOthers;
      others.forEach(n => state.assetWeights[n] = Math.max(0, Math.round(state.assetWeights[n] * factor)));
    }
    state.assetWeights[name] = newVal;
    let sum = assetNames.reduce((s, n) => s + state.assetWeights[n], 0);
    const diff = 100 - sum;
    const maxName = assetNames.reduce((a, b) => state.assetWeights[a] >= state.assetWeights[b] ? a : b);
    state.assetWeights[maxName] += diff;
    Store.changed();
  }

  function renderAssetControls(root) {
    const container = root.querySelector('#assetControls');
    container.innerHTML = '';
    assetNames.forEach(name => {
      const row = document.createElement('div');
      row.className = 'bg-[#16213e]/50 rounded-lg p-3 border border-gray-700/30';
      row.innerHTML = `<div class='flex justify-between items-center mb-2'><span class='text-sm text-white font-medium'>${name}</span><span class='text-sm text-[#2dd4bf] font-mono asset-pct' data-name='${name}'>${state.assetWeights[name]}%</span></div><input type='range' min='0' max='100' step='1' value='${state.assetWeights[name]}' class='asset-slider w-full mb-2' data-name='${name}'><div class='asset-meta flex justify-between text-xs text-gray-400' data-name='${name}'></div>`;
      container.appendChild(row);
    });
    container.querySelectorAll('.asset-slider').forEach(slider => {
      slider.addEventListener('input', () => onAssetWeightChange(slider.dataset.name, parseInt(slider.value)));
    });
  }

  function updateAssetControls(root) {
    assetNames.forEach(name => {
      const slider = root.querySelector(`.asset-slider[data-name='${name}']`);
      const pct = root.querySelector(`.asset-pct[data-name='${name}']`);
      const meta = root.querySelector(`.asset-meta[data-name='${name}']`);
      if (slider) slider.value = state.assetWeights[name];
      if (pct) pct.textContent = state.assetWeights[name] + '%';
      if (meta) {
        const p = assetParams[name];
        const eq = calcAssetEquiv(name);
        meta.innerHTML = `<span>名义 ${(p.rate * 100).toFixed(1)}%</span><span>风险折扣 ${((p.rate - eq) * 100).toFixed(1)}%</span><span>等效 ${(eq * 100).toFixed(1)}%</span>`;
      }
    });
    root.querySelector('#behaviorValue').textContent = state.behaviorPremium.toFixed(1) + '%';
    root.querySelector('#behaviorSlider').value = state.behaviorPremium;
  }

  return {
    init(root) {
      rootEl = root;
      pie = echarts.init(root.querySelector('#assetPieChart'), 'dashboard');
      deposit = echarts.init(root.querySelector('#assetDepositChart'), 'dashboard');
      renderAssetControls(root);
      root.querySelector('#behaviorSlider').addEventListener('input', () => { state.behaviorPremium = parseFloat(root.querySelector('#behaviorSlider').value); Store.changed(); });
    },

    update(s, root) {
      updateAssetControls(root);

      const data = assetNames.map(name => ({value: s.assetWeights[name], name: name, itemStyle: {color: assetParams[name].color}}));
      pie.setOption({
        tooltip: {trigger: 'item', formatter: p => p.name + '<br/>占比: ' + p.value + '%<br/>等效利率: ' + (calcAssetEquiv(p.name) * 100).toFixed(1) + '%'},
        series: [{type: 'pie', radius: ['40%', '70%'], data: data, label: {formatter: '{b}\n{d}%'}, emphasis: {scale: true, scaleSize: 5}}]
      }, true);

      let totalEquiv = 0;
      assetNames.forEach(name => totalEquiv += s.assetWeights[name] / 100 * calcAssetEquiv(name));
      const realRate = totalEquiv - s.inflation;
      root.querySelector('#totalEquivRate').textContent = (realRate * 100).toFixed(2) + '%';

      const years = yearsToRetire();
      const C = requiredRetirementCorpus(s).nominal;
      const realDeposit = pmt(C, s.currentSavings, years, realRate);
      const ages = [];
      const nominalSeries = [];
      const realSeries = [];
      let sumNominal = 0;
      for (let t = 0; t < years; t++) {
        const nominal = realDeposit * Math.pow(1 + s.inflation, t);
        ages.push((s.currentAge + t) + '岁');
        nominalSeries.push(nominal);
        realSeries.push(realDeposit);
        sumNominal += nominal;
      }
      const avgNominal = years > 0 ? sumNominal / years : 0;
      root.querySelector('#avgNominalDeposit').textContent = fmtWan(avgNominal);
      root.querySelector('#avgRealDeposit').textContent = fmtWan(realDeposit);

      deposit.setOption({
        tooltip: {trigger: 'axis', formatter: p => p[0].name + '<br/>' + p.map(x => '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + x.color + ';margin-right:5px;"></span>' + x.seriesName + ': ' + fmtWan(x.value)).join('<br/>')},
        legend: {data: ['账面每年需存', '实际购买力每年需存'], top: 0, textStyle: {color: '#cbd5e1', fontSize: 10}},
        grid: {left: '3%', right: '4%', bottom: '3%', top: '18%', containLabel: true},
        xAxis: {type: 'category', data: ages, axisLabel: {fontSize: 10}},
        yAxis: {type: 'value', name: '万元', axisLabel: {formatter: v => fmtNum(v, 0)}},
        series: [
          {name: '账面每年需存', type: 'line', data: nominalSeries, smooth: true, lineStyle: {color: '#2dd4bf'}, itemStyle: {color: '#2dd4bf'}, symbol: 'none', areaStyle: {color: 'rgba(45,212,191,0.15)'}},
          {name: '实际购买力每年需存', type: 'line', data: realSeries, lineStyle: {color: '#34d399', type: 'dashed'}, itemStyle: {color: '#34d399'}, symbol: 'none'}
        ]
      }, true);
    },

    resize() { pie && pie.resize(); deposit && deposit.resize(); }
  };
})());
