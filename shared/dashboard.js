// 模块加载器 / 注册表：负责把各独立模块 fetch 注入并装配
// 每个模块 .js 调用 Dashboard.register(name, def)，def 形如：
//   { init(root){...}, update(state, root){...}, resize(){} }

// 渲染容器内 $...$ / $$...$$ 数学公式（KaTeX auto-render，动态注入后手动调用）
function renderMath(root) {
  if (window.renderMathInElement) {
    renderMathInElement(root, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ],
      throwOnError: false
    });
  }
}

const Dashboard = (() => {
  const modules = {};
  const resizers = [];

  function register(name, def) { modules[name] = def; }

  async function load(name, root) {
    const base = `modules/${name}/${name}.`;
    // 1) 模块专属 CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + 'css';
    document.head.appendChild(link);
    // 2) 模块 HTML 片段
    const res = await fetch(base + 'html');
    root.innerHTML = await res.text();
    // 2.1) 渲染该模块内的数学公式（KaTeX）
    renderMath(root);
    // 3) 模块 JS（执行后会通过 register 自我注册）
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = base + 'js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('加载模块脚本失败: ' + base + 'js'));
      document.body.appendChild(s);
    });
    // 4) 装配：init、订阅重绘、登记 resize
    const def = modules[name];
    if (!def) throw new Error('模块未注册: ' + name);
    if (def.init) def.init(root);
    if (def.update) Store.subscribe(s => def.update(s, root));
    if (def.resize) resizers.push(def.resize);
  }

  return { register, load, resizers };
})();
