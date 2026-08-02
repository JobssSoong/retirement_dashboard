// 子女模拟器：养育成本进主算（抬高每月需存），子女支持为可选假设收入
Dashboard.register('child', {
  init(root) {
    root.querySelector('#childEnable').addEventListener('change', e => { state.childEnabled = e.target.checked; Store.changed(); });
    root.querySelector('#childTier').addEventListener('change', e => { state.childTier = e.target.value; Store.changed(); });
    const readAges = () => {
      const arr = [];
      [1, 2, 3].forEach(i => {
        const el = root.querySelector('#childAge' + i);
        const v = parseFloat(el.value);
        if (el.value !== '' && !isNaN(v)) arr.push(v);
      });
      state.childAges = arr;
    };
    [1, 2, 3].forEach(i => root.querySelector('#childAge' + i).addEventListener('change', () => { readAges(); Store.changed(); }));
    const sup = root.querySelector('#childSupportSlider');
    sup.addEventListener('input', () => { state.childSupport = parseFloat(sup.value); Store.changed(); });
  },

  update(s, root) {
    root.querySelector('#childEnable').checked = s.childEnabled;
    const cfg = root.querySelector('#childConfig');
    cfg.classList.toggle('hidden', !s.childEnabled);
    if (!s.childEnabled) return;
    root.querySelector('#childTier').value = s.childTier;
    [1, 2, 3].forEach((i, idx) => { root.querySelector('#childAge' + i).value = s.childAges[idx] != null ? s.childAges[idx] : ''; });
    root.querySelector('#childSupportSlider').value = s.childSupport;
    root.querySelector('#childSupportValue').textContent = fmtNum(s.childSupport, 1) + ' 万/年';
    // 影响摘要：拆解（养老 + 养孩 - 子女支持 = 总额）
    const n = s.childAges.length;
    const impact = root.querySelector('#childImpact');
    if (!n) { impact.innerHTML = '请填写至少一个孩子年龄。'; return; }
    const b = depositBreakdown(s);
    const e = v => Math.round(v * 10000).toLocaleString('zh-CN');
    impact.innerHTML = '每月需存拆解：<br>养老 <b>' + e(b.base) + '</b> + 养孩 <b style="color:#f59e0b">+' + e(b.childCost) + '</b>'
      + ' − 子女支持 <b style="color:#34d399">' + e(b.childSupport) + '</b> = <b style="color:#fff">' + e(b.total) + ' 元/月</b>'
      + (s.childSupport > 0 ? '<br>（子女支持为假设值，非预测）' : '<br>（子女支持默认0，可上方调整）');
  }
});
