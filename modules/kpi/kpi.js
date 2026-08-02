// KPI 卡片：倒推展示——所需储蓄额、每月需存（购买力/账面）、退休倒计时
Dashboard.register('kpi', {
  update(s, root) {
    const C = requiredRetirementCorpus(s);
    const dep = requiredMonthlyDeposit(s, C.nominal);

    // 所需储蓄额
    root.querySelector('#corpusReal').textContent = fmtWan(C.real);
    root.querySelector('#corpusNominal').textContent = fmtWan(C.nominal);
    const ratio = C.real > 0 ? Math.min(100, s.currentSavings / C.real * 100) : 0;
    root.querySelector('#savingsRatio').textContent = fmtWan(s.currentSavings) + '（' + ratio.toFixed(1) + '%）';
    root.querySelector('#savingsBar').style.width = ratio + '%';

    // 每月需存（购买力）
    root.querySelector('#depositRealMonthly').textContent = Math.round(dep.realMonthly * 10000).toLocaleString('zh-CN') + ' 元/月';
    root.querySelector('#depositAnnual').textContent = '折合每年 ' + fmtWan(dep.realAnnual) + '（购买力恒定）';

    // 每月需存（账面）
    root.querySelector('#depositNominal').textContent = Math.round(dep.nominalFirst * 10000).toLocaleString('zh-CN') + ' 元/月起';
    root.querySelector('#depositNominalLast').textContent = Math.round(dep.nominalLast * 10000).toLocaleString('zh-CN') + ' 元/月';

    // 倒计时：本人 + 配偶
    const cd = (retire, cur) => { const d = Math.max(0, retire - cur); const y = Math.floor(d), m = Math.round((d - y) * 12); return y + ' 年 ' + m + ' 月'; };
    root.querySelector('#countdownA').textContent = cd(s.targetAge, s.currentAge);
    root.querySelector('#countdownB').textContent = cd(s.spouse.targetAge, s.spouse.currentAge);
  }
});
