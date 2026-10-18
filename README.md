# 高中数学几何题互动解析 MVP — Plan V3 收口

对应计划文档：`E:\projects\myDev\高中解析几何单题互动解析_MVP_Plan_V3.md`。本项目为独立 Vite + Vue 3 + TypeScript 工程。
状态：功能 MVP 收口；本轮实际测试与构建结果见 `../../evidence/`。真人实验是进入 Phase 2 的门禁。

---

## 1. 快速开始

```bash
npm install          # 按当前系统安装 esbuild 平台包（见 §6）
npm run dev          # http://127.0.0.1:5273
npm test             # 实际项数以本轮输出为准
npm run typecheck    # vue-tsc
npm run build        # 生产构建
```

---

## 2. 三道路由（右上角标签切换）

| 题 | 定位 | 一致性结论 |
|---|---|---|
| 椭圆 · P(0,3) | **正常解析**：拖 Q 观察 A、B 与两条斜率连续变化，可跳到 Σ=2 | `OK`，witness k = −5/4 |
| 椭圆 · P(0,2) | **退化检测**：原条件无有效解；y=2 只是越过定义域后得到的退化形式候选 | `DEGENERATE_ONLY` / `COINCIDES_WITH_FIXED` |
| 立体几何 · 四棱锥（Experimental） | **附加技术验证，不计当前解析几何 MVP Gate**：题面缺 PA=AD，(1) 不成立 | `GIVEN_MISMATCH`，witness AD = 2 |

三题共用同一套 `math/`、`render/`、组件与状态层，只换 `problems/*.ts` 中的配置对象。

---

## 3. 分层与职责

```text
src/
├── math/            纯函数，零 UI 依赖，可独立测试
│   ├── types.ts         Point / Line / Slope
│   ├── numeric.ts       容差常量、格式化（V2 §6.6.1 / §6.6.5）
│   ├── ellipse.ts       椭圆参数、点在椭圆上、Q(φ) 参数化
│   ├── line.ts          一般式构造/归一化/参数化（禁止 y=kx+b 作内部表示）
│   ├── intersection.ts  直线×椭圆，按参数 s 求根（竖直无特殊分支）
│   ├── slope.ts         三态斜率、null 传播
│   ├── identity.ts      A/B 最近邻身份匹配（V2 §6.6.2）
│   └── validator.ts     四态一致性判定 + 文案生成（V2 §4.6 / §7.7）
├── render/          只读 math 输出，不做数学判断
│   ├── project2d.ts     正交投影、网格、直线延长
│   ├── project3d.ts     相机基、正交投影、slerp、线面角
│   └── occlude.ts       凸多面体面/棱可见性
├── problems/        数据与题目语义，不含渲染
│   ├── types.ts         Problem / Step / StepAssert 契约
│   ├── common.ts        第一问公共步骤（带 assert）
│   ├── ellipseFrame.ts  (椭圆, P, φ) → 一帧全部数学量
│   ├── ellipse-p03-normal.ts / ellipse-p02-conflict.ts
│   ├── pyramid.ts       立体几何模型与步骤
│   ├── pyramidCheck.ts  求证类条件检查（第五态）
│   ├── assert.ts        断言执行器
│   └── registry.ts      题目注册与预计算
├── composables/useGeometryState.ts   全部交互状态
└── components/       六个区块组件
```

**跨层规则（可被代码评审检查）**

1. `math/` 不 import `vue` / `react` / DOM 类型；
2. `render/` 只读 `math/` 输出，不反向影响状态；
3. 组件内不做数学判断，数字一律来自 `math/`；
4. `Step.assert.actual` 必须调用 `math/` 的函数，不能返回字面量。

---

## 4. 原 Plan V2 实现条款对照（历史）

| V2 条款 | 实现位置 | 验证方式 |
|---|---|---|
| §2.3 交互 = 拖 Q，φ 为唯一状态 | `useGeometryState.setPhi` / `problems/ellipseFrame` | `math.spec.ts`「任意 φ 下 Q 在椭圆上」 |
| §2.3 删除 k 滑块；竖直可达 | φ 滑块 0.1°；`line.ts` 一般式 | 「φ=3π/2 时 B≈0 且有 2 交点」 |
| §6.4 斜率三态，null 传播 | `math/slope.ts` | 「Σ 全周为 null」「文本无 NaN/Infinity」 |
| §6.6.1 容差表 | `math/numeric.ts` | 全部断言使用统一常量 |
| §6.6.2 A/B 身份稳定 | `math/identity.ts` | 「720 帧最大位移 < 0.35」「对称不翻转」 |
| §6.6.3 id 规范 | `Step.highlight` 使用 `pt:/seg:/line:/ann:` | 渲染层按 id 取对象 |
| §7.3 SVG + 自研投影 | `render/project2d.ts`、`project3d.ts` | 立体题「隐藏棱判定」「旋转后朝向变化」 |
| §7.5 Step 契约 + assert | `problems/types.ts`、`common.ts` | 每步断言全绿 + 反向用例必失败 |
| §7.6 Problem 契约 | `problems/types.ts` | 换题 = 换配置，组件未改 |
| §7.7 validator 四态 + witness | `math/validator.ts`、`pyramidCheck.ts` | 四态 fixture 全覆盖 |
| §10.1 数学验证 | `test/math.spec.ts`、`pyramid.spec.ts` | 随机 1000 条直线回代 |
| §10.3 UI 验证（可执行部分） | `test/app.spec.ts` | 挂载、切题、文本洁净 |
| §10.4 目标验证 | **需人工执行**，模板见 `validation/subject-template.csv` | —— |

---

## 5. 已知边界与对文档的偏离

这些是实做过程中发现的、文档没覆盖到的事实，如实记录。

### 5.1 切线不在 φ 的像里（新增 `tangentMode`）

Q 只能取椭圆上的点，直线是 PQ。当 φ → P 的参数角时，直线趋于 P 处切线，但**永远取不到**（Q 与 P 重合时直线未定义）。

对 P(0,2)，推导 `k=(4-m²)/4` 要求 `m²≠4`。越过该限制代入 `m=2` 才得到 `k=0`、切线 `y=2`；这是退化形式候选，**不是原条件的解**。它无法用拖 Q 表达，必须单独一个展示模式：`FrameOptions.tangentMode`，取 P 处切线 `x·x₀/a² + y·y₀/b² = 1`，交点自然是 1 个（A=B=P）。第 2.4 步只展示这个候选及其为何无效。

### 5.2 判别式 Δ 不是几何不变量（改用弦长）

教材里写 `Δ = 60`，那是在方程 `(1+2k²)x² + 12kx + 10 = 0` 这个具体写法下的值。换个写法（整体乘一个常数）Δ 就变了。

程序内部用参数 `s` 求根，得到的是另一个 Δ。因此：

- 状态面板显示 **|AB| 弦长**（几何不变量，k=−5/4 时为 3.006）；
- 断言断言弦长而不是 Δ；
- 文档里的 Δ=60 保留，但只作为"该方程写法下的判别式"出现在推导文案里。

这条正是 V2 §6.6.1「相切判定用参数间距而非 Δ 绝对值」的延伸。

### 5.3 Σ=2 有两个等价 φ

同一条直线与椭圆交于 A、B 两点。Q 取 A 或 Q 取 B，生成的直线相同。所以满足 Σ=2 的 φ 有两个：**71.89°（Q=A）与 347.1°（Q=B）**。

validator 返回第一个（71.89°），"跳到 Σ=2"按钮会跳到那里。两者在几何上完全等价。测试断言的是"斜率 = −5/4"而非具体角度。

### 5.4 求证类条件需要第五态 `GIVEN_MISMATCH`

V2 的四态是为"求参数"类条件（求 l 的方程）设计的。立体几何的 (1) 是**求证**题：条件本身可满足，只是当前给定数据（AD=4）不满足。

若不区分，会得出"这道题无解"的错误结论。因此 `pyramidCheck.ts` 增加第五态：

| 状态 | 含义 |
|---|---|
| `OK` | 当前数据满足 |
| `GIVEN_MISMATCH` | 当前数据不满足，但条件可满足（给出 witness AD=2） |
| `EMPTY` | 条件在参数域内恒不成立 |

### 5.5 立体几何辅助线不做遮挡判定

`AE / PE / DE` 不在凸多面体的棱表里，隐藏线定理只说"棱"的可见性。辅助线一律画虚线、不参与遮挡，这是教材上的常见简化。若要做严格遮挡，需要引入深度缓冲或逐段求交，属于 V2 §7.3 判据里"面数多到手工排险太贵"那一档才值得做的事。

### 5.6 交互通道未做成配置

V2 §7.6 的 `Problem.interactions` 在本实现中没有落地：椭圆题的交互固定为「拖 Q + φ 滑块」，立体题固定为「旋转 + AD 滑块」，由题型分支决定。做成配置需要引入动作解释器，收益不明确，因此明确不做，而不是"忘了做"。

### 5.7 §10.4 目标验证未执行

V2 的 Step 9（6–8 名受试者、T/C/M 三指标）需要真人，本实现只交付：

- 判定规则（文档 §1.3）；
- 记录表模板 `validation/subject-template.csv`；
- 页面本身（条件 A 的纯图文版可直接用「题目区 + 静态截图」模拟）。

**在 §10.4 执行之前，不能声称"MVP 已验证有效"**，只能说"功能完成、断言全绿"。

---

## 6. 环境备注

- 首次 `npm install` 曾中断，导致 Windows 的 esbuild 平台包缺失（esbuild 报 `could not be found`）。发布版不再直接依赖 Windows 专用包，由 esbuild 按运行系统安装对应的可选依赖。
- 若重装依赖后提示 esbuild 平台包缺失，先清理不完整的 `node_modules` 并重新执行 `npm ci`。
- 本机 curl 访问 127.0.0.1 会被代理拦（返回 502），验证服务请用浏览器或 `node -e` 直连。

---

## 7. 验证结果（2026-10-17）

| 项 | 结果 |
|---|---|
| `vitest run` | 44 passed / 3 files |
| `vue-tsc --noEmit` | 无错误 |
| `vite build` | 成功，js 381 kB（gzip 123 kB） |
| 数学复核 | 与文档 §4.3 / §4.4 / §4.5 数值一致（k=−5/4、A(0.8793,1.9009)、B(2.7571,−0.4464)、AE·DP=−6、cos θ=1/5） |
