
# target
函数的概念及表示法；函数的有界性、单调性、周期性和奇偶性；复合函数、反函数、分段函数和隐函数；基本初等函数的性质及其图形；初等函数；函数关系的建立；数列极限与函数极限的定义及其性质；函数的左极限和右极限；无穷小量和无穷大量的概念及其关系；无穷小量的性质及无穷小量的比较；极限的四则运算；极限存在的两个准则：单调有界准则和夹逼准则；两个重要极限的证明：

$$
\lim_{x \to 0} \frac{\sin x}{x} = 1, \qquad \lim_{x \to \infty} \left(1 + \frac{1}{x}\right)^{x} = e
$$

函数连续的概念；函数间断点的类型；初等函数的连续性；闭区间上连续函数的性质。

# content

> **阅读约定**
>
> 本文按 `# target` 的条目逐项展开：每个概念先给**数学定义**，再给 **Lean 4 / Mathlib** 写法。
> Lean 代码只展示关键代码，不要求整段编译；所有 Mathlib 名称均写全限定名，并在注释中给出英文全称与中文含义。
> 代码前的 `import` / `open` 是必要的准备工作：

```lean
import Mathlib
-- `import Mathlib`：导入整个 Mathlib 数学库（学习阶段最省事）

open Filter
-- `open Filter`：让 `Tendsto`、`atTop`、`atBot` 等名字无需前缀即可使用

open scoped Topology
-- `open scoped Topology`：打开拓扑记号作用域，才能写 `𝓝`、`𝓝[≠]`、`𝓝[<]`、`𝓝[>]`

open scoped Asymptotics
-- `open scoped Asymptotics`：打开渐近记号作用域，才能写 `=o`、`=O`、`~[l]`
```

---

## 0. 记号对照表

| 数学写法 | Lean 4 / Mathlib 写法 | 说明 |
|---|---|---|
| $x \to x_0$（双侧、去心） | `Tendsto f (𝓝[≠] x₀) (𝓝 L)` | `𝓝` = `nhds`（neighborhoods，邻域滤子）；`𝓝[≠] x₀` = 去心邻域 |
| $x \to x_0^-$ | `Tendsto f (𝓝[<] x₀) (𝓝 L)` | 左极限；`𝓝[<] x₀` = `nhdsWithin x₀ (Set.Iio x₀)` |
| $x \to x_0^+$ | `Tendsto f (𝓝[>] x₀) (𝓝 L)` | 右极限；`𝓝[>] x₀` = `nhdsWithin x₀ (Set.Ioi x₀)` |
| $x \to +\infty$ | `Tendsto f Filter.atTop (𝓝 L)` | `atTop` = 无穷远处的滤子 |
| $x \to -\infty$ | `Tendsto f Filter.atBot (𝓝 L)` | `atBot` = 负无穷远处的滤子 |
| $n \to \infty$ | `Tendsto u Filter.atTop (𝓝 a)` | 数列极限 |
| $\lim f = L$ | `Tendsto f l (𝓝 L)` | 滤子（filter）统一语言 |
| 「最终」$P$ 成立 | `∀ᶠ x in l, P x` | `∀ᶠ` 读作 eventually（最终） |
| $f$ 在 $x_0$ 连续 | `ContinuousAt f x₀` | 极限用 `𝓝 x₀`（含 $x_0$），不是去心邻域 |
| $f$ 连续 | `Continuous f` | 每一点连续 |
| $f$ 在集合 $s$ 上连续 | `ContinuousOn f s` | 每点沿 `𝓝[s] x` 连续 |

**记住三个核心名字**：`Filter.Tendsto`（极限）、`nhds`（邻域）、`Filter.atTop`（趋于正无穷）。

---

## 一、函数

### 1.1 函数的概念及表示法

**定义（函数）.** 设 $D \subseteq \mathbb{R}$。若对每个 $x \in D$，按某一法则 $f$ 都有唯一确定的实数 $y$ 与之对应，则称 $f$ 是定义在 $D$ 上的函数，记作

$$
y = f(x), \qquad x \in D.
$$

- $D$ 称为**定义域**（domain），$f(D) = \{f(x) \mid x \in D\}$ 称为**值域**（range）。
- 函数三要素：**定义域、对应法则、值域**。两个函数相同 ⇔ 定义域相同且对应法则相同（值域随之相同）。

**表示法**：解析法（公式）、表格法、图像法。分段函数也是解析表示法的一种。

```lean
-- 函数就是一个映射 f : α → β；α 是定义域所在的类型，β 是到达的类型
def square (x : ℝ) : ℝ := x ^ 2
-- 这是一个从 ℝ 到 ℝ 的函数，对应法则为 x ↦ x²

-- 把定义域显式限制成集合 D : Set ℝ 时，用子类型（subtype）↥D 表示
def squareOnD (D : Set ℝ) (x : D) : ℝ := (x : ℝ) ^ 2
-- `x : D` 读作“x 是 D 中的元素”；`(x : ℝ)` 把子类型元素强制转回实数

-- Set.graphOn：函数 f 在集合 s 上的图像（graph）
#check Set.graphOn
-- 类型：Set.graphOn (f : α → β) (s : Set α) : Set (α × β)
-- 即图像是序对集合 {(x, f x) | x ∈ s}
```

> **考试要点**：判断两个函数是否相同，先看定义域是否相同。例如 $f(x) = x$ 与 $g(x) = \frac{x^2}{x}$ 不是同一函数（后者定义域不含 $0$）。

---

### 1.2 函数的有界性、单调性、周期性和奇偶性

#### 1.2.1 有界性（boundedness）

**定义.** 设 $f$ 在集合 $s$ 上有定义。若存在 $M > 0$，使

$$
\forall x \in s,\ |f(x)| \le M,
$$

则称 $f$ 在 $s$ 上**有界**；否则称 $f$ 在 $s$ 上**无界**。

等价说法：$f$ 在 $s$ 上有界 ⇔ $f$ 在 $s$ 上既有上界又有下界。无界 ⇔ $\forall M > 0,\ \exists x \in s,\ |f(x)| > M$。

```lean
-- 有界性（boundedness）：存在常数 M 控制 |f x| 的大小
def BoundedOn (f : ℝ → ℝ) (s : Set ℝ) : Prop :=
  ∃ M : ℝ, 0 ≤ M ∧ ∀ x ∈ s, |f x| ≤ M
-- `|f x|` 是实数绝对值（absolute value）

-- Mathlib 中对一般度量空间统一使用 Bornology.IsBounded（bornology = 有界性结构）
#check Bornology.IsBounded
-- 类型：Bornology.IsBounded (s : Set α) : Prop
```

> **例.** $\sin x$ 在 $\mathbb{R}$ 上有界（$|\sin x|\le 1$）；$\frac{1}{x}$ 在 $(0,1)$ 上无界；$x\sin x$ 在 $\mathbb{R}$ 上无界（但不是无穷大，见 2.4）。

#### 1.2.2 单调性（monotonicity）

**定义.** 设 $f$ 在区间 $I$ 上有定义。
- 若 $\forall x_1, x_2 \in I,\ x_1 < x_2 \Rightarrow f(x_1) \le f(x_2)$，称 $f$ **单调递增**；若严格不等式成立，称**严格单调递增**。
- 若 $\forall x_1 < x_2 \Rightarrow f(x_1) \ge f(x_2)$，称**单调递减**；类似定义**严格单调递减**。

**判定**：后续可用导数符号判定（$f' \ge 0$ ⇒ 递增，$f' \le 0$ ⇒ 递减）；定义法通常用于分段函数与抽象函数。

```lean
#check Monotone    -- 单调递增（monotone）：a ≤ b ⇒ f a ≤ f b
#check StrictMono  -- 严格单调递增（strictly monotone）
#check Antitone    -- 单调递减（antitone）：a ≤ b ⇒ f a ≥ f b
#check StrictAnti  -- 严格单调递减（strictly antitone）
```

#### 1.2.3 周期性（periodicity）

**定义.** 若存在常数 $T \ne 0$，使

$$
\forall x \in D,\ f(x + T) = f(x),
$$

则称 $f$ 为**周期函数**，$T$ 为它的一个**周期**。若存在最小的正周期，则称为**最小正周期**。

- $\sin x,\ \cos x$ 的最小正周期为 $2\pi$；
- $\tan x$ 的最小正周期为 $\pi$。

```lean
#check Function.Periodic
-- 类型：Function.Periodic (f : α → β) (c : α) : Prop
-- 含义：∀ x, f (x + c) = f x，即 c 是 f 的一个周期（period）

#check Function.Antiperiodic
-- 反周期（antiperiodic）：f (x + c) = - f x
```

#### 1.2.4 奇偶性（parity）

**定义.** 设定义域关于原点对称。
- 若 $\forall x \in D,\ f(-x) = -f(x)$，称 $f$ 为**奇函数**；图像关于原点对称。
- 若 $\forall x \in D,\ f(-x) = f(x)$，称 $f$ 为**偶函数**；图像关于 $y$ 轴对称。

```lean
#check Function.Odd
-- 奇函数（odd function）：∀ x, f (-x) = - f x

#check Function.Even
-- 偶函数（even function）：∀ x, f (-x) = f x
```

> **常用结论**：奇函数在对称区间上的定积分为 $0$；奇 × 奇 = 偶，偶 × 偶 = 偶，奇 × 偶 = 奇（在公共定义域上）。

---

### 1.3 复合函数、反函数、分段函数和隐函数

#### 1.3.1 复合函数（composite function）

设 $y = f(u)$ 的定义域为 $D_f$，$u = g(x)$ 的定义域为 $D_g$，且 $g(D_g) \subseteq D_f$。则

$$
y = f(g(x)), \qquad x \in D_g
$$

称为由 $f$ 和 $g$ 复合而成的复合函数，记作 $f \circ g$。

```lean
-- 复合（composition）：(g ∘ f) x = g (f x)
#check Function.comp
-- 类型：Function.comp (f : β → δ) (g : α → β) : α → δ

example (f g : ℝ → ℝ) (x : ℝ) : (g ∘ f) x = g (f x) := rfl
-- `rfl`（reflexivity，自反性）：两边按定义相同
```

#### 1.3.2 反函数（inverse function）

设 $f: D \to f(D)$ 是**一一对应**（双射，bijection），则存在反函数 $f^{-1}: f(D) \to D$，满足

$$
f^{-1}(f(x)) = x,\qquad f(f^{-1}(y)) = y.
$$

$y = f(x)$ 与 $y = f^{-1}(x)$ 的图像关于直线 $y = x$ 对称。

**存在条件**：$f$ 严格单调 ⇒ $f$ 是单射，从而在其值域上存在反函数。若 $f$ 还在区间上连续，则 $f^{-1}$ 在值域上也连续。

```lean
#check Function.invFun
-- 反函数（inverse function）的默认构造：Function.invFun (f : α → β) : β → α

#check Function.bijective_iff_has_inverse
-- 双射（bijective）↔ 存在左逆与右逆（left inverse / right inverse）
-- 类型：Function.Bijective f ↔ ∃ g, Function.LeftInverse g f ∧ Function.RightInverse g f
```

#### 1.3.3 分段函数（piecewise function）

在定义域的不同子集上用不同解析式表示的函数。

```lean
-- 分段函数（piecewise function）用 if ... then ... else ... 书写
noncomputable def fOsc (x : ℝ) : ℝ :=
  if x = 0 then 0 else x ^ 2 * Real.sin (1 / x)
-- `noncomputable`：因为用到实数正弦 Real.sin（不可计算函数）
-- 这是经典例子：x ≠ 0 时 f x = x² sin(1/x)，f 0 = 0

-- Set.piecewise：按 x ∈ s 选择 f 或 g，是更一般的分段写法
#check Set.piecewise
-- 类型：Set.piecewise (s : Set α) (f g : (i : α) → β i) [(j : α) → Decidable (j ∈ s)] (i : α) : β i
-- 即 if i ∈ s then f i else g i
```

#### 1.3.4 隐函数（implicit function）

由方程 $F(x,y) = 0$ 确定的函数 $y = \varphi(x)$ 称为**隐函数**。例如 $x^2 + y^2 = 1$ 在局部确定 $y = \pm\sqrt{1-x^2}$。

**隐函数存在定理（了解）**：若 $F$ 在点 $(x_0, y_0)$ 附近有连续偏导数，$F(x_0,y_0)=0$，且 $F_y(x_0,y_0) \ne 0$，则在 $x_0$ 附近唯一确定连续可导的 $y=\varphi(x)$。求导时对两边关于 $x$ 求导并解出 $y'$。

```lean
-- 隐函数（implicit function）：满足方程 F x y = 0 的点 (x, y)
def SatisfiesEquation (F : ℝ → ℝ → ℝ) (x y : ℝ) : Prop :=
  F x y = 0
-- 隐函数存在定理（implicit function theorem）在 Mathlib 中由多元微分理论给出，
-- 本章只需会“由方程解出 y，再求导”
```

---

### 1.4 基本初等函数的性质及其图形

基本初等函数共六类：**常数函数、幂函数、指数函数、对数函数、三角函数、反三角函数**。

| 函数 | 定义域 | 值域 | 图像特征 | Lean 名称 |
|---|---|---|---|---|
| $y=C$ | $\mathbb{R}$ | $\{C\}$ | 水平直线 | `fun _ => C` |
| $y=x^\alpha$ | 视 $\alpha$ 而定（$x>0$ 时总有意义） | 视 $\alpha$ 而定 | $\alpha>0$ 时在 $(0,+\infty)$ 递增；$\alpha<0$ 时递减且有渐近线 | `Real.rpow` |
| $y=a^x\ (a>0,a\ne1)$ | $\mathbb{R}$ | $(0,+\infty)$ | 恒过 $(0,1)$；$a>1$ 递增，$0<a<1$ 递减；$y=0$ 是水平渐近线 | `Real.exp`（$a=e$ 时） |
| $y=\log_a x\ (a>0,a\ne1)$ | $(0,+\infty)$ | $\mathbb{R}$ | 恒过 $(1,0)$；与 $y=a^x$ 互为反函数；$x=0$ 是铅直渐近线 | `Real.log`（$a=e$ 时） |
| $y=\sin x$ | $\mathbb{R}$ | $[-1,1]$ | 周期 $2\pi$，奇函数 | `Real.sin` |
| $y=\cos x$ | $\mathbb{R}$ | $[-1,1]$ | 周期 $2\pi$，偶函数 | `Real.cos` |
| $y=\tan x$ | $x\ne\frac{\pi}{2}+k\pi$ | $\mathbb{R}$ | 周期 $\pi$，奇函数，有铅直渐近线 | `Real.tan` |
| $y=\arcsin x$ | $[-1,1]$ | $\left[-\frac{\pi}{2},\frac{\pi}{2}\right]$ | 严格递增，奇函数 | `Real.arcsin` |
| $y=\arccos x$ | $[-1,1]$ | $[0,\pi]$ | 严格递减 | `Real.arccos` |
| $y=\arctan x$ | $\mathbb{R}$ | $\left(-\frac{\pi}{2},\frac{\pi}{2}\right)$ | 严格递增，奇函数；有两条水平渐近线 | `Real.arctan` |

```lean
#check Real.rpow    -- 实数幂（real power）：Real.rpow (x y : ℝ) : ℝ
#check Real.exp     -- 自然指数函数
#check Real.log     -- 自然对数函数
#check Real.sin
#check Real.cos
#check Real.tan
#check Real.arcsin
#check Real.arccos
#check Real.arctan
#check Real.sinh    -- 双曲正弦（hyperbolic sine），考研偶尔涉及
#check Real.cosh    -- 双曲余弦
```

**常用性质（Lean 中可直接调用）**：

```lean
#check Real.exp_add          -- 指数律：exp (x + y) = exp x * exp y
#check Real.exp_log          -- 互逆：exp (log x) = x（x > 0）
#check Real.log_exp          -- 互逆：log (exp x) = x
#check Real.log_mul          -- 对数律：log (x * y) = log x + log y（x, y > 0）
#check Real.sin_sq_add_cos_sq -- 勾股恒等式：sin² x + cos² x = 1
#check Real.tan_eq_sin_div_cos -- 正切定义：tan x = sin x / cos x
```

> **图像记忆口诀**
> - 指数与对数关于 $y=x$ 对称：指数过 $(0,1)$、以 $x$ 轴为渐近线；对数过 $(1,0)$、以 $y$ 轴为渐近线。
> - $\sin$、$\cos$ 有界振荡；$\tan$ 在每个周期内严格递增并穿过 $0$。
> - $\arcsin$、$\arctan$ 都是奇函数且单调递增；$\arccos$ 单调递减。

---

### 1.5 初等函数

**定义（初等函数）.** 由**基本初等函数**经过**有限次四则运算**（加、减、乘、除）与**有限次复合**所得到的、能用一个解析式表示的函数，称为**初等函数**。

例如

$$
y = \ln(x + \sqrt{1+x^2}),\qquad y = e^{\sin x} + x^2,\qquad y = \frac{\arctan x}{1+x^2}
$$

都是初等函数。

```lean
-- 初等函数（elementary function）示例：exp (sin x) + x²
noncomputable def elementaryExample (x : ℝ) : ℝ :=
  Real.exp (Real.sin x) + x ^ 2
-- 由 exp、sin 复合，再加 x²，属于初等函数
```

> **重要结论**：初等函数在其**定义区间**内连续（见 3.3）。因此求初等函数在其定义域内某点的极限时，可以直接代入。

---

### 1.6 函数关系的建立

建立函数关系的一般步骤：

1. **设变量**：确定自变量与因变量，并写出取值范围；
2. **找关系**：利用几何公式、物理规律或经济关系列等式；
3. **消元**：把因变量写成自变量的表达式；
4. **定定义域**：根据实际意义与表达式本身确定定义域。

**例 1（几何）.** 用长为 $L$ 的篱笆围一个矩形，求面积与一边长的函数关系。

设一边长为 $x$，另一边长为 $\frac{L}{2}-x$，则

$$
S(x) = x\left(\frac{L}{2}-x\right),\qquad 0 < x < \frac{L}{2}.
$$

**例 2（经济）.** 某商品需求函数为 $q = 100 - 2p$（$q$ 为需求量，$p$ 为价格），总成本为 $C(q) = 10q + 200$。求利润关于价格的函数。

收益 $R(p) = p\,q = p(100-2p)$，成本 $C(p) = 10(100-2p) + 200$，故

$$
L(p) = R(p) - C(p) = -2p^2 + 120p - 1200,\qquad 0 < p < 50.
$$

```lean
-- 收益（revenue）= 价格 × 需求量
def revenue (demand : ℝ → ℝ) (p : ℝ) : ℝ := p * demand p
-- `demand : ℝ → ℝ` 是需求函数（demand function），把价格映为需求量

-- 利润（profit）= 收益 − 成本
def profit (revenue cost : ℝ → ℝ) (q : ℝ) : ℝ := revenue q - cost q
```

> **考试要点**：建立函数关系后，一定写出**定义域**；应用题的最值问题往往要先确定定义区间，再用导数或均值不等式求最值。

---

## 二、极限

### 2.1 数列极限的定义与性质

#### 2.1.1 定义（ε-N 语言）

**定义.** 设 $\{u_n\}$ 为数列，$a$ 为常数。若对任意 $\varepsilon > 0$，总存在正整数 $N$，使得当 $n > N$ 时都有

$$
|u_n - a| < \varepsilon,
$$

则称数列 $\{u_n\}$ **收敛于** $a$，记作 $\lim_{n\to\infty} u_n = a$；否则称数列**发散**。

几何意义：$a$ 的任意 $\varepsilon$ 邻域之外，数列至多有有限项。

```lean
-- 数列极限（limit of a sequence）的 ε-N 定义
def SeqLimit (u : ℕ → ℝ) (a : ℝ) : Prop :=
  ∀ ε : ℝ, 0 < ε → ∃ N : ℕ, ∀ n : ℕ, N ≤ n → |u n - a| < ε
-- `∀ n : ℕ, N ≤ n → ...` 读作“对所有 n ≥ N 都有 ...”

-- Mathlib 用滤子（filter）语言统一写极限：u → a 记作 Tendsto u atTop (𝓝 a)
#check Filter.Tendsto
#check Filter.atTop          -- 正无穷远处的滤子（at top）
#check nhds                  -- 邻域滤子（neighborhoods）
#check Metric.tendsto_atTop
-- Metric.tendsto_atTop 把滤子写法展开成 ε-N：
-- Tendsto u atTop (𝓝 a) ↔ ∀ ε > 0, ∃ N, ∀ n ≥ N, dist (u n) a < ε
```

#### 2.1.2 收敛数列的性质

1. **唯一性**：若数列收敛，则极限唯一。
2. **有界性**：收敛数列必有界（反之不成立，如 $(-1)^n$）。
3. **保号性**：若 $\lim u_n = a > 0$，则存在 $N$，当 $n > N$ 时 $u_n > 0$。若从某项起 $u_n \ge 0$ 且极限存在，则 $a \ge 0$。
4. **保不等式性**：若从某项起 $u_n \le v_n$，且两数列都收敛，则 $\lim u_n \le \lim v_n$。
5. **子列性质**：若 $\{u_n\}$ 收敛于 $a$，则它的任意子列也收敛于 $a$。
6. **四则运算**：见 2.6。

```lean
-- 唯一性（uniqueness）：同一个数列不可能收敛到两个不同的实数
#check tendsto_nhds_unique
-- 类型：Tendsto f l (𝓝 a) → Tendsto f l (𝓝 b) → a = b（需要 l.NeBot）

-- 保号性（sign preservation）：极限 a > 0 ⇒ 最终 u n > 0
example (u : ℕ → ℝ) (a : ℝ) (ha : 0 < a)
    (h : Tendsto u Filter.atTop (nhds a)) :
    ∀ᶠ n in Filter.atTop, 0 < u n :=
  h.eventually (isOpen_Ioi.mem_nhds ha)
-- `h.eventually`：若目标集合是极限 a 的邻域，则最终落入该集合
-- `isOpen_Ioi.mem_nhds ha`：0 < a ⇒ Set.Ioi 0 是 a 的邻域

-- 收敛 ⇒ 有界（convergent ⇒ bounded）
example (u : ℕ → ℝ) (a : ℝ)
    (h : Tendsto u Filter.atTop (nhds a)) :
    ∃ M : ℝ, ∀ n, |u n| ≤ M := by
  -- 思路：取 ε = 1，只有有限项落在 a 的 1-邻域外，
  -- 用这有限项的最大值与 |a| + 1 作界
  sorry
```

---

### 2.2 函数极限的定义与性质

#### 2.2.1 $x \to x_0$ 时的极限（ε-δ 语言）

**定义.** 设 $f$ 在 $x_0$ 的某去心邻域内有定义。若对任意 $\varepsilon > 0$，存在 $\delta > 0$，使得当

$$
0 < |x - x_0| < \delta
$$

时都有

$$
|f(x) - L| < \varepsilon,
$$

则称 $x \to x_0$ 时 $f(x)$ 的极限为 $L$，记作 $\lim_{x\to x_0} f(x) = L$。

**注意**：极限与 $f(x_0)$ 是否有定义、等于多少**无关**。

```lean
-- 函数极限（limit of a function）在 x₀ 处的 ε-δ 定义（去心邻域）
def FunLimitAt (f : ℝ → ℝ) (x₀ L : ℝ) : Prop :=
  ∀ ε : ℝ, 0 < ε → ∃ δ : ℝ, 0 < δ ∧
    ∀ x : ℝ, x ≠ x₀ → |x - x₀| < δ → |f x - L| < ε

-- 滤子写法：Tendsto f (𝓝[≠] x₀) (𝓝 L)，其中 𝓝[≠] x₀ 是去心邻域
#check Metric.tendsto_nhds
-- 类型：Tendsto u f (𝓝 a) ↔ ∀ ε > 0, ∀ᶠ x in f, dist (u x) a < ε
```

#### 2.2.2 $x \to \infty$ 时的极限

**定义.** 若对任意 $\varepsilon > 0$，存在 $X > 0$，当 $|x| > X$ 时 $|f(x) - L| < \varepsilon$，则称 $\lim_{x\to\infty} f(x) = L$。类似可定义 $x \to +\infty$ 与 $x \to -\infty$。

```lean
-- x → +∞：Tendsto f Filter.atTop (𝓝 L)
def FunLimitAtTop (f : ℝ → ℝ) (L : ℝ) : Prop :=
  ∀ ε : ℝ, 0 < ε → ∃ X : ℝ, ∀ x : ℝ, X < x → |f x - L| < ε

-- x → −∞：把 Filter.atTop 换成 Filter.atBot
-- x → ∞（双侧）：可用 Filter.atTop ⊔ Filter.atBot 或写成 |x| > X 的形式
```

#### 2.2.3 函数极限的性质

与数列极限完全平行：

1. **唯一性**：极限存在则唯一。
2. **局部有界性**：若 $\lim_{x\to x_0} f(x) = L$，则 $f$ 在 $x_0$ 的某去心邻域内有界。
3. **局部保号性**：若 $L > 0$，则在 $x_0$ 的某去心邻域内 $f(x) > 0$。
4. **四则运算**：见 2.6。
5. **复合运算**：若 $f(x) \to a$（$x \to x_0$），且 $g$ 在 $a$ 处连续，则 $g(f(x)) \to g(a)$。
6. **归结原则（Heine 定理）**：$\lim_{x\to x_0} f(x) = L$ ⇔ 对任意满足 $x_n \ne x_0$、$x_n \to x_0$ 的数列，都有 $f(x_n) \to L$。

```lean
-- 局部有界性（local boundedness）
example (f : ℝ → ℝ) (x₀ L : ℝ)
    (h : Tendsto f (𝓝[≠] x₀) (𝓝 L)) :
    ∃ M : ℝ, ∀ᶠ x in 𝓝[≠] x₀, |f x| ≤ M := by
  -- 取 ε = 1：最终 |f x − L| < 1，于是 |f x| ≤ |L| + 1
  sorry

-- 局部保号性（local sign preservation）
example (f : ℝ → ℝ) (x₀ L : ℝ) (hL : 0 < L)
    (h : Tendsto f (𝓝[≠] x₀) (𝓝 L)) :
    ∀ᶠ x in 𝓝[≠] x₀, 0 < f x :=
  h.eventually (isOpen_Ioi.mem_nhds hL)

-- 复合极限（composition of limits）
example (f : ℝ → ℝ) (g : ℝ → ℝ) (x₀ a : ℝ)
    (hf : Tendsto f (𝓝[≠] x₀) (𝓝 a)) (hg : ContinuousAt g a) :
    Tendsto (g ∘ f) (𝓝[≠] x₀) (𝓝 (g a)) :=
  Filter.Tendsto.comp hg hf
-- 这里要写全限定名 `Filter.Tendsto.comp`：
-- `hg.comp hf` 会被解析成 `ContinuousAt.comp`，它要求 hf 也是 ContinuousAt
-- `ContinuousAt g a` 定义上就是 `Tendsto g (𝓝 a) (𝓝 (g a))`，所以可传给 Filter.Tendsto.comp

-- 归结原则（sequential criterion / Heine theorem）
#check Filter.tendsto_iff_seq_tendsto
#check tendsto_nhds_iff_seq_tendsto
-- 前者是滤子版本；后者专门陈述 𝓝 版本：
-- Tendsto f (𝓝 a) (𝓝 b) ↔ ∀ u : ℕ → X, Tendsto u atTop (𝓝 a) → Tendsto (f ∘ u) atTop (𝓝 b)
```

> **用归结原则证明极限不存在**：找出两个都趋于 $x_0$ 的数列 $\{x_n\}$、$\{y_n\}$，使 $f(x_n)$ 与 $f(y_n)$ 的极限不同。例如 $\sin\frac{1}{x}$ 在 $x \to 0$ 时不存在极限（见 3.2 振荡间断点）。

---

### 2.3 函数的左极限和右极限

**定义.**
- **左极限**：$x$ 从 $x_0$ 的左侧趋于 $x_0$，记作 $\lim_{x\to x_0^-} f(x)$ 或 $f(x_0^-)$；
- **右极限**：$x$ 从 $x_0$ 的右侧趋于 $x_0$，记作 $\lim_{x\to x_0^+} f(x)$ 或 $f(x_0^+)$。

**定理（极限存在的充要条件）.**

$$
\lim_{x\to x_0} f(x) = L \iff \lim_{x\to x_0^-} f(x) = \lim_{x\to x_0^+} f(x) = L.
$$

```lean
-- 左极限（left limit）用滤子 𝓝[<] x₀ 表示
-- 右极限（right limit）用滤子 𝓝[>] x₀ 表示
-- 双侧去心极限用 𝓝[≠] x₀ 表示

example (f : ℝ → ℝ) (x₀ L : ℝ) :
    Tendsto f (𝓝[≠] x₀) (𝓝 L) ↔
      (Tendsto f (𝓝[<] x₀) (𝓝 L) ∧ Tendsto f (𝓝[>] x₀) (𝓝 L)) := by
  -- 关键等式：𝓝[≠] x₀ = 𝓝[<] x₀ ⊔ 𝓝[>] x₀
  -- 由 nhdsWithin_union 与 Set.Iio x₀ ∪ Set.Ioi x₀ = {x₀}ᶜ 得到
  -- 再用 Filter.tendsto_sup：
  --   Tendsto f (l₁ ⊔ l₂) m ↔ Tendsto f l₁ m ∧ Tendsto f l₂ m
  sorry
```

```lean
#check nhdsWithin_union
-- 𝓝[s ∪ t] a = 𝓝[s] a ⊔ 𝓝[t] a（⊔ 是滤子的并 / 上确界）

#check Filter.tendsto_sup
-- Tendsto f (x₁ ⊔ x₂) y ↔ Tendsto f x₁ y ∧ Tendsto f x₂ y
-- `sup` = 上确界（supremum），这里指两个滤子的并
```

**例（符号函数）.** 设

$$
f(x)=
\begin{cases}
-1, & x<0,\\
0, & x=0,\\
1, & x>0.
\end{cases}
$$

则 $f(0^-)=-1$，$f(0^+)=1$，左右极限不相等，故 $\lim_{x\to0}f(x)$ 不存在。

```lean
-- 符号函数（sign function）的简化写法：0 处取 1 也可看出左右极限不同
noncomputable def signExample (x : ℝ) : ℝ := if x < 0 then -1 else 1
```

> **考试要点**：分段函数在分界点处求极限、判断连续性、判断可导性，都必须先算左右极限。

---

### 2.4 无穷小量与无穷大量

#### 2.4.1 定义

**无穷小量（infinitesimal）.** 若 $\lim f(x) = 0$（在相应极限过程下），则称 $f(x)$ 为该过程下的无穷小量。

**无穷大量（infinite quantity）.** 若 $|f(x)| \to +\infty$，则称 $f(x)$ 为无穷大量（正无穷大或负无穷大视符号而定）。

```lean
-- 无穷小量（infinitesimal）：沿滤子 l 收敛到 0
def Infinitesimal (f : ℝ → ℝ) (l : Filter ℝ) : Prop :=
  Tendsto f l (𝓝 0)

-- 正无穷大（positive infinite）：沿 l 趋于 +∞
def InfinitePos (f : ℝ → ℝ) (l : Filter ℝ) : Prop :=
  Tendsto f l Filter.atTop

-- 负无穷大（negative infinite）：沿 l 趋于 −∞
def InfiniteNeg (f : ℝ → ℝ) (l : Filter ℝ) : Prop :=
  Tendsto f l Filter.atBot
```

#### 2.4.2 无穷小与无穷大的关系

在同一极限过程下（且 $f(x) \ne 0$）：

$$
f(x) \to \infty \iff \frac{1}{f(x)} \to 0; \qquad f(x) \to 0 \iff \frac{1}{|f(x)|} \to +\infty.
$$

注意单侧符号：$f(x) \to 0^+$ 时 $\frac{1}{f(x)} \to +\infty$；$f(x) \to 0^-$ 时 $\frac{1}{f(x)} \to -\infty$。

```lean
-- 无穷大取倒数是无穷小
#check Filter.Tendsto.inv_tendsto_atTop
-- f → +∞ ⇒ f⁻¹ → 0
#check Filter.Tendsto.inv_tendsto_atBot
-- f → −∞ ⇒ f⁻¹ → 0

-- 单侧无穷小取倒数是单侧无穷大
#check Filter.Tendsto.inv_tendsto_nhdsGT_zero
-- f → 0⁺ ⇒ f⁻¹ → +∞（nhdsGT = nhds greater than，右侧邻域）
#check Filter.Tendsto.inv_tendsto_nhdsLT_zero
-- f → 0⁻ ⇒ f⁻¹ → −∞（nhdsLT = nhds less than，左侧邻域）
```

#### 2.4.3 无穷小的性质

1. 有限个无穷小之和仍是无穷小；
2. 有限个无穷小之积仍是无穷小；
3. **有界函数 × 无穷小 = 无穷小**；
4. 常数 $0$ 是唯一的常数无穷小；
5. 无穷小是**变量**，不是“很小的数”（$10^{-100}$ 不是无穷小，$0$ 才是）。

```lean
-- 有限个无穷小之和、积仍是无穷小（直接来自极限四则运算）
#check Filter.Tendsto.add
#check Filter.Tendsto.mul
-- 常数乘无穷小还是无穷小
#check Filter.Tendsto.const_mul

-- 有界函数乘无穷小仍是无穷小
example (f g : ℝ → ℝ) (l : Filter ℝ)
    (hg : Tendsto g l (𝓝 0))
    (hf : ∃ M : ℝ, ∀ x, |f x| ≤ M) :
    Tendsto (fun x => f x * g x) l (𝓝 0) := by
  -- 思路：|f x * g x| = |f x| * |g x| ≤ M * |g x| → 0
  -- 用夹逼（squeeze_zero_norm 或 tendsto_of_tendsto_of_tendsto_of_le_of_le'）
  sorry
```

**例.** $\lim_{x\to0} x\sin\frac{1}{x} = 0$，因为 $x$ 是无穷小，$\sin\frac{1}{x}$ 有界。

#### 2.4.4 无穷大与无界的区别

- **无穷大 ⇒ 无界**；
- **无界 ⇏ 无穷大**。例如 $f(x) = x\sin x$ 在 $x\to+\infty$ 时无界，但不趋于 $+\infty$（因为函数值会反复回到 $0$）。

> **易错点**：无穷大量是极限概念（趋于 $\pm\infty$），无界只是“不能被一个常数控制”。二者不要混淆。

#### 2.4.5 极限与无穷小的关系

$$
\lim f(x) = A \iff f(x) = A + \alpha(x),\quad \alpha(x) \text{ 是无穷小}.
$$

```lean
-- 极限与无穷小的关系：f → A ⇔ f − A 是无穷小
example (f : ℝ → ℝ) (l : Filter ℝ) (A : ℝ) :
    Tendsto f l (𝓝 A) ↔ Infinitesimal (fun x => f x - A) l := by
  constructor
  · -- 正向：f → A，常数 A → A，相减得 f − A → 0
    intro h
    simpa using h.sub (tendsto_const_nhds (x := A))
  · -- 反向：(f − A) → 0，再加常数 A，得 f → A
    intro h
    simpa using h.add (tendsto_const_nhds (x := A))
-- `tendsto_const_nhds`：常函数收敛到该常数
-- 常数用 `(x := A)` 显式指定，否则 Lean 可能推断不出是哪个常数
```

---

### 2.5 无穷小量的比较与等价无穷小

#### 2.5.1 比较的定义

设 $\alpha, \beta$ 是同一极限过程下的无穷小，且 $\beta \ne 0$：

| 条件 | 名称 | 记号 | 含义 |
|---|---|---|---|
| $\lim \frac{\alpha}{\beta} = 0$ | $\alpha$ 是比 $\beta$ **高阶**的无穷小 | $\alpha = o(\beta)$ | $\alpha$ 趋于 $0$ 更快 |
| $\lim \frac{\alpha}{\beta} = \infty$ | $\alpha$ 是比 $\beta$ **低阶**的无穷小 | $\beta = o(\alpha)$ | $\alpha$ 趋于 $0$ 更慢 |
| $\lim \frac{\alpha}{\beta} = c \ne 0$ | $\alpha$ 与 $\beta$ **同阶** | $\alpha = O(\beta)$ | 趋于 $0$ 的速度相当 |
| $\lim \frac{\alpha}{\beta} = 1$ | $\alpha$ 与 $\beta$ **等价** | $\alpha \sim \beta$ | 主部相同 |

```lean
-- 渐近记号（asymptotic notation）：
#check Asymptotics.IsLittleO
-- f =o[l] g：little-o，f 是比 g 高阶的无穷小（f/g → 0）

#check Asymptotics.IsBigO
-- f =O[l] g：big-O，f 被 g 的常数倍控制

#check Asymptotics.IsTheta
-- f =Θ[l] g：Theta，f 与 g 同阶（双向 big-O）

#check Asymptotics.IsEquivalent
-- f ~[l] g：等价无穷小（equivalent）

#check Asymptotics.isEquivalent_iff_tendsto_one
-- 等价 ↔ 商趋于 1：IsEquivalent l u v ↔ Tendsto (u / v) l (𝓝 1)
-- 前提：v 最终非零（hz : ∀ᶠ x in l, v x ≠ 0）

#check Asymptotics.IsEquivalent.tendsto_nhds_iff
-- 等价替换（replacement）：u ~ v ⇒ (u → c ↔ v → c)
-- 这是“求极限时可用等价无穷小替换”的严格依据
```

#### 2.5.2 常用等价无穷小（$x \to 0$）

$$
\begin{aligned}
&\sin x \sim x, &&\tan x \sim x, &&\arcsin x \sim x, &&\arctan x \sim x,\\
&1-\cos x \sim \frac{x^2}{2}, &&\ln(1+x) \sim x, &&e^x-1 \sim x,\\
&a^x-1 \sim x\ln a, &&(1+x)^\alpha - 1 \sim \alpha x,\\
&\tan x - \sin x \sim \frac{x^3}{2}, &&x-\sin x \sim \frac{x^3}{6}, &&\ln(1+x)-x \sim -\frac{x^2}{2}.
\end{aligned}
$$

```lean
-- Mathlib 中直接给出的两个基本极限：
#check Real.tendsto_sin_div_nhdsNE_zero
-- sin x / x → 1（x → 0，去心邻域），即 sin x ~ x
#check Real.tendsto_one_sub_cos_div_nhdsNE_zero
-- (1 − cos x) / x → 0；再结合 1 − cos x = 2 sin²(x/2)，可得 (1 − cos x)/x² → 1/2
```

#### 2.5.3 等价无穷小替换法则

**定理.** 若在同一极限过程下 $\alpha \sim \alpha'$，$\beta \sim \beta'$，且 $\lim \frac{\alpha'}{\beta'}$ 存在（或为 $\infty$），则

$$
\lim \frac{\alpha}{\beta} = \lim \frac{\alpha'}{\beta'}.
$$

**使用限制**：
- 等价替换适用于**乘除**因子；
- **加减法中一般不能直接替换**（可能丢失主部），应先提取公因子或因式分解。

**例 1.** 求 $\displaystyle\lim_{x\to0}\frac{\tan x-\sin x}{x^3}$。

解：

$$
\tan x-\sin x=\sin x\left(\frac{1}{\cos x}-1\right)=\sin x\cdot\frac{1-\cos x}{\cos x}.
$$

当 $x\to0$ 时，$\sin x\sim x$，$1-\cos x\sim\frac{x^2}{2}$，$\cos x\to1$，故

$$
\lim_{x\to0}\frac{\tan x-\sin x}{x^3}
=\lim_{x\to0}\frac{x\cdot\frac{x^2}{2}}{x^3}=\frac12.
$$

**错误示范**：若直接写 $\tan x\sim x$、$\sin x\sim x$，得到 $0$，这是错误的（减法中不能直接替换）。

**例 2.** $\displaystyle\lim_{x\to0}\frac{e^{2x}-1}{\sin 3x}=\lim_{x\to0}\frac{2x}{3x}=\frac23$。

**例 3.** $\displaystyle\lim_{x\to0}\frac{1-\cos x}{x\sin x}=\lim_{x\to0}\frac{x^2/2}{x\cdot x}=\frac12$。

```lean
-- 例 1 的 Lean 语句（示意）
example : Tendsto (fun x : ℝ => (Real.tan x - Real.sin x) / x ^ 3)
    (𝓝[≠] (0 : ℝ)) (𝓝 (1 / 2)) := by
  -- 证明：tan x − sin x = sin x (1 − cos x)/cos x
  -- 再用等价无穷小 sin x ~ x、1 − cos x ~ x²/2、cos x → 1
  sorry
```

---

### 2.6 极限的四则运算

**定理.** 设在同一极限过程下 $\lim f(x) = A$，$\lim g(x) = B$（$A, B$ 为有限数），则

$$
\begin{aligned}
\lim (f \pm g) &= A \pm B,\\
\lim (f g) &= A B,\\
\lim \frac{f}{g} &= \frac{A}{B}\quad (B \ne 0),\\
\lim (c f) &= cA,\qquad \lim f^n = A^n.
\end{aligned}
$$

**注意**：
- 前提是**每个极限都存在且有限**；若一个是无穷大、另一个是无穷小，不能直接套公式；
- 分母极限为 $0$ 时不能直接使用商的法则；
- 常见未定式：$\frac00,\ \frac{\infty}{\infty},\ \infty-\infty,\ 0\cdot\infty,\ 1^\infty,\ \infty^0,\ 0^0$。这些需要变形（因式分解、有理化、等价无穷小、洛必达法则等）。

```lean
-- 极限四则运算（limit arithmetic）
#check Filter.Tendsto.add   -- f → a, g → b ⇒ f + g → a + b
#check Filter.Tendsto.sub   -- f → a, g → b ⇒ f − g → a − b
#check Filter.Tendsto.mul   -- f → a, g → b ⇒ f * g → a * b
#check Filter.Tendsto.div   -- f → a, g → b, b ≠ 0 ⇒ f / g → a / b
#check Filter.Tendsto.const_mul -- 常数乘：b * f → b * a
#check Filter.Tendsto.pow   -- f → a ⇒ f^n → a^n
#check Filter.Tendsto.inv₀  -- f → a, a ≠ 0 ⇒ f⁻¹ → a⁻¹
#check Filter.Tendsto.neg   -- f → a ⇒ −f → −a
#check tendsto_const_nhds   -- 常函数 → 该常数
#check tendsto_id           -- 恒等函数 x ↦ x 在任意滤子下收敛到自身极限
```

**例 1.** $\displaystyle\lim_{x\to2}\frac{x^2-4}{x-2}=\lim_{x\to2}(x+2)=4$（先因式分解，约去 $x-2$）。

**例 2.** $\displaystyle\lim_{n\to\infty}\frac{2n^2+3n-1}{n^2+1}=2$（分子分母同除以 $n^2$）。

```lean
-- 例 1 的 Lean 写法（在去心邻域上函数与 x + 2 最终相等）
example : Tendsto (fun x : ℝ => (x ^ 2 - 4) / (x - 2))
    (𝓝[≠] (2 : ℝ)) (𝓝 4) := by
  -- 在 x ≠ 2 时，(x² − 4)/(x − 2) = x + 2
  -- 再用连续函数 x ↦ x + 2 的极限值
  sorry
```

> **考试要点**：先判断是否为未定式；不是未定式就直接用四则运算，是未定式再选方法变形。

---

### 2.7 极限存在的两个准则

#### 2.7.1 单调有界准则

**定理（单调有界准则）.** 单调递增且有上界的数列必收敛，且极限等于其上确界；单调递减且有下界的数列必收敛，且极限等于其下确界。

用 Lean 陈述：

```lean
-- 单调有界准则（monotone bounded convergence theorem）
#check tendsto_atTop_ciSup
-- 类型：Monotone f → BddAbove (Set.range f) → Tendsto f atTop (𝓝 (⨆ i, f i))
-- 读法：若 f 单调递增且值域有上界，则 f n 收敛到上确界 ⨆ i, f i
-- `BddAbove` = bounded above（有上界）
-- `⨆` = 上确界记号（supremum），`⨅` = 下确界（infimum）

#check tendsto_atBot_ciInf
-- 对偶版本：单调函数有下界时，沿 atBot 收敛到下确界 ⨅ i, f i
```

**单调递减情形**：若 $\{u_n\}$ 单调递减且有下界，令 $v_n = -u_n$，则 $\{v_n\}$ 单调递增且有上界，由准则收敛，从而 $\{u_n\}$ 也收敛。

**例（递推数列）.** 设 $a_0 = \sqrt{2}$，$a_{n+1} = \sqrt{2 + a_n}$。证明 $\{a_n\}$ 收敛并求极限。

证明提纲：
1. **有界性**：归纳证明 $a_n \le 2$。$a_0=\sqrt2\le2$；若 $a_n\le2$，则 $a_{n+1}=\sqrt{2+a_n}\le\sqrt4=2$。
2. **单调性**：归纳证明 $a_n \le a_{n+1}$。$a_0=\sqrt2 \le \sqrt{2+\sqrt2}=a_1$；若 $a_n\le a_{n+1}$，则 $a_{n+1}=\sqrt{2+a_n}\le\sqrt{2+a_{n+1}}=a_{n+2}$。
3. **收敛**：单调递增且有上界，由单调有界准则收敛。设极限为 $L$。
4. **求极限**：对递推式两边取极限，$L=\sqrt{2+L}$，解得 $L=2$ 或 $L=-1$。因 $a_n \ge 0$，故 $L=2$。

```lean
-- 递推数列 a₀ = √2，a_{n+1} = √(2 + aₙ)
noncomputable def a : ℕ → ℝ
  | 0 => Real.sqrt 2
  | n + 1 => Real.sqrt (2 + a n)
-- 证明思路见上；关键工具是 tendsto_atTop_ciSup 与连续性（开方保持极限）
```

> **考试要点**：单调有界准则必须同时验证**单调**与**有界**；常用于递推数列、$e$ 的存在性证明。

#### 2.7.2 夹逼准则

**定理（夹逼准则 / squeeze theorem）.** 若在同一极限过程下

$$
g(x) \le f(x) \le h(x) \quad(\text{最终成立}),\qquad \lim g(x)=\lim h(x)=a,
$$

则

$$
\lim f(x)=a.
$$

```lean
-- 夹逼准则（squeeze theorem）
#check tendsto_of_tendsto_of_tendsto_of_le_of_le'
-- 类型（最终不等式版）：
-- Tendsto g b (𝓝 a) → Tendsto h b (𝓝 a) →
--   (∀ᶠ x in b, g x ≤ f x) → (∀ᶠ x in b, f x ≤ h x) →
--   Tendsto f b (𝓝 a)
#check tendsto_of_tendsto_of_tendsto_of_le_of_le
-- 逐点不等式版本（不带撇）：g ≤ f ≤ h 对每个点成立

#check squeeze_zero
-- 特例：0 ≤ f ≤ g 且 g → 0 ⇒ f → 0
#check squeeze_zero_norm
-- 范数版本：‖f x‖ ≤ a x 且 a → 0 ⇒ f → 0
```

**例.** 求 $\displaystyle\lim_{n\to\infty}\sum_{k=1}^{n}\frac{1}{\sqrt{n^2+k}}$。

解：对每个 $k=1,\dots,n$，

$$
\frac{1}{\sqrt{n^2+n}}\le \frac{1}{\sqrt{n^2+k}}\le \frac{1}{\sqrt{n^2+1}}.
$$

因此

$$
\frac{n}{\sqrt{n^2+n}}\le \sum_{k=1}^{n}\frac{1}{\sqrt{n^2+k}}\le \frac{n}{\sqrt{n^2+1}}.
$$

而

$$
\lim_{n\to\infty}\frac{n}{\sqrt{n^2+n}}=\lim_{n\to\infty}\frac{n}{\sqrt{n^2+1}}=1,
$$

由夹逼准则，原极限为 $1$。

> **考试要点**：夹逼准则的关键是找到**两个极限相同的界**；常用放缩技巧：分母放大/缩小、$n$ 项相同项替代、$\sin$ 有界等。

---

### 2.8 两个重要极限及其证明

#### 2.8.1 第一个重要极限

$$
\lim_{x\to0}\frac{\sin x}{x}=1.
$$

**证明.**

**第一步：几何不等式.** 当 $0 < x < \frac{\pi}{2}$ 时，在单位圆中比较三角形与扇形面积，可得

$$
\sin x < x < \tan x.
$$

**第二步：夹逼.** 因为 $x>0$ 时 $\sin x>0$，三边同除以 $\sin x$：

$$
1 < \frac{x}{\sin x} < \frac{1}{\cos x}
\quad\Longrightarrow\quad
\cos x < \frac{\sin x}{x} < 1.
$$

**第三步：取极限.** 当 $x\to0^+$ 时，$\cos x\to1$，由夹逼准则得 $\lim_{x\to0^+}\frac{\sin x}{x}=1$。

**第四步：左极限.** $\frac{\sin x}{x}$ 是偶函数（$\frac{\sin(-x)}{-x}=\frac{\sin x}{x}$），故左极限也等于 $1$。因此双侧极限为 $1$。

```lean
-- 第一个重要极限（the first important limit）
#check Real.tendsto_sin_div_nhdsNE_zero
-- 类型：Tendsto (fun x : ℝ => sin x / x) (𝓝[≠] 0) (𝓝 1)

-- 证明中用到的两个不等式：
#check Real.sin_lt
-- 类型：0 < x → sin x < x
#check Real.lt_tan
-- 类型：0 < x → x < π/2 → x < tan x
```

**常用推论**（$x\to0$）：

$$
\lim_{x\to0}\frac{\tan x}{x}=1,\qquad
\lim_{x\to0}\frac{1-\cos x}{x^2}=\frac12,\qquad
\lim_{x\to0}\frac{\arcsin x}{x}=1,\qquad
\lim_{x\to0}\frac{\arctan x}{x}=1.
$$

```lean
-- 由第一个重要极限可直接得到：
#check Real.tendsto_one_sub_cos_div_nhdsNE_zero
-- (1 − cos x)/x → 0（进一步可得 (1 − cos x)/x² → 1/2）
```

**例.**

$$
\displaystyle\lim_{x\to0}\frac{1-\cos 2x}{x^2}
=\lim_{x\to0}\frac{\frac{(2x)^2}{2}}{x^2}=2.
$$

#### 2.8.2 第二个重要极限

$$
\lim_{x\to\infty}\left(1+\frac{1}{x}\right)^x=e.
$$

**证明思路（先证数列情形，再推广到实数）.**

**第一步：数列单调性.** 令 $a_n=\left(1+\frac1n\right)^n$。由二项式展开

$$
a_n=\sum_{k=0}^{n}\binom{n}{k}\frac{1}{n^k}
=\sum_{k=0}^{n}\frac{1}{k!}\prod_{j=1}^{k-1}\left(1-\frac{j}{n}\right).
$$

对固定的 $k$，每个因子 $1-\frac{j}{n}$ 随 $n$ 增大而增大；且 $n$ 增大时和式还多出正项。因此 $\{a_n\}$ **单调递增**。

**第二步：有界性.**

$$
a_n\le \sum_{k=0}^{n}\frac{1}{k!}
\le 1+1+\frac12+\frac14+\cdots<3.
$$

故 $\{a_n\}$ 有上界。

**第三步：定义 $e$.** 由单调有界准则，$\{a_n\}$ 收敛，定义

$$
e=\lim_{n\to\infty}\left(1+\frac1n\right)^n.
$$

**第四步：推广到实数 $x\to+\infty$.** 设 $n=\lfloor x\rfloor$，则 $n\le x<n+1$，于是

$$
\left(1+\frac{1}{n+1}\right)^n
\le \left(1+\frac1x\right)^x
\le \left(1+\frac1n\right)^{n+1}.
$$

左边 $=\left(1+\frac{1}{n+1}\right)^{n+1}\big/\left(1+\frac{1}{n+1}\right)\to e$；右边 $=\left(1+\frac1n\right)^n\left(1+\frac1n\right)\to e$。由夹逼准则，$x\to+\infty$ 时极限为 $e$。

**第五步：$x\to-\infty$.** 令 $t=-x\to+\infty$，则

$$
\left(1+\frac1x\right)^x
=\left(1-\frac1t\right)^{-t}
=\left(\frac{t}{t-1}\right)^t
=\left(1+\frac{1}{t-1}\right)^{t-1}\left(1+\frac{1}{t-1}\right)\to e.
$$

**等价形式**：

$$
\lim_{x\to0}(1+x)^{1/x}=e,\qquad
\lim_{x\to\infty}\left(1+\frac{a}{x}\right)^x=e^a.
$$

```lean
-- 第二个重要极限（the second important limit）
#check Real.exp
-- e = Real.exp 1（自然指数在 1 处的值）

#check Real.tendsto_one_add_div_pow_exp
-- 类型：Tendsto (fun n : ℕ => (1 + t/n) ^ n) atTop (𝓝 (exp t))
-- 即 n → ∞ 时 (1 + t/n)^n → e^t（数列版本）

#check Real.tendsto_one_add_div_rpow_exp
-- 类型：Tendsto (fun x : ℝ => (1 + t/x) ^ x) atTop (𝓝 (exp t))
-- 即 x → ∞ 时 (1 + t/x)^x → e^t（实数版本）

#check Real.tendsto_mul_log_one_add_div_atTop
-- 类型：Tendsto (fun x : ℝ => x * log (1 + t/x)) atTop (𝓝 t)
-- 等价形式：x log(1 + t/x) → t
```

#### 2.8.3 $1^\infty$ 型极限的处理

若 $u(x)\to1$，$v(x)\to\infty$，则

$$
u(x)^{v(x)}=e^{v(x)\ln u(x)}
=e^{v(x)\ln\left(1+(u(x)-1)\right)}
\sim e^{v(x)(u(x)-1)}.
$$

因此当 $\lim v(x)(u(x)-1)=A$（有限）时，

$$
\lim u(x)^{v(x)}=e^{A}.
$$

**例 1.** $\displaystyle\lim_{x\to0}(1+3x)^{1/x}=e^3$。

**例 2.** $\displaystyle\lim_{x\to\infty}\left(1+\frac{2}{x}\right)^x=e^2$。

**例 3.** $\displaystyle\lim_{x\to0}(\cos x)^{1/x^2}$。

解：$u=\cos x\to1$，$v=1/x^2\to\infty$，且

$$
v(u-1)=\frac{\cos x-1}{x^2}\to-\frac12,
$$

故原极限 $=e^{-1/2}$。

```lean
-- 例 2 的 Lean 语句（示意）
example : Tendsto (fun x : ℝ => (1 + 2 / x) ^ x) Filter.atTop (𝓝 (Real.exp 2)) :=
  Real.tendsto_one_add_div_rpow_exp 2
-- `Real.tendsto_one_add_div_rpow_exp` 已封装好这一结论
```

> **考试要点**：见到 $1^\infty$ 型，优先用公式 $\lim u^v=e^{\lim v(u-1)}$，或取对数后化为 $\frac{0}{0}$ 型 / 等价无穷小。

---

## 三、连续

### 3.1 函数连续的概念

#### 3.1.1 定义

**定义（在一点连续）.** 设 $f$ 在 $x_0$ 的某邻域内有定义。若

$$
\lim_{x\to x_0}f(x)=f(x_0),
$$

则称 $f$ 在 $x_0$ 处**连续**。

等价说法：
- $\forall \varepsilon>0,\ \exists \delta>0$，当 $|x-x_0|<\delta$ 时 $|f(x)-f(x_0)|<\varepsilon$；
- $\lim_{\Delta x\to0}\Delta y=0$，其中 $\Delta y=f(x_0+\Delta x)-f(x_0)$。

**左连续 / 右连续**：若 $f(x_0^-)=f(x_0)$，称 $f$ 在 $x_0$ **左连续**；若 $f(x_0^+)=f(x_0)$，称**右连续**。

**定理.** $f$ 在 $x_0$ 连续 ⇔ $f$ 在 $x_0$ 既左连续又右连续。

**在区间上连续**：$f$ 在区间 $I$ 上每一点都连续；在闭区间端点处只要求单侧连续。

```lean
-- 在一点连续（continuous at a point）：用 𝓝 x₀（含 x₀），不是去心邻域
#check ContinuousAt
-- 类型：ContinuousAt (f : X → Y) (x : X) : Prop
-- 展开即 Tendsto f (𝓝 x) (𝓝 (f x))

-- 在集合上连续（continuous on a set）
#check ContinuousOn
-- 类型：ContinuousOn (f : X → Y) (s : Set X) : Prop

-- 连续（continuous）：处处连续
#check Continuous

-- 在集合内一点连续（continuous within a set at a point）
#check ContinuousWithinAt
-- 左连续：ContinuousWithinAt f (Set.Iic x₀) x₀
-- 右连续：ContinuousWithinAt f (Set.Ioi x₀) x₀
```

用 $\varepsilon$-$\delta$ 语言写：

```lean
-- 函数在一点连续的 ε-δ 定义
def ContinuousAtPoint (f : ℝ → ℝ) (x₀ : ℝ) : Prop :=
  ∀ ε : ℝ, 0 < ε → ∃ δ : ℝ, 0 < δ ∧
    ∀ x : ℝ, |x - x₀| < δ → |f x - f x₀| < ε
```

#### 3.1.2 连续与极限的区别

- **极限** $\lim_{x\to x_0}f(x)$：使用去心邻域，$f(x_0)$ 可以没有定义，也可以不等于极限；
- **连续**：要求 $f(x_0)$ 有定义，并且极限等于函数值。

**例.** $f(x)=\frac{\sin x}{x}$ 在 $x=0$ 没有定义，但 $\lim_{x\to0}f(x)=1$；补充定义 $f(0)=1$ 后，函数在 $0$ 处连续（可去间断点，见 3.2）。

**例.** $f(x)=x^2\sin\frac1x\ (x\ne0)$，$f(0)=0$ 在 $0$ 处连续：因为 $|f(x)|\le x^2\to0=f(0)$。

```lean
-- f x = x² sin(1/x)，f 0 = 0
noncomputable def fOsc (x : ℝ) : ℝ :=
  if x = 0 then 0 else x ^ 2 * Real.sin (1 / x)

example : ContinuousAt fOsc 0 := by
  -- 思路：|x² sin(1/x)| ≤ x² → 0，故 fOsc x → 0 = fOsc 0
  sorry
```

---

### 3.2 函数间断点的类型

**定义.** 若 $f$ 在 $x_0$ 的某去心邻域内有定义，但在 $x_0$ 处不连续，则称 $x_0$ 为 $f$ 的**间断点**。

分类（**按左右极限是否存在**）：

| 类型 | 条件 | 子类 | 典型例子 |
|---|---|---|---|
| **第一类间断点** | 左右极限都存在（有限） | 可去间断点：$f(x_0^-)=f(x_0^+)$ | $\frac{\sin x}{x}$ 在 $0$ 处（补充定义后连续） |
| | | 跳跃间断点：$f(x_0^-)\ne f(x_0^+)$ | $\|x\|/x$ 在 $0$ 处 |
| **第二类间断点** | 至少一侧极限不存在 | 无穷间断点：至少一侧趋于 $\pm\infty$ | $\frac1x$ 在 $0$ 处 |
| | | 振荡间断点：函数值无限振荡 | $\sin\frac1x$ 在 $0$ 处 |

```lean
-- 第一类间断点（first kind）：左右极限都存在
def FirstKindAt (f : ℝ → ℝ) (x₀ Lm Lp : ℝ) : Prop :=
  Tendsto f (𝓝[<] x₀) (𝓝 Lm) ∧ Tendsto f (𝓝[>] x₀) (𝓝 Lp)
-- 可去间断点（removable discontinuity）：Lm = Lp
-- 跳跃间断点（jump discontinuity）：Lm ≠ Lp

-- 第二类间断点（second kind）：至少一侧极限不存在
-- 无穷间断点（infinite discontinuity）：至少一侧趋于 ±∞
-- 振荡间断点（oscillatory discontinuity）：极限不存在且不趋于无穷

-- 例：振荡间断点 sin(1/x) 在 0 处
noncomputable def oscExample (x : ℝ) : ℝ := Real.sin (1 / x)
```

**例 1（考研常见）.** $f(x)=\dfrac{x^2-1}{x^2-x}=\dfrac{(x-1)(x+1)}{x(x-1)}$。

- $x=0$：$\lim_{x\to0}\frac{x+1}{x}=\infty$，是**无穷间断点**（第二类）；
- $x=1$：约去 $x-1$ 后 $\lim_{x\to1}\frac{x+1}{x}=2$，是**可去间断点**（第一类）。

**例 2.** $f(x)=\dfrac{|x|}{x}$ 在 $x=0$：左极限 $-1$，右极限 $1$，是**跳跃间断点**。

**例 3.** $f(x)=\sin\dfrac1x$ 在 $x=0$：沿 $x_n=\frac{1}{n\pi}$ 有 $f(x_n)=0$，沿 $y_n=\frac{1}{\pi/2+2n\pi}$ 有 $f(y_n)=1$，故极限不存在，是**振荡间断点**。

```lean
-- 例 2：跳跃间断点
noncomputable def jumpExample (x : ℝ) : ℝ := |x| / x
-- x → 0⁻ 时值为 −1；x → 0⁺ 时值为 1，故为跳跃间断点

-- 例 3：振荡间断点
noncomputable def oscExample (x : ℝ) : ℝ := Real.sin (1 / x)
-- 在 0 处极限不存在（可用两个不同的数列验证，归结原则）
```

> **易错点**
> 1. **无穷间断点属于第二类**，不是第一类；
> 2. 可去间断点必须左右极限存在且相等，只是函数值“缺失”或“错位”；
> 3. 判断间断点类型前，先找出所有无定义点与分段点。

---

### 3.3 初等函数的连续性

**定理.**
1. 基本初等函数在其**定义域内**连续；
2. 初等函数在其**定义区间内**连续。

**推论（代入求极限）**：若 $f$ 是初等函数且 $x_0$ 在其定义区间内，则

$$
\lim_{x\to x_0}f(x)=f(x_0).
$$

```lean
-- 基本初等函数的连续性
#check Real.continuous_exp   -- exp 在 ℝ 上连续
#check Real.continuous_sin   -- sin 连续
#check Real.continuous_cos   -- cos 连续
#check Real.continuousAt_log -- log 在 x ≠ 0 处连续（其定义域是 x > 0）
-- 其他基本初等函数类似：Real.continuous_tan（在定义域内）、
-- Real.continuous_arcsin、Real.continuous_arctan 等

-- 连续函数的四则运算与复合仍连续
#check Continuous.add        -- 两个连续函数之和连续
#check Continuous.sub        -- 差连续
#check Continuous.mul        -- 积连续
#check Continuous.div        -- 商连续（分母处处非零）
#check Continuous.comp       -- 复合连续
#check Continuous.pow        -- 幂连续
#check Continuous.inv₀       -- 倒数连续（函数值处处非零）

-- 逐点版本（在一点处连续）
#check ContinuousAt.add
#check ContinuousAt.sub
#check ContinuousAt.mul
#check ContinuousAt.div
#check ContinuousAt.comp
#check ContinuousAt.inv₀
```

**例.** 求 $\displaystyle\lim_{x\to1}\frac{x^2+\ln x}{1+e^x}$。

由于分子、分母都是初等函数，且 $x=1$ 在定义区间内，直接代入：

$$
\frac{1+\ln1}{1+e}=\frac{1}{1+e}.
$$

**反函数的连续性**：若 $f$ 在区间 $I$ 上严格单调且连续，则其反函数 $f^{-1}$ 在值域 $f(I)$ 上连续。

> **考试要点**：初等函数在其定义区间内连续，因此很多极限可以直接代入；但分段函数在分界点、含绝对值/取整的函数，需要单独讨论。

---

### 3.4 闭区间上连续函数的性质

设 $f$ 在闭区间 $[a,b]$ 上连续。以下四条性质是本章的核心结论。

#### 3.4.1 有界性定理

**定理.** 闭区间上的连续函数**有界**。

**证明思路（紧性）**：$[a,b]$ 是**紧集**（compact）；连续函数把紧集映成紧集；紧集在度量空间中有界。

```lean
-- 紧性视角：
#check isCompact_Icc
-- [a, b] 是紧集（compact set）
#check IsCompact.image_of_continuousOn
-- 紧集在连续函数下的像仍是紧集
#check IsCompact.isBounded
-- 紧集在度量空间中是有界的（bounded）

-- 有界性定理（boundedness theorem）
example (f : ℝ → ℝ) (a b : ℝ) (hf : ContinuousOn f (Set.Icc a b)) :
    Bornology.IsBounded (f '' Set.Icc a b) :=
  (isCompact_Icc.image_of_continuousOn hf).isBounded
-- `f '' Set.Icc a b` 是像集（image）
```

> **注意**：开区间上连续函数**不一定有界**，例如 $f(x)=\frac1x$ 在 $(0,1)$ 上无界。闭区间条件不可少。

#### 3.4.2 最值定理

**定理（最值定理 / extreme value theorem）.** 闭区间上连续函数一定能取到最大值和最小值：存在 $x_1,x_2\in[a,b]$，使

$$
f(x_1)=\min_{x\in[a,b]}f(x),\qquad f(x_2)=\max_{x\in[a,b]}f(x).
$$

```lean
-- 最值定理（extreme value theorem）
#check IsCompact.exists_isMinOn
-- 类型：IsCompact s → s.Nonempty → ContinuousOn f s → ∃ x ∈ s, IsMinOn f s x
#check IsCompact.exists_isMaxOn
-- 最大值版本：∃ x ∈ s, IsMaxOn f s x

-- 例：闭区间上的连续函数取到最小值与最大值
example (f : ℝ → ℝ) {a b : ℝ} (hab : a ≤ b) (hf : ContinuousOn f (Set.Icc a b)) :
    (∃ x ∈ Set.Icc a b, IsMinOn f (Set.Icc a b) x) ∧
    (∃ x ∈ Set.Icc a b, IsMaxOn f (Set.Icc a b) x) := by
  -- Set.nonempty_Icc.mpr hab : (Set.Icc a b).Nonempty
  exact ⟨isCompact_Icc.exists_isMinOn (Set.nonempty_Icc.mpr hab) hf,
         isCompact_Icc.exists_isMaxOn (Set.nonempty_Icc.mpr hab) hf⟩
-- `IsMinOn` / `IsMaxOn`：f 在 s 上在 x 处取到最小 / 最大值
```

#### 3.4.3 介值定理

**定理（介值定理 / intermediate value theorem）.** 设 $f$ 在 $[a,b]$ 上连续，且 $f(a)\ne f(b)$。则对介于 $f(a)$ 与 $f(b)$ 之间的任意实数 $\mu$，存在 $\xi\in[a,b]$，使

$$
f(\xi)=\mu.
$$

```lean
-- 介值定理（intermediate value theorem）
#check intermediate_value_Icc
-- 类型（f a ≤ f b 情形）：
-- a ≤ b → ContinuousOn f (Set.Icc a b) →
--   Set.Icc (f a) (f b) ⊆ f '' Set.Icc a b
-- 读法：[f a, f b] 中的每个值都在像集中，即都能被取到

#check intermediate_value_Icc'
-- 对偶情形（f b ≤ f a）：Set.Icc (f b) (f a) ⊆ f '' Set.Icc a b
```

#### 3.4.4 零点定理

**定理（零点定理 / zero point theorem）.** 设 $f$ 在 $[a,b]$ 上连续，且

$$
f(a)\,f(b)<0,
$$

则存在 $\xi\in(a,b)$，使 $f(\xi)=0$。

零点定理是介值定理取 $\mu=0$ 的特例。

```lean
-- 零点定理（zero point theorem）：f a < 0 < f b ⇒ 存在零点
example (f : ℝ → ℝ) {a b : ℝ} (hab : a ≤ b) (hf : ContinuousOn f (Set.Icc a b))
    (ha : f a < 0) (hb : 0 < f b) :
    ∃ x ∈ Set.Ioo a b, f x = 0 := by
  -- 0 ∈ Set.Icc (f a) (f b)，由 intermediate_value_Icc 得到
  -- 0 ∈ f '' Set.Icc a b，即存在 x ∈ [a, b] 使 f x = 0
  -- 再由 f a < 0、f b > 0 可知零点不在端点，故 x ∈ (a, b)
  sorry
```

**例 1.** 证明方程 $x^3-x-1=0$ 在 $(1,2)$ 内至少有一个根。

证明：令 $f(x)=x^3-x-1$。$f$ 在 $[1,2]$ 上连续，

$$
f(1)=1-1-1=-1<0,\qquad f(2)=8-2-1=5>0.
$$

由零点定理，存在 $\xi\in(1,2)$ 使 $f(\xi)=0$。

**例 2.** 证明方程 $\cos x=x$ 在 $\left(0,\frac{\pi}{2}\right)$ 内有根。

令 $f(x)=\cos x-x$，则 $f(0)=1>0$，$f\left(\frac{\pi}{2}\right)=-\frac{\pi}{2}<0$，由零点定理得证。

**例 3（考研风格：抽象函数）.** 设 $f$ 在 $[0,1]$ 上连续，$f(0)=0$，$f(1)=1$。证明存在 $\xi\in(0,1)$，使 $f(\xi)=1-\xi$。

证明：令 $g(x)=f(x)+x-1$。则 $g(0)=-1<0$，$g(1)=1>0$，且 $g$ 连续。由零点定理，存在 $\xi\in(0,1)$ 使 $g(\xi)=0$，即 $f(\xi)=1-\xi$。

```lean
-- 例 3 的 Lean 语句（示意）
example (f : ℝ → ℝ) (hf : ContinuousOn f (Set.Icc 0 1))
    (h0 : f 0 = 0) (h1 : f 1 = 1) :
    ∃ ξ ∈ Set.Ioo (0 : ℝ) 1, f ξ = 1 - ξ := by
  -- 对 g x = f x + x − 1 用零点定理：
  -- g 0 = −1 < 0，g 1 = 1 > 0
  sorry
```

> **考试要点**
> 1. 有界性定理、最值定理、介值定理、零点定理都要求**闭区间**上的**连续**函数；
> 2. 零点定理常用于证明方程根的存在性；结合单调性可证明根的唯一性；
> 3. 抽象函数的证明题（如例 3）通常先构造辅助函数，再对辅助函数用零点定理或介值定理。

---

## 四、本章知识结构

```text
函数（定义域、对应法则、性态）
        │
        │ 基本初等函数 → 初等函数 → 函数关系建立
        ▼
极限（数列极限、函数极限、左右极限）
        │
        ├── 无穷小 / 无穷大（概念、关系、比较、等价替换）
        ├── 四则运算
        ├── 两个准则（单调有界、夹逼）
        └── 两个重要极限（sin x / x → 1，(1+1/x)^x → e）
        ▼
连续（一点连续、区间连续）
        │
        ├── 间断点分类（第一类：可去、跳跃；第二类：无穷、振荡）
        ├── 初等函数连续性
        └── 闭区间连续函数四性质（有界、最值、介值、零点）
        ▼
下一章：导数与微分
```

---

## 五、Mathlib 名词速查表

| 数学概念 | Lean 4 / Mathlib 全限定名 | 说明 |
|---|---|---|
| 极限 | `Filter.Tendsto` | `Tendsto f l (𝓝 a)` |
| 数列趋于无穷 | `Filter.atTop` | `Tendsto u atTop (𝓝 a)` |
| 趋于负无穷 | `Filter.atBot` | |
| 邻域 | `nhds` | 记号 `𝓝 a` |
| 集合内的邻域 | `nhdsWithin` | 记号 `𝓝[s] a` |
| 去心邻域 | `nhdsWithin a {a}ᶜ` | 记号 `𝓝[≠] a` |
| 左极限邻域 | `nhdsWithin a (Set.Iio a)` | 记号 `𝓝[<] a` |
| 右极限邻域 | `nhdsWithin a (Set.Ioi a)` | 记号 `𝓝[>] a` |
| ε-N 展开 | `Metric.tendsto_atTop` | 数列极限 |
| ε-δ 展开 | `Metric.tendsto_nhds` | 函数极限 |
| 极限唯一 | `tendsto_nhds_unique` | |
| 夹逼准则（最终版） | `tendsto_of_tendsto_of_tendsto_of_le_of_le'` | 用 `∀ᶠ` 不等式 |
| 夹逼准则（逐点版） | `tendsto_of_tendsto_of_tendsto_of_le_of_le` | 逐点不等式 |
| 夹逼到 0 | `squeeze_zero` | |
| 范数夹逼 | `squeeze_zero_norm` | |
| 单调有界准则 | `tendsto_atTop_ciSup` | 单调递增 + 有上界 |
| 对偶准则 | `tendsto_atBot_ciInf` | 单调 + 有下界 |
| 第一个重要极限 | `Real.tendsto_sin_div_nhdsNE_zero` | `sin x / x → 1` |
| 相关极限 | `Real.tendsto_one_sub_cos_div_nhdsNE_zero` | `(1 − cos x)/x → 0` |
| 第二个重要极限（数列） | `Real.tendsto_one_add_div_pow_exp` | `(1 + t/n)^n → e^t` |
| 第二个重要极限（实数） | `Real.tendsto_one_add_div_rpow_exp` | `(1 + t/x)^x → e^t` |
| 对数形式 | `Real.tendsto_mul_log_one_add_div_atTop` | `x log(1 + t/x) → t` |
| 无穷大取倒数 | `Filter.Tendsto.inv_tendsto_atTop` | `f → +∞ ⇒ f⁻¹ → 0` |
| 单侧无穷小取倒数 | `Filter.Tendsto.inv_tendsto_nhdsGT_zero` | `f → 0⁺ ⇒ f⁻¹ → +∞` |
| 极限四则（加） | `Filter.Tendsto.add` | |
| 极限四则（减） | `Filter.Tendsto.sub` | |
| 极限四则（乘） | `Filter.Tendsto.mul` | |
| 极限四则（除） | `Filter.Tendsto.div` | 分母极限非零 |
| 常数乘 | `Filter.Tendsto.const_mul` | |
| 幂 | `Filter.Tendsto.pow` | |
| 倒数 | `Filter.Tendsto.inv₀` | 极限非零 |
| 复合 | `Filter.Tendsto.comp` | |
| 归结原则 | `Filter.tendsto_iff_seq_tendsto` | 数列刻画 |
| 归结原则（𝓝 版） | `tendsto_nhds_iff_seq_tendsto` | |
| 高阶无穷小 | `Asymptotics.IsLittleO` | 记号 `=o[l]` |
| 同阶（上界） | `Asymptotics.IsBigO` | 记号 `=O[l]` |
| 同阶（双向） | `Asymptotics.IsTheta` | 记号 `=Θ[l]` |
| 等价无穷小 | `Asymptotics.IsEquivalent` | 记号 `~[l]` |
| 等价 ↔ 商 → 1 | `Asymptotics.isEquivalent_iff_tendsto_one` | |
| 等价替换 | `Asymptotics.IsEquivalent.tendsto_nhds_iff` | |
| 在一点连续 | `ContinuousAt` | |
| 在集合上连续 | `ContinuousOn` | |
| 连续 | `Continuous` | |
| 集合内一点连续 | `ContinuousWithinAt` | 左/右连续的基础 |
| 连续加法 | `Continuous.add` | |
| 连续乘法 | `Continuous.mul` | |
| 连续除法 | `Continuous.div` | 分母处处非零 |
| 连续复合 | `Continuous.comp` | |
| 连续幂 | `Continuous.pow` | |
| 连续倒数 | `Continuous.inv₀` | 函数值处处非零 |
| 逐点连续加法 | `ContinuousAt.add` | |
| 逐点连续乘法 | `ContinuousAt.mul` | |
| 逐点连续除法 | `ContinuousAt.div` | |
| 逐点连续复合 | `ContinuousAt.comp` | |
| 基本初等函数连续 | `Real.continuous_exp` 等 | 另有 `Real.continuous_sin`、`Real.continuous_cos`、`Real.continuousAt_log` |
| 闭区间紧性 | `isCompact_Icc` | `IsCompact (Set.Icc a b)` |
| 紧集的连续像 | `IsCompact.image_of_continuousOn` | |
| 紧集有界 | `IsCompact.isBounded` | |
| 最值定理（最小） | `IsCompact.exists_isMinOn` | |
| 最值定理（最大） | `IsCompact.exists_isMaxOn` | |
| 介值定理 | `intermediate_value_Icc` | `f a ≤ f b` 情形 |
| 介值定理（对偶） | `intermediate_value_Icc'` | `f b ≤ f a` 情形 |
| 函数图像 | `Set.graphOn` | |
| 分段函数 | `Set.piecewise` | |
| 复合函数 | `Function.comp` | 记作 `g ∘ f` |
| 反函数构造 | `Function.invFun` | |
| 双射 ↔ 有逆 | `Function.bijective_iff_has_inverse` | |
| 周期函数 | `Function.Periodic` | |
| 反周期 | `Function.Antiperiodic` | |
| 奇函数 | `Function.Odd` | |
| 偶函数 | `Function.Even` | |
| 单调递增 | `Monotone` | |
| 严格单调递增 | `StrictMono` | |
| 单调递减 | `Antitone` | |
| 严格单调递减 | `StrictAnti` | |
| 有界性 | `Bornology.IsBounded` | |
| 有上界 | `BddAbove` | |
| 有下界 | `BddBelow` | |
| 上确界 | `sSup` | |
| 下确界 | `sInf` | |
| 指数律 | `Real.exp_add` | |
| 指数对数互逆 | `Real.exp_log`、`Real.log_exp` | |
| 对数律 | `Real.log_mul` | |
| 三角恒等式 | `Real.sin_sq_add_cos_sq` | |
| 正切定义 | `Real.tan_eq_sin_div_cos` | |

---

## 六、复习自查清单

对照 `# target` 逐条自查（能用自己的话复述定义、写出 Lean 名字、独立完成例题，才算掌握）：

- [ ] 能说出函数的三要素，判断两个函数是否相同（1.1）
- [ ] 能判断函数的有界性、单调性、周期性、奇偶性（1.2）
- [ ] 能写出复合函数、反函数、分段函数、隐函数的定义与例子（1.3）
- [ ] 能画出六类基本初等函数的图像并说出定义域、值域、单调性、奇偶性（1.4）
- [ ] 能判断一个函数是否为初等函数（1.5）
- [ ] 能根据实际问题建立函数关系并写出定义域（1.6）
- [ ] 能用 ε-N 语言写出数列极限定义，并说出收敛数列的性质（2.1）
- [ ] 能用 ε-δ 语言写出函数极限定义，并说出函数极限的性质（2.2）
- [ ] 能计算左右极限，并用“左极限 = 右极限”判断极限存在（2.3）
- [ ] 能区分无穷小与无穷大，掌握二者的倒数关系（2.4）
- [ ] 能比较无穷小阶，熟记常用等价无穷小，并会正确替换（2.5）
- [ ] 能熟练使用极限四则运算，识别未定式（2.6）
- [ ] 能用单调有界准则证明递推数列收敛（2.7）
- [ ] 能用夹逼准则求数列/函数极限（2.7）
- [ ] 能完整证明两个重要极限，并用它们求极限（2.8）
- [ ] 能说出函数在一点连续的定义，并判断分段函数在分界点的连续性（3.1）
- [ ] 能判断间断点类型（第一类：可去、跳跃；第二类：无穷、振荡）（3.2）
- [ ] 能利用初等函数的连续性直接代入求极限（3.3）
- [ ] 能叙述并应用闭区间上连续函数的四条性质（3.4）

---

## 七、与 `target/day-01.md` 的对应

| day-01 题号 | 考点 | 对应章节 |
|---|---|---|
| 第 1 题 | 无穷小量的比较（等价无穷小） | 2.5 |
| 第 2 题 | 间断点的类型 | 3.2 |
| 第 3 题 | 连续、可导与导函数连续（导数为下一章内容） | 3.1 |
| 第 17 题 | 零点定理 + 拉格朗日中值定理（后者在下一章） | 3.4 |
