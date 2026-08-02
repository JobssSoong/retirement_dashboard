// 家庭设置：单人/夫妻 切换 + 配偶参数 + 丧偶期支出系数
Dashboard.register('family', (() => {
  const pensionPresets = {none:0, resident:220, employee:2500, civil:5500};
  return {
    init(root) {
      const setMode = m => { state.mode = m; Store.changed(); };
      root.querySelector('#modeSingle').addEventListener('click', () => setMode('single'));
      root.querySelector('#modeCouple').addEventListener('click', () => setMode('couple'));

      const sp = () => state.spouse;
      const bindNum = (id, key) => {
        const el = root.querySelector('#' + id);
        el.addEventListener('change', () => { sp()[key] = Math.max(0, parseFloat(el.value) || 0); Store.changed(); });
      };
      bindNum('spouseAgeInput', 'currentAge');
      bindNum('spouseRetireInput', 'targetAge');
      bindNum('spouseLifeInput', 'lifeExpectancy');
      root.querySelector('#spousePensionSelect').addEventListener('change', e => {
        sp().pensionType = e.target.value;
        sp().pensionMonthly = pensionPresets[e.target.value];
        Store.changed();
      });
      root.querySelector('#spousePensionInput').addEventListener('change', e => {
        sp().pensionMonthly = Math.max(0, parseFloat(e.target.value) || 0);
        Store.changed();
      });
      const surv = root.querySelector('#survivorSlider');
      surv.addEventListener('input', () => { state.survivorFactor = parseInt(surv.value) / 100; Store.changed(); });
    },

    update(s, root) {
      const couple = s.mode === 'couple';
      root.querySelector('#modeSingle').className = 'mode-btn px-4 py-1.5 text-sm transition ' + (couple ? '' : 'active');
      root.querySelector('#modeCouple').className = 'mode-btn px-4 py-1.5 text-sm transition ' + (couple ? 'active' : '');
      const cfg = root.querySelector('#spouseConfig');
      cfg.classList.toggle('hidden', !couple);
      cfg.classList.toggle('flex', couple);
      if (couple) {
        root.querySelector('#spouseAgeInput').value = s.spouse.currentAge;
        root.querySelector('#spouseRetireInput').value = s.spouse.targetAge;
        root.querySelector('#spouseLifeInput').value = s.spouse.lifeExpectancy;
        root.querySelector('#spousePensionSelect').value = s.spouse.pensionType;
        root.querySelector('#spousePensionInput').value = s.spouse.pensionMonthly;
        root.querySelector('#survivorSlider').value = Math.round(s.survivorFactor * 100);
        root.querySelector('#survivorValue').textContent = Math.round(s.survivorFactor * 100) + '%';
      }
    }
  };
})());
