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
    // 影响摘要：对比 启用/关闭 子女 的每月需存
    const n = s.childAges.length;
    const impact = root.querySelector('#childImpact');
    if (!n) { impact.innerHTML = '请填写至少一个孩子年龄。'; return; }
    const on = coupleSolve(s).deposit.realMonthly;
    const off = coupleSolve(Object.assign({}, s, {childEnabled: false, childSupport: 0})).deposit.realMonthly;
    const delta = Math.round((on - off) * 10000);
    const sign = delta >= 0 ? '+' : '';
    impact.innerHTML = '养育 <b>' + n + '</b> 孩使家庭每月需存 <b style="color:#f59e0b">' + sign + delta.toLocaleString('zh-CN') + ' 元</b>'
      + (delta < 0 ? '（子女支持假设已抵消养育成本）' : (s.childSupport > 0 ? '（含子女支持假设）' : '；如需计入子女支持，可上方调整。'));
  }
});
