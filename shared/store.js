// 状态层：全局可变 state + 发布订阅 store
// 任意模块改完状态后调用 Store.changed()，所有订阅者（各模块的重绘函数）会被通知
let state = loadState();

const Store = (() => {
  const listeners = new Set();
  return {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    changed() { saveState(); updateUrl(); listeners.forEach(fn => fn(state)); }
  };
})();

function loadState() {
  let parsed = {};
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) parsed = JSON.parse(s);
  } catch (e) {}
  if (location.hash.length > 1) {
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(location.hash.slice(1))));
      parsed = Object.assign({}, parsed, decoded);
    } catch (e) {}
  }
  const merged = Object.assign({}, defaultState, parsed);
  if (!merged.assetWeights) merged.assetWeights = Object.assign({}, defaultState.assetWeights);
  if (!merged.spouse) merged.spouse = Object.assign({}, defaultState.spouse);
  if (!merged.phaseMul) merged.phaseMul = Object.assign({}, defaultState.phaseMul);
  // 连续金额字段必须是数字（兼容旧 hash 里的字符串档位 key）
  ['lifestyle', 'care', 'medical'].forEach(k => {
    if (typeof merged[k] !== 'number' || isNaN(merged[k])) merged[k] = defaultState[k];
  });
  delete merged.careType; delete merged.medicalScenario;  // 清理旧字段
  if (!Array.isArray(merged.childAges)) merged.childAges = [];
  return merged;
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function updateUrl() {
  const h = '#' + btoa(encodeURIComponent(JSON.stringify(state)));
  if (location.hash !== h) history.replaceState(null, null, h);
}
