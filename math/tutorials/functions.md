# 函数：极限、连续性、微分、积分与全纯函数

> 本文整理单变量实分析与复分析中最基础的五个概念：**极限、连续性、微分、积分、全纯函数**。每一节包含直观解释、严格定义、典型例子、关键定理，以及对应的 **Lean 4 / Mathlib** 代码。代码是定义摘录，不是完整可编译工程；重点是展示数学概念在 Lean 中的写法。

## 目录

1. [记号与约定](#0-记号与约定)
2. [极限](#1-极限)
3. [连续性](#2-连续性)
4. [微分](#3-微分)
5. [积分](#4-积分)
6. [全纯函数](#5-全纯函数)
7. [概念之间的关系](#6-概念之间的关系)
8. [Lean 4 对照表](#7-lean-4-对照表)
9. [一句话总结](#8-一句话总结)

---

## 0. 记号与约定

本文主要讨论：

- 实函数 $f : \mathbb{R} \to \mathbb{R}$；
- 复函数 $f : \mathbb{C} \to \mathbb{C}$；
- 数列 $a : \mathbb{N} \to \mathbb{R}$。

常用记号：

| 记号 | 含义 |
|------|------|
| $\mathbb{R}$ | 实数域 |
| $\mathbb{C}$ | 复数域 |
| $\vert x\vert$ | 实数绝对值，或复数模 |
| $\operatorname{dist}(x,y)$ | 距离，$\mathbb{R}$ 上就是 $\vert x-y\vert$ |
| $\lim_{n\to\infty} a_n$ | 数列极限 |
| $\lim_{x\to a} f(x)$ | 函数在 $a$ 处的极限 |
| $f'(a)$ | 导数 |
| $\int_a^b f(x)\,dx$ | 区间积分 |
| $\mathbb{H}$ | 全纯函数（holomorphic）的简称，本文不用此记号，避免与四元数混淆 |

Lean 4 中对应的核心名字：

| 数学概念 | Lean 4 / Mathlib |
|----------|------------------|
| 极限 | `Filter.Tendsto` |
| 数列趋于无穷 | `Filter.atTop` |
| 点 $a$ 的邻域 | `nhds a`，也写作 `𝓝 a` |
| 点连续 | `ContinuousAt f a` |
| 连续 | `Continuous f` |
| 一致连续 | `UniformContinuous f` |
| 导数 | `HasDerivAt f f' a`、`deriv f a` |
| 可微 | `DifferentiableAt ℝ f a` |
| 区间积分 | `∫ x in a..b, f x` |
| 复可微 / 全纯 | `DifferentiableAt ℂ f z` |
| 解析 | `AnalyticAt ℂ f z` |

---

## 1. 极限

### 1.1 直观

极限描述的是“无限接近”：

- **数列极限**：当 $n$ 越来越大时，$a_n$ 越来越接近 $L$；
- **函数极限**：当 $x$ 越来越接近 $a$（但 $x \ne a$）时，$f(x)$ 越来越接近 $L$。

“越来越接近”的严格化方式是：**任意给定一个误差 $\varepsilon>0$，都能找到一个阶段/范围，使得此后的值都落在误差之内。**

### 1.2 数列极限

**定义 1.1（数列极限）**
数列 $(a_n)$ 收敛到 $L$，记作
$$
\lim_{n\to\infty} a_n = L,
$$
如果
$$
\forall \varepsilon>0,\quad
\exists N\in\mathbb{N},\quad
\forall n\ge N,\quad
\vert a_n-L\vert<\varepsilon.
$$

用语言说：任意小的误差 $\varepsilon$，都存在一个下标 $N$，从 $N$ 之后的所有项都落在 $L$ 的 $\varepsilon$-邻域内。

**Lean 4 写法**：

```lean
-- 数列 a : ℕ → ℝ 收敛到 L
-- 逐字翻译：∀ ε > 0, ∃ N, ∀ n ≥ N, |a n - L| < ε
def SequenceTendsto (a : ℕ → ℝ) (L : ℝ) : Prop :=
  ∀ ε : ℝ, 0 < ε → ∃ N : ℕ, ∀ n : ℕ, N ≤ n → |a n - L| < ε

-- Mathlib 的过滤器写法：
-- `Filter.atTop` 表示“n 足够大”，`𝓝 L` 表示“L 的任意邻域”
#check Filter.Tendsto
#check Filter.atTop
#check nhds

-- `Metric.tendsto_atTop` 说明过滤器写法与 ε-N 写法等价
#check Metric.tendsto_atTop
```

**例 1.2**
$$
\lim_{n\to\infty}\frac{1}{n}=0.
$$

Lean 中可以直接使用 Mathlib 的现成引理：

```lean
-- 1/n 趋于 0
example : Filter.Tendsto (fun n : ℕ => (1 : ℝ) / n) Filter.atTop (𝓝 0) := by
  simpa using tendsto_one_div_atTop_nhds_zero_nat
```

### 1.3 函数极限

**定义 1.3（函数在一点的极限）**
设 $f$ 在 $a$ 的某个去心邻域内有定义。称
$$
\lim_{x\to a} f(x)=L,
$$
如果
$$
\forall \varepsilon>0,\quad
\exists \delta>0,\quad
\forall x,\quad
0<\vert x-a\vert<\delta \implies \vert f(x)-L\vert<\varepsilon.
$$

两个细节：

1. $0<\vert x-a\vert$ 表示 **$x\ne a$**：极限只关心 $a$ 附近，不关心 $a$ 点的函数值；
2. $\delta$ 可以依赖于 $\varepsilon$，但不能依赖于 $x$。

**Lean 4 写法**：

```lean
-- 函数 f : ℝ → ℝ 在 a 处的极限为 L
-- 逐字翻译 ε-δ 定义
def FunctionTendsto (f : ℝ → ℝ) (a L : ℝ) : Prop :=
  ∀ ε : ℝ, 0 < ε → ∃ δ : ℝ, 0 < δ ∧
    ∀ x : ℝ, 0 < |x - a| ∧ |x - a| < δ → |f x - L| < ε

-- Mathlib 用“去心邻域上的过滤器极限”表示：
-- `𝓝[≠] a` 读作“a 的去心邻域”
#check Filter.Tendsto
#check nhdsWithin
```

**例 1.4**
$$
\lim_{x\to 2}\frac{x^2-4}{x-2}
=\lim_{x\to 2}(x+2)=4.
$$
这里 $x=2$ 时原式没有定义，但极限仍然存在，因为极限只看去心邻域。

**例 1.5（极限不存在）**
$$
\lim_{x\to 0}\sin\frac{1}{x}
$$
不存在。当 $x\to0$ 时，$\sin(1/x)$ 在 $-1$ 与 $1$ 之间无限振荡，不趋于任何固定值。

### 1.4 极限的性质

设 $f,g$ 在 $a$ 附近有定义，且
$$
\lim_{x\to a}f(x)=L,\qquad \lim_{x\to a}g(x)=M.
$$

则：

1. **唯一性**：极限若存在则唯一。
2. **四则运算**：
   $$
   \lim_{x\to a}(f+g)=L+M,\qquad
   \lim_{x\to a}(fg)=LM,
   $$
   当 $M\ne0$ 时，
   $$
   \lim_{x\to a}\frac{f}{g}=\frac{L}{M}.
   $$
3. **夹逼定理**：若在 $a$ 附近 $g\le f\le h$，且
   $$
   \lim_{x\to a}g(x)=\lim_{x\to a}h(x)=L,
   $$
   则 $\lim_{x\to a}f(x)=L$。
4. **复合**：若 $g$ 在 $L$ 处连续，则
   $$
   \lim_{x\to a}g(f(x))=g(L).
   $$

Lean 中对应的引理：

```lean
-- 和的极限
example (f g : ℝ → ℝ) (a L M : ℝ)
    (hf : Filter.Tendsto f (𝓝 a) (𝓝 L))
    (hg : Filter.Tendsto g (𝓝 a) (𝓝 M)) :
    Filter.Tendsto (fun x => f x + g x) (𝓝 a) (𝓝 (L + M)) :=
  hf.add hg

-- 积的极限
example (f g : ℝ → ℝ) (a L M : ℝ)
    (hf : Filter.Tendsto f (𝓝 a) (𝓝 L))
    (hg : Filter.Tendsto g (𝓝 a) (𝓝 M)) :
    Filter.Tendsto (fun x => f x * g x) (𝓝 a) (𝓝 (L * M)) :=
  hf.mul hg

-- 商的极限，需要分母极限非零
example (f g : ℝ → ℝ) (a L M : ℝ)
    (hf : Filter.Tendsto f (𝓝 a) (𝓝 L))
    (hg : Filter.Tendsto g (𝓝 a) (𝓝 M))
    (hM : M ≠ 0) :
    Filter.Tendsto (fun x => f x / g x) (𝓝 a) (𝓝 (L / M)) :=
  hf.div hg hM
```

---

## 2. 连续性

### 2.1 定义

**定义 2.1（点连续）**
函数 $f$ 在点 $a$ 处**连续**，如果
$$
\lim_{x\to a}f(x)=f(a).
$$
等价地，
$$
\forall \varepsilon>0,\quad
\exists \delta>0,\quad
\forall x,\quad
\vert x-a\vert<\delta \implies \vert f(x)-f(a)\vert<\varepsilon.
$$

与极限定义的唯一区别是：这里 **不要求 $x\ne a$**，而且极限值必须等于函数值 $f(a)$。

**定义 2.2（在集合上连续）**
若 $f$ 在集合 $S$ 的每个点处连续，称 $f$ 在 $S$ 上**连续**，记作 $f$ 在 $S$ 上连续。

**定义 2.3（一致连续）**
$f$ 在 $S$ 上**一致连续**，如果
$$
\forall \varepsilon>0,\quad
\exists \delta>0,\quad
\forall x,y\in S,\quad
\vert x-y\vert<\delta \implies \vert f(x)-f(y)\vert<\varepsilon.
$$

一致连续与普通连续的区别：普通连续的 $\delta$ 可以依赖于点 $a$；一致连续的 $\delta$ 只依赖于 $\varepsilon$，对所有点统一适用。

**Lean 4 写法**：

```lean
-- 点连续：ε-δ 定义
def ContinuousAtPoint (f : ℝ → ℝ) (a : ℝ) : Prop :=
  ∀ ε : ℝ, 0 < ε → ∃ δ : ℝ, 0 < δ ∧
    ∀ x : ℝ, |x - a| < δ → |f x - f a| < ε

-- Mathlib 的现成定义
#check ContinuousAt
#check Continuous
#check ContinuousOn
#check UniformContinuous
```

连续与极限的关系可以直接用 `ContinuousAt.tendsto` 表示：

```lean
-- 连续 ⇔ 函数值就是极限值
example (f : ℝ → ℝ) (a : ℝ) (h : ContinuousAt f a) :
    Filter.Tendsto f (𝓝 a) (𝓝 (f a)) :=
  h.tendsto
```

**例 2.4**
多项式、$\exp$、$\sin$、$\cos$ 都在 $\mathbb{R}$ 上连续。

```lean
-- 多项式在每一点连续
example (x : ℝ) : ContinuousAt (fun t : ℝ => t ^ 2 + 3 * t + 1) x := by
  fun_prop

-- exp、sin、cos 在 ℝ 上连续
#check Real.continuous_exp
#check Real.continuous_sin
#check Real.continuous_cos
```

### 2.2 连续函数的性质

**局部性质**：

1. 连续函数的和、差、积仍连续；
2. 连续函数的商在分母非零处连续；
3. 连续函数的复合仍连续。

**整体性质（需要紧性或连通性）**：

1. **最值定理**：若 $f$ 在闭区间 $[a,b]$ 上连续，则 $f$ 在 $[a,b]$ 上取得最大值和最小值。
2. **介值定理**：若 $f$ 在 $[a,b]$ 上连续，且 $f(a)<c<f(b)$，则存在 $\xi\in(a,b)$ 使 $f(\xi)=c$。
3. **Heine–Cantor 定理**：若 $f$ 在紧集上连续，则 $f$ 在该紧集上一致连续。

Lean 中对应的引理：

```lean
-- 连续函数的四则运算
#check ContinuousAt.add
#check ContinuousAt.mul
#check ContinuousAt.div
#check ContinuousAt.comp

-- 连续函数在紧集上一致连续（Heine–Cantor）
#check ContinuousOn.uniformContinuousOn
```

### 2.3 连续与极限的关系

可以把连续看成“极限与函数值一致”：

$$
f \text{ 在 } a \text{ 处连续}
\iff
\lim_{x\to a}f(x)=f(a).
$$

这也是为什么连续函数的极限可以直接代入：**连续函数把极限运算和函数运算交换**。

---

## 3. 微分

### 3.1 定义

**定义 3.1（导数）**
函数 $f$ 在点 $a$ 处**可微**，如果差商
$$
\frac{f(a+h)-f(a)}{h}
$$
当 $h\to0$ 时极限存在。这个极限称为 $f$ 在 $a$ 处的**导数**，记作
$$
f'(a)
=\lim_{h\to0}\frac{f(a+h)-f(a)}{h}.
$$

等价的线性化表述：
$$
f(a+h)=f(a)+f'(a)h+o(h)\qquad(h\to0).
$$
也就是说，**微分是用一条直线在局部逼近函数**。

**Lean 4 写法**：

```lean
-- 导数：差商的极限
def HasDerivativeAt (f : ℝ → ℝ) (f' a : ℝ) : Prop :=
  Filter.Tendsto (fun h : ℝ => (f (a + h) - f a) / h)
    (𝓝[≠] 0) (𝓝 f')

-- Mathlib 的写法：
-- `HasDerivAt f f' a` 表示 f 在 a 处可微，且导数为 f'
-- `deriv f a` 是导数作为函数
-- `DifferentiableAt ℝ f a` 表示导数存在
#check HasDerivAt
#check deriv
#check DifferentiableAt
```

**例 3.2**
$$
(x^2)'=2x,\qquad
(e^x)'=e^x,\qquad
(\sin x)'=\cos x,\qquad
(\cos x)'=-\sin x.
$$

Lean 中：

```lean
-- x² 的导数是 2x
example (x : ℝ) : HasDerivAt (fun t : ℝ => t ^ 2) (2 * x) x := by
  simpa using hasDerivAt_pow 2 x

-- exp 的导数是自身
example (x : ℝ) : HasDerivAt Real.exp (Real.exp x) x :=
  Real.hasDerivAt_exp x

-- sin 的导数是 cos
example (x : ℝ) : HasDerivAt Real.sin (Real.cos x) x :=
  Real.hasDerivAt_sin x

-- cos 的导数是 -sin
example (x : ℝ) : HasDerivAt Real.cos (-Real.sin x) x :=
  Real.hasDerivAt_cos x
```

### 3.2 求导法则

设 $f,g$ 在 $a$ 处可微，则：

1. **线性**：
   $$
   (f+g)'(a)=f'(a)+g'(a),\qquad
   (cf)'(a)=cf'(a).
   $$
2. **乘积法则**：
   $$
   (fg)'(a)=f'(a)g(a)+f(a)g'(a).
   $$
3. **商法则**（$g(a)\ne0$）：
   $$
   \left(\frac{f}{g}\right)'(a)
   =\frac{f'(a)g(a)-f(a)g'(a)}{g(a)^2}.
   $$
4. **链式法则**：
   $$
   (f\circ g)'(a)=f'(g(a))g'(a).
   $$

Lean 中对应的引理：

```lean
#check HasDerivAt.add
#check HasDerivAt.mul
#check HasDerivAt.div
#check HasDerivAt.comp
#check hasDerivAt_pow
```

### 3.3 中值定理

**定理 3.3（Lagrange 中值定理）**
若 $f$ 在 $[a,b]$ 上连续，在 $(a,b)$ 内可微，则存在 $\xi\in(a,b)$ 使
$$
f'(\xi)=\frac{f(b)-f(a)}{b-a}.
$$

几何意义：曲线上至少有一点的切线平行于割线。

Lean 中：

```lean
-- Lagrange 中值定理
#check exists_deriv_eq_slope
```

**推论 3.4**

1. 若 $f'=0$ 在区间上恒成立，则 $f$ 在该区间上为常数。
2. 若 $f'\ge0$，则 $f$ 单调递增；若 $f'>0$，则 $f$ 严格单调递增。
3. 若 $\vert f'\vert\le M$，则 $f$ 是 $M$-Lipschitz 的：
   $$
   \vert f(x)-f(y)\vert\le M\vert x-y\vert.
   $$

### 3.4 高阶导数与 Taylor 展开

$f$ 的 $n$ 阶导数记作 $f^{(n)}$。若 $f$ 在 $a$ 附近 $n$ 次可微，则 Taylor 多项式为
$$
T_n f(x;a)
=\sum_{k=0}^{n}\frac{f^{(k)}(a)}{k!}(x-a)^k.
$$
Taylor 定理说，在适当条件下
$$
f(x)=T_n f(x;a)+R_n(x),
$$
其中余项 $R_n(x)$ 可以写成 Lagrange 形式或积分形式。

Lean 中：

```lean
-- n 阶导数
#check iteratedDeriv

-- Taylor 余项
#check taylor_mean_remainder
```

---

## 4. 积分

### 4.1 直观

定积分
$$
\int_a^b f(x)\,dx
$$
表示函数曲线与 $x$ 轴之间的“有向面积”：

- $f(x)>0$ 的部分计正面积；
- $f(x)<0$ 的部分计负面积。

Riemann 积分的构造：

1. 把 $[a,b]$ 分成 $n$ 段：
   $$
   a=x_0<x_1<\cdots<x_n=b;
   $$
2. 在每段 $[x_{i-1},x_i]$ 中取一点 $\xi_i$；
3. 作 Riemann 和
   $$
   \sum_{i=1}^{n}f(\xi_i)(x_i-x_{i-1});
   $$
4. 当分割越来越细时，如果 Riemann 和趋于同一个极限，就称 $f$ 在 $[a,b]$ 上 Riemann 可积，极限就是定积分。

> Mathlib 中的区间积分是 Lebesgue/Bochner 积分限制在区间上的版本；对连续函数，它与 Riemann 积分一致。

### 4.2 定义与 Lean 写法

**定义 4.1（Riemann 积分）**
若 Riemann 和的极限存在，定义
$$
\int_a^b f(x)\,dx
=\lim_{\Vert P\Vert\to0}
\sum_{i=1}^{n}f(\xi_i)(x_i-x_{i-1}).
$$

**Lean 4 写法**：

```lean
-- 区间可积
#check IntervalIntegrable

-- 区间积分：∫ x in a..b, f x
#check intervalIntegral

-- 积分的线性性
#check intervalIntegral.integral_add
#check intervalIntegral.integral_sub
#check intervalIntegral.integral_const_mul
```

**例 4.2**
$$
\int_a^b c\,dx=(b-a)c.
$$

```lean
-- 常数的区间积分
example (c : ℝ) (a b : ℝ) :
    ∫ x in a..b, c = (b - a) * c := by
  simp [intervalIntegral.integral_const]
```

**例 4.3（线性性）**

```lean
-- ∫ (f + g) = ∫ f + ∫ g
example (f g : ℝ → ℝ) (a b : ℝ)
    (hf : IntervalIntegrable f volume a b)
    (hg : IntervalIntegrable g volume a b) :
    ∫ x in a..b, (f x + g x)
      = (∫ x in a..b, f x) + (∫ x in a..b, g x) :=
  intervalIntegral.integral_add hf hg
```

### 4.3 微积分基本定理

微积分基本定理把微分与积分联系起来。

**第一基本定理（变上限积分的导数）**
若 $f$ 在 $[a,b]$ 上连续，定义
$$
F(x)=\int_a^x f(t)\,dt,
$$
则 $F$ 在 $[a,b]$ 上可微，且
$$
F'(x)=f(x).
$$

**第二基本定理（Newton–Leibniz 公式）**
若 $F'=f$ 在 $[a,b]$ 上成立，则
$$
\int_a^b f(x)\,dx=F(b)-F(a).
$$

Lean 中：

```lean
-- 第一基本定理：变上限积分求导
example (f : ℝ → ℝ) (a b : ℝ)
    (hf : IntervalIntegrable f volume a b)
    (hmeas : StronglyMeasurableAtFilter f (𝓝 b) volume)
    (hb : ContinuousAt f b) :
    HasDerivAt (fun u => ∫ x in a..u, f x) (f b) b :=
  intervalIntegral.integral_hasDerivAt_right hf hmeas hb

-- 第二基本定理：Newton–Leibniz 公式
example (f f' : ℝ → ℝ) (a b : ℝ)
    (hderiv : ∀ x ∈ Set.uIcc a b, HasDerivAt f (f' x) x)
    (hint : IntervalIntegrable f' volume a b) :
    ∫ y in a..b, f' y = f b - f a :=
  intervalIntegral.integral_eq_sub_of_hasDerivAt hderiv hint
```

### 4.4 积分的性质

1. **线性性**：
   $$
   \int_a^b (cf+g)=c\int_a^b f+\int_a^b g.
   $$
2. **区间可加性**：
   $$
   \int_a^b f+\int_b^c f=\int_a^c f.
   $$
3. **保序性**：若 $f\le g$，则 $\int_a^b f\le\int_a^b g$。
4. **换元法**：
   $$
   \int_{g(a)}^{g(b)} f(u)\,du
   =\int_a^b f(g(x))g'(x)\,dx.
   $$
5. **分部积分**：
   $$
   \int_a^b f(x)g'(x)\,dx
   =\bigl[f(x)g(x)\bigr]_a^b-\int_a^b f'(x)g(x)\,dx.
   $$

Lean 中：

```lean
-- 区间可加性
#check intervalIntegral.integral_add_adjacent_intervals

-- 换元法
#check intervalIntegral.integral_comp_mul_left
#check intervalIntegral.integral_comp_sub_left
```

---

## 5. 全纯函数

### 5.1 定义

**定义 5.1（全纯 / 复可微）**
设 $f:\mathbb{C}\to\mathbb{C}$，$z\in\mathbb{C}$。若极限
$$
f'(z)
=\lim_{h\to0}\frac{f(z+h)-f(z)}{h}
\qquad(h\in\mathbb{C})
$$
存在，则称 $f$ 在 $z$ 处**全纯**（holomorphic），也称**复可微**。

关键点：$h$ 可以在复平面上从**任意方向**趋于 $0$。这比实可微强得多：实可微只要求从左右两个方向逼近，复可微要求从无穷多个方向逼近都得到同一个极限。

**Lean 4 写法**：

```lean
-- 全纯点就是复可微点
def HolomorphicAtPoint (f : ℂ → ℂ) (z : ℂ) : Prop :=
  DifferentiableAt ℂ f z

-- Mathlib 中没有单独的 `HolomorphicAt` 名字：
-- 复可微用 `DifferentiableAt ℂ f z`
-- 开集上的解析性用 `AnalyticAt ℂ f z` / `AnalyticOn ℂ f s`
#check DifferentiableAt
#check AnalyticAt
#check AnalyticOn
```

### 5.2 Cauchy–Riemann 方程

把复函数写成
$$
f(x+iy)=u(x,y)+iv(x,y),
$$
其中 $u,v:\mathbb{R}^2\to\mathbb{R}$ 是实值函数。

若 $f$ 在 $z=x+iy$ 处全纯，则 $u,v$ 满足 **Cauchy–Riemann 方程**：
$$
\frac{\partial u}{\partial x}
=\frac{\partial v}{\partial y},
\qquad
\frac{\partial u}{\partial y}
=-\frac{\partial v}{\partial x}.
$$

反过来，若 $u,v$ 连续可微且满足 Cauchy–Riemann 方程，则 $f=u+iv$ 全纯。

**例 5.2（不满足 Cauchy–Riemann 的函数）**

1. $f(z)=\bar z$。写 $z=x+iy$，则
   $$
   f(z)=x-iy,
   $$
   所以 $u=x$，$v=-y$。于是
   $$
   u_x=1,\quad v_y=-1,
   $$
   $u_x\ne v_y$，Cauchy–Riemann 方程不成立，故 $f$ 不是全纯函数。
2. $f(z)=\vert z\vert^2=x^2+y^2$。则 $u=x^2+y^2$，$v=0$，
   $$
   u_x=2x,\quad v_y=0,\quad u_y=2y,\quad v_x=0.
   $$
   Cauchy–Riemann 方程只在 $x=y=0$ 时成立，所以 $f$ 只在 $z=0$ 处复可微，不在任何开集上全纯。

### 5.3 全纯与解析

**定理 5.3**
若 $f$ 在开集 $U\subseteq\mathbb{C}$ 上全纯，则 $f$ 在 $U$ 上**解析**：每一点附近都可以展开成幂级数
$$
f(z)=\sum_{n=0}^{\infty}a_n(z-z_0)^n.
$$

这是复分析与实分析最重要的区别之一：实函数可微不蕴含解析（例如 $e^{-1/x^2}$ 在 $0$ 处所有阶导数都为 $0$，但在 $0$ 附近不恒等于 Taylor 级数）；而复函数在开集上可微就自动解析。

Lean 中：

```lean
-- 开集上：复可微 ⇒ 解析
example (f : ℂ → ℂ) (s : Set ℂ) (hs : IsOpen s)
    (hf : DifferentiableOn ℂ f s) :
    AnalyticOn ℂ f s :=
  hf.analyticOn hs

-- 解析 ⇒ 复可微
example (f : ℂ → ℂ) (s : Set ℂ)
    (hf : AnalyticOn ℂ f s) :
    DifferentiableOn ℂ f s :=
  hf.differentiableOn
```

### 5.4 全纯函数的例子

1. **多项式**：$z^n$、$a_nz^n+\cdots+a_0$ 都在 $\mathbb{C}$ 上全纯。
2. **指数函数**：
   $$
   e^z=\sum_{n=0}^{\infty}\frac{z^n}{n!},
   $$
   在全平面全纯，且 $(e^z)'=e^z$。
3. **三角函数**：
   $$
   \sin z=\frac{e^{iz}-e^{-iz}}{2i},\qquad
   \cos z=\frac{e^{iz}+e^{-iz}}{2},
   $$
   在全平面全纯，且 $(\sin z)'=\cos z$，$(\cos z)'=-\sin z$。
4. **有理函数**：在分母不为零的点全纯。

Lean 中：

```lean
-- exp 在全平面全纯，导数是自身
example (z : ℂ) : HasDerivAt Complex.exp (Complex.exp z) z :=
  Complex.hasDerivAt_exp z

-- sin 的导数是 cos
example (z : ℂ) : HasDerivAt Complex.sin (Complex.cos z) z :=
  Complex.hasDerivAt_sin z

-- cos 的导数是 -sin
example (z : ℂ) : HasDerivAt Complex.cos (-Complex.sin z) z :=
  Complex.hasDerivAt_cos z
```

### 5.5 全纯函数的关键定理

**Cauchy 积分定理**
若 $f$ 在单连通区域 $D$ 上全纯，$\gamma$ 是 $D$ 内的闭曲线，则
$$
\oint_\gamma f(z)\,dz=0.
$$

**Cauchy 积分公式**
若 $f$ 在 $D$ 上全纯，$z_0\in D$，则
$$
f(z_0)=\frac{1}{2\pi i}\oint_\gamma\frac{f(z)}{z-z_0}\,dz,
$$
其中 $\gamma$ 是围绕 $z_0$ 的简单闭曲线。

**Liouville 定理**
若 $f:\mathbb{C}\to\mathbb{C}$ 全纯且有界，则 $f$ 是常数。

**最大模原理**
若 $f$ 在区域 $D$ 上全纯且非常数，则 $\vert f\vert$ 在 $D$ 内不能取得最大值。

**唯一性定理（identity theorem）**
若两个全纯函数在区域内有极限点相同的集合上相等，则它们在整个区域上相等。

**开映射定理**
非常数全纯函数把开集映成开集。

这些定理说明：全纯函数的结构比一般的实可微函数刚性得多。

---

## 6. 概念之间的关系

```text
                    极限
                     │
                     │ 极限存在且等于函数值
                     ▼
                   连续
                     │
                     │ 差商极限存在
                     ▼
                  实可微 ───────────────┐
                     │                   │
                     │ 变上限积分求导     │ 把 ℝ 换成 ℂ
                     ▼                   │ 并要求 h 从任意方向趋于 0
                   积分 ◀── FTC ──▶ 微分  │
                                         ▼
                                       全纯
                                         │
                                         │ 开集上等价
                                         ▼
                                       解析
```

几个关键关系：

1. **可微 ⇒ 连续**：可微函数的差商极限存在，因此函数在该点连续。
2. **连续 ⇏ 可微**：$f(x)=\vert x\vert$ 在 $0$ 处连续但不可微。
3. **可微 ⇏ 连续可微**：$f(x)=x^2\sin(1/x)$（$x\ne0$），$f(0)=0$ 在 $0$ 处可微，但导数不连续。
4. **连续 ⇏ 可积？** 在闭区间上，连续函数一定 Riemann 可积。
5. **全纯 ⇒ 解析**：这是复分析的核心定理之一；实分析中没有对应结论。
6. **全纯 ⇒ 无穷次可微**：全纯函数自动有任意阶导数。
7. **FTC**：微分与积分在适当条件下互逆。

---

## 7. Lean 4 对照表

### 7.1 极限与连续

| 数学概念 | Lean 4 / Mathlib |
|----------|------------------|
| 数列极限 | `Filter.Tendsto a Filter.atTop (𝓝 L)` |
| 函数极限 | `Filter.Tendsto f (𝓝 a) (𝓝 L)` |
| 去心极限 | `Filter.Tendsto f (𝓝[≠] a) (𝓝 L)` |
| 点连续 | `ContinuousAt f a` |
| 连续 | `Continuous f` |
| 在集合上连续 | `ContinuousOn f s` |
| 一致连续 | `UniformContinuous f` |
| 连续 ⇒ 极限 | `ContinuousAt.tendsto` |
| 连续四则运算 | `ContinuousAt.add`、`ContinuousAt.mul`、`ContinuousAt.div` |
| 连续复合 | `ContinuousAt.comp` |

### 7.2 微分

| 数学概念 | Lean 4 / Mathlib |
|----------|------------------|
| 在一点可微且导数为 $f'$ | `HasDerivAt f f' a` |
| 导数函数 | `deriv f a` |
| 可微 | `DifferentiableAt ℝ f a` |
| 在集合上可微 | `DifferentiableOn ℝ f s` |
| 加法法则 | `HasDerivAt.add` |
| 乘法法则 | `HasDerivAt.mul` |
| 商法则 | `HasDerivAt.div` |
| 链式法则 | `HasDerivAt.comp` |
| 幂函数导数 | `hasDerivAt_pow` |
| 指数导数 | `Real.hasDerivAt_exp` |
| 正弦导数 | `Real.hasDerivAt_sin` |
| 余弦导数 | `Real.hasDerivAt_cos` |
| 中值定理 | `exists_deriv_eq_slope` |
| $n$ 阶导数 | `iteratedDeriv n f x` |

### 7.3 积分

| 数学概念 | Lean 4 / Mathlib |
|----------|------------------|
| 区间可积 | `IntervalIntegrable f volume a b` |
| 区间积分 | `∫ x in a..b, f x` |
| 积分线性性 | `intervalIntegral.integral_add` |
| 常数积分 | `intervalIntegral.integral_const` |
| 区间可加性 | `intervalIntegral.integral_add_adjacent_intervals` |
| 变上限积分求导 | `intervalIntegral.integral_hasDerivAt_right` |
| Newton–Leibniz 公式 | `intervalIntegral.integral_eq_sub_of_hasDerivAt` |
| 换元法 | `intervalIntegral.integral_comp_mul_left` |

### 7.4 全纯函数

| 数学概念 | Lean 4 / Mathlib |
|----------|------------------|
| 复可微 / 全纯 | `DifferentiableAt ℂ f z` |
| 在集合上复可微 | `DifferentiableOn ℂ f s` |
| 解析 | `AnalyticAt ℂ f z` |
| 在集合上解析 | `AnalyticOn ℂ f s` |
| 全纯 ⇒ 解析 | `DifferentiableOn.analyticOn` |
| 解析 ⇒ 全纯 | `AnalyticOn.differentiableOn` |
| 复指数导数 | `Complex.hasDerivAt_exp` |
| 复正弦导数 | `Complex.hasDerivAt_sin` |
| 复余弦导数 | `Complex.hasDerivAt_cos` |

> 注意：Mathlib 中没有名为 `HolomorphicAt` 的谓词。数学上的“全纯”直接写成 `DifferentiableAt ℂ f z`；在开集上，它与 `AnalyticAt ℂ f z` 等价。

---

## 8. 一句话总结

- **极限**：描述“无限接近”的语言。
- **连续**：极限等于函数值，函数图像不断裂。
- **微分**：用直线在局部逼近函数，差商的极限。
- **积分**：累积与面积，Riemann 和的极限；与微分通过微积分基本定理互逆。
- **全纯**：复可微，要求从任意复方向逼近都得到同一个导数；开集上全纯等价于解析，比实可微强得多。

从极限到连续，再到微分和积分，是实分析的主线；把实数换成复数，并要求差商在复意义下存在，就得到全纯函数，进入复分析的世界。
