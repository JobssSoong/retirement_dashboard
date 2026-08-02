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

    // 每月需存（购买力）+ 子女拆解
    const b = depositBreakdown(s);
    const e = v => Math.round(v * 10000).toLocaleString('zh-CN');
    root.querySelector('#depositRealMonthly').textContent = e(b.total) + ' 元/月';
    root.querySelector('#depositAnnual').innerHTML = b.has
      ? '<span style="color:#a1a1aa">养老 ' + e(b.base) + ' + 养孩 <span style="color:#f59e0b">+' + e(b.childCost) + '</span> − 子女支持 <span style="color:#34d399">' + e(b.childSupport) + '</span></span>'
      : '折合每年 ' + fmtWan(b.total * 12) + '（购买力恒定）';

    // 每月需存（账面）
    root.querySelector('#depositNominal').textContent = Math.round(dep.nominalFirst * 10000).toLocaleString('zh-CN') + ' 元/月起';
    root.querySelector('#depositNominalLast').textContent = Math.round(dep.nominalLast * 10000).toLocaleString('zh-CN') + ' 元/月';

    // 倒计时：本人 + 配偶
    const cd = (retire, cur) => { const d = Math.max(0, retire - cur); const y = Math.floor(d), m = Math.round((d - y) * 12); return y + ' 年 ' + m + ' 月'; };
    root.querySelector('#countdownA').textContent = cd(s.targetAge, s.currentAge);
    root.querySelector('#countdownB').textContent = cd(s.spouse.targetAge, s.spouse.currentAge);

    // 乐观版 (+1.5%) 对照
    const jo = optimisticSolve(s);
    const oRate = ((s.returnRate + 0.015) * 100).toFixed(1);
    root.querySelector('#corpusNominal').innerHTML += ' <span style="color:#34d399">| 乐观~' + fmtNum(jo.peakCreal, 0) + '万</span>';
    root.querySelector('#depositAnnual').innerHTML += '<br><span style="color:#34d399">乐观(~' + oRate + '%): ' + Math.round(jo.deposit.realMonthly * 10000).toLocaleString('zh-CN') + ' 元/月</span>';
  }
});
