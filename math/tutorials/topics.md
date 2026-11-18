# prompt

结合示例或者实际场景，分别介绍数学中贝叶斯分析、范畴、连分数、傅里叶变换等主题的概念、性质与应用，并补充到topics.md中

# content

# 数学专题：贝叶斯分析、范畴、连分数、傅里叶变换

> 本文用“概念 → 性质 → 实例/应用”的方式介绍四个看似分散、但都非常有用的数学主题。每个主题最后附一段 **Lean 4 / Mathlib** 关键代码，用 Lean 的词汇复述核心定义。代码是定义摘录，不追求完整可编译。

## 目录

1. [贝叶斯分析](#1-贝叶斯分析)
2. [范畴论](#2-范畴论)
3. [连分数](#3-连分数)
4. [傅里叶变换](#4-傅里叶变换)
5. [四个主题的联系与总结](#5-四个主题的联系与总结)

---

## 1. 贝叶斯分析

### 1.1 从医学检测说起

假设一种疾病的患病率是 $1\%$。有一种检测：

- 患病者中，$99\%$ 的人检测结果为阳性（灵敏度 $99\%$）；
- 未患病者中，$95\%$ 的人检测结果为阴性（特异度 $95\%$），也就是有 $5\%$ 的假阳性。

现在一个人检测结果为阳性。他真正患病的概率是多少？

很多人的第一反应是“$99\%$”。但正确答案约为 **$16.7\%$**。原因在于：这种病本身很罕见，大量健康人中的 $5\%$ 假阳性，会淹没真正患病者的 $99\%$ 真阳性。

这就是贝叶斯分析要解决的问题：**如何根据新证据更新对一个假设的信念**。

### 1.2 条件概率与贝叶斯公式

设 $A,B$ 是事件，$P(B)>0$。条件概率定义为
$$
P(A\mid B)=\frac{P(A\cap B)}{P(B)}.
$$
它表示“已知 $B$ 发生”的前提下，$A$ 发生的概率。

由条件概率的对称性，
$$
P(A\cap B)=P(A\mid B)P(B)=P(B\mid A)P(A),
$$
立刻得到**贝叶斯公式**：
$$
P(A\mid B)=\frac{P(B\mid A)P(A)}{P(B)}.
$$

更常用的是把分母展开。若 $A_1,\dots,A_n$ 是样本空间的一个划分，则
$$
P(A_i\mid B)
=\frac{P(B\mid A_i)P(A_i)}
{\sum_{j=1}^{n}P(B\mid A_j)P(A_j)}.
$$

### 1.3 先验、似然、后验

在贝叶斯统计中，把公式中的三项分别命名：

- **先验（prior）** $P(A)$：在看到证据之前对假设的信念；
- **似然（likelihood）** $P(B\mid A)$：假设成立时，观察到证据 $B$ 的概率；
- **后验（posterior）** $P(A\mid B)$：看到证据之后，对假设的更新信念。

于是贝叶斯公式可以概括成一句口诀：

> **后验 ∝ 似然 × 先验**

即
$$
P(A\mid B)\propto P(B\mid A)\cdot P(A).
$$

分母 $P(B)$ 只是归一化常数，保证后验概率加起来等于 $1$。

### 1.4 连续情形

若参数 $\theta$ 连续取值，先验是密度 $p(\theta)$，似然是 $p(D\mid\theta)$，则后验密度为
$$
p(\theta\mid D)
=\frac{p(D\mid\theta)p(\theta)}
{\int p(D\mid\theta')p(\theta')\,d\theta'}.
$$
同样可以简写成
$$
p(\theta\mid D)\propto p(D\mid\theta)p(\theta).
$$

### 1.5 例：医学检测的完整计算

回到开头的例子。设

- $D$：患病，$P(D)=0.01$；
- $+$：检测阳性；
- $P(+\mid D)=0.99$；
- $P(+\mid \neg D)=0.05$。

先算检测阳性的总概率：
$$
P(+)=P(+\mid D)P(D)+P(+\mid\neg D)P(\neg D)
=0.99\times0.01+0.05\times0.99
=0.0594.
$$
于是
$$
P(D\mid +)
=\frac{P(+\mid D)P(D)}{P(+)}
=\frac{0.99\times0.01}{0.0594}
\approx0.1667.
$$
所以检测阳性后，真正患病的概率约为 **$16.7\%$**。

这个例子说明：

1. 先验（患病率 $1\%$）非常重要；
2. 假阳性率即使只有 $5\%$，在低患病率人群中也会产生大量假阳性；
3. 一次阳性结果不一定足以确诊，通常需要复查或结合其他证据。

### 1.6 例：朴素贝叶斯垃圾邮件过滤

设

- $S$：邮件是垃圾邮件，$P(S)=0.3$；
- $H$：邮件是正常邮件，$P(H)=0.7$；
- 邮件中出现“免费”这个词记为 $W$；
- $P(W\mid S)=0.8$，$P(W\mid H)=0.1$。

看到“免费”后：
$$
P(S\mid W)
=\frac{P(W\mid S)P(S)}
{P(W\mid S)P(S)+P(W\mid H)P(H)}
=\frac{0.8\times0.3}{0.8\times0.3+0.1\times0.7}
=\frac{0.24}{0.31}
\approx0.774.
$$
所以这封邮件有约 $77.4\%$ 的概率是垃圾邮件。

实际垃圾邮件过滤器会同时使用很多词。**朴素贝叶斯**假设在给定类别的情况下，各个词的出现相互独立：
$$
P(w_1,\dots,w_n\mid S)\approx\prod_{i=1}^{n}P(w_i\mid S).
$$
这个假设通常不成立，但计算简单、效果不错，是经典的文本分类基线。

### 1.7 共轭先验：Beta–Binomial 模型

考虑抛硬币，正面概率为 $\theta$。若先验为 Beta 分布
$$
\theta\sim\operatorname{Beta}(\alpha,\beta),
$$
其密度为
$$
p(\theta)\propto\theta^{\alpha-1}(1-\theta)^{\beta-1}.
$$
观测到 $k$ 次正面、$n-k$ 次反面，似然为
$$
p(D\mid\theta)\propto\theta^{k}(1-\theta)^{n-k}.
$$
后验为
$$
p(\theta\mid D)\propto\theta^{\alpha+k-1}(1-\theta)^{\beta+n-k-1},
$$
即
$$
\theta\mid D\sim\operatorname{Beta}(\alpha+k,\ \beta+n-k).
$$
Beta 先验与二项似然共轭：后验仍然是 Beta 分布，只是参数更新为 $\alpha+k,\beta+n-k$。

例如先验 $\operatorname{Beta}(2,2)$（均值 $0.5$），观测 $10$ 次抛掷中 $7$ 次正面，则后验为
$$
\operatorname{Beta}(9,5),
$$
均值为
$$
\frac{9}{9+5}=\frac{9}{14}\approx0.643.
$$

### 1.8 贝叶斯分析的性质

1. **序贯更新**：先验 → 数据 $D_1$ → 后验 $p(\theta\mid D_1)$ → 把后验当作新先验，再看 $D_2$，结果与一次性看 $D_1,D_2$ 相同。
2. **共轭性**：某些先验–似然组合下，后验与先验同族，计算方便。常见共轭对：
   - Beta–Binomial；
   - Dirichlet–Multinomial；
   - Normal–Normal（已知方差）；
   - Gamma–Poisson。
3. **充分统计量**：后验只通过充分统计量依赖数据。例如 Beta–Binomial 中只需要 $k$ 和 $n$。
4. **后验预测**：给定数据后，对新观测的预测分布为
   $$
   p(x_{\text{new}}\mid D)
   =\int p(x_{\text{new}}\mid\theta)p(\theta\mid D)\,d\theta.
   $$
5. **贝叶斯决策**：选择使后验期望损失最小的行动：
   $$
   a^*=\arg\min_{a}\mathbb{E}_{\theta\mid D}\bigl[L(\theta,a)\bigr].
   $$
6. **大样本一致性**：在正则条件下，后验会集中在真实参数附近（Bernstein–von Mises 定理）。
7. **先验的影响**：数据越多，先验的影响越弱；数据越少，先验越重要。

### 1.9 贝叶斯分析的应用场景

- **医学诊断**：结合患病率、灵敏度和特异度计算阳性后的患病概率。
- **垃圾邮件过滤**：朴素贝叶斯分类器。
- **A/B 测试**：用 Beta 先验比较两个转化率，直接给出“A 比 B 好的概率”。
- **推荐系统**：用户兴趣的贝叶斯更新、 Thompson 采样。
- **贝叶斯优化**：用高斯过程先验优化昂贵的目标函数，常用于超参数调优。
- **金融与保险**：风险建模、索赔频率与金额的后验估计。
- **语音识别与自然语言处理**：经典贝叶斯模型、隐马尔可夫模型。
- **不确定性量化**：贝叶斯神经网络、集成方法。
- **Kalman 滤波**：线性高斯状态空间模型的贝叶斯递推，广泛用于导航、控制、机器人。

### 1.10 Lean 4 代码

```lean
-- 条件概率：μ[t | s] 表示“在事件 s 发生的条件下，事件 t 的概率”
#check ProbabilityTheory.cond

-- 条件概率的定义：μ[t | s] = (μ s)⁻¹ * μ (s ∩ t)
#check ProbabilityTheory.cond_apply

-- 贝叶斯公式：μ[t | s] = (μ s)⁻¹ * μ[s | t] * μ t
-- 这正是 P(T | S) = P(S | T) * P(T) / P(S)
#check ProbabilityTheory.cond_eq_inv_mul_cond_mul

-- 概率测度的类型类
#check MeasureTheory.IsProbabilityMeasure

-- 用实数读取测度的值：μ.real s 就是 μ(s) 的实数值
#check MeasureTheory.Measure.real
```

---

## 2. 范畴论

### 2.1 为什么需要范畴论

数学里到处是“对象”和“对象之间的映射”：

- 集合与函数；
- 群与群同态；
- 拓扑空间与连续映射；
- 向量空间与线性映射；
- 类型与程序。

范畴论把这些结构抽象成统一的语言：**只关心对象之间如何映射、映射如何复合**，而不关心对象内部由什么构成。

它的价值在于：

1. 统一不同数学领域的概念；
2. 把“构造”变成“泛性质”（universal property）；
3. 为函数式编程、类型论、量子信息、数据库等提供形式化语言。

### 2.2 范畴的定义

一个**范畴** $\mathcal{C}$ 由以下数据组成：

1. 一类**对象** $\operatorname{Ob}(\mathcal{C})$；
2. 对每对对象 $X,Y$，一个**态射集合** $\operatorname{Hom}_{\mathcal{C}}(X,Y)$；
3. 对态射 $f:X\to Y$、$g:Y\to Z$，有**复合** $g\circ f:X\to Z$；
4. 每个对象 $X$ 有**单位态射** $\operatorname{id}_X:X\to X$。

并要求：

- **结合律**：$h\circ(g\circ f)=(h\circ g)\circ f$；
- **单位律**：$f\circ\operatorname{id}_X=f=\operatorname{id}_Y\circ f$。

用交换图表示，就是
$$
\begin{array}{ccc}
X & \xrightarrow{f} & Y \\
 & \searrow & \underset{g}{\downarrow} \\
 & & Z
\end{array}
$$
必须交换：两条路径 $X\to Y\to Z$ 与 $X\to Z$ 给出同一个态射 $g\circ f$。

### 2.3 范畴的例子

| 范畴 | 对象 | 态射 |
|------|------|------|
| $\mathbf{Set}$ | 集合 | 函数 |
| $\mathbf{Grp}$ | 群 | 群同态 |
| $\mathbf{Top}$ | 拓扑空间 | 连续映射 |
| $\mathbf{Vect}_k$ | $k$ 上的向量空间 | 线性映射 |
| $\mathbf{Poset}$ | 偏序集的元素 | $x\le y$ 时有一个态射 $x\to y$ |
| 幺半群 | 只有一个对象 | 幺半群的元素 |
| Haskell 类型 | 类型 | 函数 |

最后两个例子很重要：

- **偏序集是范畴**：对象是元素，$x\le y$ 时恰好有一个态射 $x\to y$；态射复合就是不等式的传递性。
- **幺半群是单对象范畴**：唯一的对象记作 $\star$，态射是幺半群的元素，复合就是乘法，单位态射就是幺半群的单位元。

### 2.4 函子

**函子（functor）** $F:\mathcal{C}\to\mathcal{D}$ 把范畴 $\mathcal{C}$ 映到范畴 $\mathcal{D}$：

- 每个对象 $X$ 映为对象 $F(X)$；
- 每个态射 $f:X\to Y$ 映为态射 $F(f):F(X)\to F(Y)$；
- 保持复合：$F(g\circ f)=F(g)\circ F(f)$；
- 保持单位：$F(\operatorname{id}_X)=\operatorname{id}_{F(X)}$。

例子：

1. **遗忘函子** $U:\mathbf{Grp}\to\mathbf{Set}$：把群映成它的底层集合，把群同态映成函数，忘掉群结构。
2. **自由函子** $F:\mathbf{Set}\to\mathbf{Grp}$：把集合 $X$ 映成由 $X$ 生成的自由群。
3. **List 函子**：在 Haskell 中，`[]` 把类型 `a` 映成 `[a]`，把函数 `f : a -> b` 映成 `map f : [a] -> [b]`。
4. **基本群** $\pi_1:\mathbf{Top}_*\to\mathbf{Grp}$：把带基点拓扑空间映成基本群。

函子的两条定律正是编程中 `Functor` 类型类必须满足的定律：

```lean
-- 函子的两条定律在 Mathlib 中是 `CategoryTheory.Functor` 的字段
-- 保持单位：F.map (𝟙 X) = 𝟙 (F.obj X)
#check CategoryTheory.Functor.map_id

-- 保持复合：F.map (f ≫ g) = F.map f ≫ F.map g
#check CategoryTheory.Functor.map_comp
```

### 2.5 自然变换

设 $F,G:\mathcal{C}\to\mathcal{D}$ 是两个函子。**自然变换** $\eta:F\Rightarrow G$ 是一族态射
$$
\eta_X:F(X)\to G(X)\qquad(X\in\mathcal{C}),
$$
使得对每个态射 $f:X\to Y$，下图交换：
$$
\begin{array}{ccc}
F(X) & \xrightarrow{F(f)} & F(Y) \\
\underset{\eta_X}{\downarrow} & & \underset{\eta_Y}{\downarrow} \\
G(X) & \xrightarrow{G(f)} & G(Y)
\end{array}
$$
即
$$
G(f)\circ\eta_X=\eta_Y\circ F(f).
$$

直观上，自然变换是“在两个函子之间做统一转换”的方式。

例子：

1. `reverse : [a] -> [a]` 是 List 函子到自身的自然变换：先反转再 `map f`，等于先 `map f` 再反转。
2. `safeHead : [a] -> Maybe a` 是 List 函子到 Maybe 函子的自然变换。
3. 在代数中，行列式可以看成从一般线性群函子到单位群函子的自然变换。

### 2.6 积、余积与极限

**积（product）** 是满足泛性质的构造。对象 $X$ 与 $Y$ 的积是一个对象 $X\times Y$，配有投影
$$
\pi_1:X\times Y\to X,\qquad
\pi_2:X\times Y\to Y,
$$
使得对任意对象 $Z$ 和态射 $f:Z\to X$、$g:Z\to Y$，存在唯一态射
$$
\langle f,g\rangle:Z\to X\times Y
$$
使下图交换：
$$
\begin{array}{ccc}
& Z & \\
& \underset{f}{\swarrow}\ \underset{g}{\searrow} & \\
X & \xleftarrow{\pi_1} X\times Y & \xrightarrow{\pi_2} Y
\end{array}
$$

- 在 $\mathbf{Set}$ 中，积就是笛卡尔积；
- 在 $\mathbf{Vect}_k$ 中，积就是直和；
- 在编程中，积就是元组/记录类型。

**余积（coproduct）** 是对偶概念，把箭头反向：

- 在 $\mathbf{Set}$ 中，余积是不交并；
- 在编程中，余积是联合类型（Haskell 的 `Either`、Rust 的 `enum`）。

**极限（limit）** 和**余极限（colimit）** 把积、拉回、等化子等构造统一起来。数据库理论中，表的连接（join）可以看成某种极限。

### 2.7 伴随

**伴随（adjunction）** 是范畴论中最重要的概念之一。称函子
$$
F:\mathcal{C}\to\mathcal{D},\qquad G:\mathcal{D}\to\mathcal{C}
$$
互为伴随，记作 $F\dashv G$，如果存在自然同构
$$
\operatorname{Hom}_{\mathcal{D}}(F(X),Y)
\cong
\operatorname{Hom}_{\mathcal{C}}(X,G(Y)).
$$

直观上，$F$ 是“自由构造”，$G$ 是“遗忘结构”。例子：

- 自由群函子 $\dashv$ 遗忘函子；
- 自由向量空间函子 $\dashv$ 遗忘函子；
- 在编程中，柯里化对应伴随：
  $$
  \operatorname{Hom}(A\times B,C)\cong\operatorname{Hom}(A,C^B).
  $$

### 2.8 Yoneda 引理

Yoneda 引理说：一个对象 $X$ 被它到所有对象的态射“完全决定”。更精确地，对函子 $F:\mathcal{C}\to\mathbf{Set}$，
$$
\operatorname{Nat}\bigl(\operatorname{Hom}_{\mathcal{C}}(X,-),F\bigr)
\cong F(X).
$$

通俗地说：**想知道一个对象是什么，就看它与所有其他对象如何发生关系。** 这与“一个函数由它在所有点上的取值决定”是同一思想。

### 2.9 单子

**单子（monad）** 是自函子 $T:\mathcal{C}\to\mathcal{C}$ 加上两个自然变换
$$
\eta:\operatorname{Id}\Rightarrow T,\qquad
\mu:T\circ T\Rightarrow T,
$$
满足结合律与单位律。

在编程中，单子用来描述“带副作用的计算”：

- `Maybe` 单子：可能失败的计算；
- `List` 单子：非确定性计算；
- `IO` 单子：输入输出；
- `State` 单子：可变状态；
- `Parser` 单子：解析器组合。

Haskell 的 `>>=`（bind）就是单子结构的体现。

### 2.10 范畴论的应用

- **函数式编程**：`Functor`、`Applicative`、`Monad`、`Monoid` 等类型类直接来自范畴论。
- **类型论与证明助手**：Curry–Howard–Lambek 对应——命题是类型，证明是程序，笛卡尔闭范畴是模型。
- **数据库**：模式可以看成范畴，实例看成函子，数据迁移看成函子之间的自然变换；连接可以看成极限。
- **量子信息**：dagger 范畴、紧致闭范畴、字符串图用于描述量子协议。
- **代数拓扑**：基本群、同调、上同调都是函子。
- **代数几何**：层（sheaf）是函子，层上同调是导出函子。
- **机器学习**：用范畴论描述组合式模型、optics、梯度下降的结构；字符串图用于概率模型。
- **控制系统与信号处理**：用 monoidal category 描述线性系统与信号流图。

### 2.11 Lean 4 代码

```lean
-- 范畴：对象、态射、复合、单位态射
#check CategoryTheory.Category
#check CategoryTheory.CategoryStruct

-- 函子：范畴之间的结构保持映射
#check CategoryTheory.Functor

-- 自然变换：两个函子之间的统一转换
#check CategoryTheory.NatTrans

-- 同构：对象之间的可逆态射
#check CategoryTheory.Iso

-- 伴随：F ⊣ G
#check CategoryTheory.Adjunction

-- 极限与余极限
#check CategoryTheory.Limits.HasLimit
#check CategoryTheory.Limits.HasColimit

-- 类型范畴：对象是 Type，态射是函数
#check CategoryTheory.types
```

---

## 3. 连分数

### 3.1 定义

**连分数**是把一个数写成
$$
a_0+\cfrac{1}{a_1+\cfrac{1}{a_2+\cfrac{1}{a_3+\cdots}}}
$$
的形式，其中 $a_0\in\mathbb{Z}$，$a_1,a_2,\dots$ 是正整数。

记作
$$
[a_0;a_1,a_2,\dots].
$$

若序列有限，称为**有限连分数**；若无限，称为**无限连分数**。

**简单连分数**要求：

- $a_0$ 是整数；
- $a_i$ 是正整数（$i\ge1$）；
- 通常要求最后一项 $a_n\ge2$，以保证表示唯一。

### 3.2 展开算法

给定实数 $x$，连分数可以通过反复取整数部分和小数部分得到：

$$
\begin{aligned}
a_0&=\lfloor x\rfloor, & x_1&=\frac{1}{x-a_0},\\
a_1&=\lfloor x_1\rfloor, & x_2&=\frac{1}{x_1-a_1},\\
a_2&=\lfloor x_2\rfloor, & x_3&=\frac{1}{x_2-a_2},\\
&\vdots
\end{aligned}
$$

如果 $x$ 是有理数，这个过程就是**欧几里得算法**，一定会停止；如果 $x$ 是无理数，过程不会停止，得到无限连分数。

### 3.3 收敛子

设有限连分数
$$
[a_0;a_1,\dots,a_n]
$$
的值为 $p_n/q_n$。收敛子满足递推：
$$
\begin{aligned}
p_{-2}&=0, & p_{-1}&=1, & p_n&=a_np_{n-1}+p_{n-2},\\
q_{-2}&=1, & q_{-1}&=0, & q_n&=a_nq_{n-1}+q_{n-2}.
\end{aligned}
$$
其中 $p_n/q_n$ 就是第 $n$ 个**收敛子（convergent）**。

**行列式恒等式**：
$$
p_nq_{n-1}-p_{n-1}q_n=(-1)^{n-1}.
$$
因此 $p_n$ 与 $q_n$ 互素，且
$$
\frac{p_n}{q_n}-\frac{p_{n-1}}{q_{n-1}}
=\frac{(-1)^{n-1}}{q_nq_{n-1}}.
$$
所以收敛子在真实值两侧交替摆动，并逐渐逼近。

**误差估计**：
$$
\left|x-\frac{p_n}{q_n}\right|
<\frac{1}{q_nq_{n+1}}
<\frac{1}{q_n^2}.
$$

### 3.4 连分数的性质

1. **有理数 ⇔ 有限连分数**：一个实数是有理数，当且仅当它的简单连分数有限。
2. **二次无理数 ⇔ 周期连分数**（Lagrange 定理）：一个无理数是二次无理数（即某个整系数二次方程的根），当且仅当它的连分数最终周期。
3. **最佳有理逼近**：收敛子给出了分母不超过 $q_n$ 的最佳有理逼近。更精确地，若
   $$
   \left|x-\frac{p}{q}\right|<\frac{1}{2q^2},
   $$
   则 $p/q$ 一定是 $x$ 的某个收敛子（Legendre 定理）。
4. **交替逼近**：收敛子在真实值两侧交替，偶数项在一侧，奇数项在另一侧。
5. **黄金比例最慢收敛**：$\varphi=[1;1,1,1,\dots]$ 的收敛子是 Fibonacci 数之比，收敛速度最慢，因此 $\varphi$ 被称为“最无理的数”。

### 3.5 例子

**例 3.1（有理数）**
$$
\frac{415}{93}=[4;2,6,7].
$$
验证：
$$
4+\cfrac{1}{2+\cfrac{1}{6+\cfrac{1}{7}}}
=4+\frac{1}{2+\frac{1}{6+\frac17}}
=4+\frac{1}{2+\frac{7}{43}}
=4+\frac{43}{93}
=\frac{415}{93}.
$$

**例 3.2（$\sqrt2$）**
$$
\sqrt2=[1;2,2,2,\dots].
$$
收敛子依次为
$$
1,\ \frac{3}{2},\ \frac{7}{5},\ \frac{17}{12},\ \frac{41}{29},\dots
$$
它们正是 $\sqrt2$ 的一串有理逼近。

**例 3.3（黄金比例）**
$$
\varphi=\frac{1+\sqrt5}{2}=[1;1,1,1,\dots].
$$
收敛子是
$$
1,\ \frac{2}{1},\ \frac{3}{2},\ \frac{5}{3},\ \frac{8}{5},\ \frac{13}{8},\dots
$$
即相邻 Fibonacci 数之比。

**例 3.4（$\pi$）**
$$
\pi=[3;7,15,1,292,1,1,1,2,\dots].
$$
其中
$$
\frac{355}{113}=[3;7,15,1]
$$
是著名的“密率”，精度极高：
$$
\left|\pi-\frac{355}{113}\right|\approx2.67\times10^{-7}.
$$

**例 3.5（$e$）**
$$
e=[2;1,2,1,1,4,1,1,6,1,1,8,\dots],
$$
呈现明显的规律。

### 3.6 连分数的应用

1. **日历与闰年**
   一个回归年约为 $365.2422$ 天。小数部分 $0.2422$ 的连分数给出近似：
   $$
   \frac14,\quad\frac{7}{29},\quad\frac{8}{33},\quad\frac{31}{128},\dots
   $$
   - $1/4$ 对应儒略历“每四年一闰”；
   - $8/33$ 对应波斯历的高精度闰年规则；
   - 格里高利历采用 $97/400$，是另一个平衡精度与周期长度的选择。

2. **音乐与十二平均律**
   纯五度的频率比是 $3/2$。取以 $2$ 为底的对数：
   $$
   \log_2\frac32\approx0.58496.
   $$
   它的连分数收敛子包括
   $$
   \frac{7}{12},\quad\frac{24}{41},\dots
   $$
   $7/12$ 正是“十二平均律”：$12$ 个半音中取 $7$ 个半音，近似纯五度。$24/41$ 给出更精细的划分。

3. **齿轮传动**
   设计齿轮比时，希望用较小的齿数逼近目标传动比。连分数的收敛子给出分母较小的最佳逼近，常用于齿轮组设计。

4. **RSA 的 Wiener 攻击**
   在 RSA 中，若私钥指数 $d$ 太小，满足
   $$
   d<\frac{1}{3}N^{1/4},
   $$
   则 $d$ 是 $e/N$ 的某个连分数收敛子。攻击者可以用连分数快速恢复 $d$。这提醒我们：RSA 的私钥指数不能太小。

5. **Pell 方程**
   方程
   $$
   x^2-ny^2=1
   $$
   的正整数解可以由 $\sqrt n$ 的连分数收敛子得到。这是连分数最经典的应用之一。

6. **无理数证明**
   若 $x$ 的连分数无限，则 $x$ 是无理数。这给出了证明 $\sqrt2$、$e$、$\pi$ 等无理性的统一框架。

7. **数值分析与有理逼近**
   在滤波器设计、控制系统、计算机算术中，常用连分数寻找满足误差要求且分母较小的有理近似。

### 3.7 Lean 4 代码

```lean
-- 广义连分数：允许系数来自任意除法环
#check GenContFract

-- 简单连分数：系数为自然数，且从某一项开始为正
#check ContFract

-- 由实数构造连分数
#check GenContFract.of
#check ContFract.of

-- 收敛子序列：g.convs 给出第 n 个收敛子
#check GenContFract.convs

-- 黄金比例
#check Real.goldenRatio
```

---

## 4. 傅里叶变换

### 4.1 直观

傅里叶变换把函数或信号从**时间/空间域**变到**频率域**。

一个类比：一束白光通过棱镜后分解成不同颜色的光。傅里叶变换就是数学上的“棱镜”：

- 输入：一个随时间变化的信号 $f(t)$；
- 输出：它在每个频率 $\xi$ 上的“成分” $\hat f(\xi)$。

如果 $f$ 是声音，$\hat f$ 告诉你每个音高（频率）的强度；如果 $f$ 是图像，$\hat f$ 告诉你每个空间频率的强度。

### 4.2 定义

对 $f:\mathbb{R}\to\mathbb{C}$，定义**傅里叶变换**
$$
\hat f(\xi)
=\int_{-\infty}^{\infty}f(x)e^{-2\pi i x\xi}\,dx.
$$
**逆变换**为
$$
f(x)
=\int_{-\infty}^{\infty}\hat f(\xi)e^{2\pi i x\xi}\,d\xi.
$$

不同教材可能采用不同的归一化约定，例如
$$
\hat f(\xi)=\frac{1}{\sqrt{2\pi}}\int f(x)e^{-ix\xi}\,dx,
$$
但核心思想相同：**把函数分解成不同频率的复指数波**。

在 $\mathbb{R}^n$ 上，定义类似：
$$
\hat f(\xi)=\int_{\mathbb{R}^n}f(x)e^{-2\pi i x\cdot\xi}\,dx,
$$
其中 $x\cdot\xi$ 是点积。

### 4.3 基本性质

设 $f,g$ 的傅里叶变换存在。

1. **线性性**：
   $$
   \widehat{af+bg}=a\hat f+b\hat g.
   $$
2. **平移**：
   $$
   \widehat{f(\cdot-a)}(\xi)=e^{-2\pi ia\xi}\hat f(\xi).
   $$
   时域平移对应频域乘一个相位因子。
3. **调制**：
   $$
   \widehat{e^{2\pi iax}f(x)}(\xi)=\hat f(\xi-a).
   $$
   时域乘复指数对应频域平移。
4. **伸缩**：
   $$
   \widehat{f(ax)}(\xi)=\frac{1}{\vert a\vert}\hat f\left(\frac{\xi}{a}\right).
   $$
   时域压缩对应频域展宽，反之亦然。
5. **卷积定理**：
   $$
   \widehat{f*g}=\hat f\cdot\hat g,
   $$
   其中
   $$
   (f*g)(x)=\int f(y)g(x-y)\,dy.
   $$
   时域卷积对应频域乘积；这是滤波理论的基础。
6. **微分**：
   $$
   \widehat{f'}(\xi)=2\pi i\xi\hat f(\xi).
   $$
   微分变成乘以频率，这是傅里叶变换能解微分方程的原因。
7. **Plancherel / Parseval 定理**：
   $$
   \int\vert f(x)\vert^2\,dx
   =\int\vert\hat f(\xi)\vert^2\,d\xi.
   $$
   能量守恒：时域的总能量等于频域的总能量。
8. **傅里叶反演**：在适当条件下，
   $$
   f(x)=\int\hat f(\xi)e^{2\pi ix\xi}\,d\xi.
   $$
9. **不确定性原理**：
   $$
   \Delta x\,\Delta\xi\ge\frac{1}{4\pi}.
   $$
   一个信号不能同时在时域和频域都极度集中。

### 4.4 典型例子

**例 4.1（矩形脉冲）**
设
$$
f(x)=\begin{cases}1,&\vert x\vert\le a,\\0,&\vert x\vert>a.\end{cases}
$$
则
$$
\hat f(\xi)=2a\,\frac{\sin(2\pi a\xi)}{2\pi a\xi}.
$$
矩形脉冲的傅里叶变换是 sinc 函数：时域越窄，频域越宽。

**例 4.2（高斯函数）**
$$
f(x)=e^{-\pi x^2}.
$$
则
$$
\hat f(\xi)=e^{-\pi\xi^2}.
$$
高斯函数是傅里叶变换的特征函数：变换后仍是高斯函数。

**例 4.3（常数与 delta 函数）**
形式上，
$$
\widehat{1}=\delta,\qquad
\widehat{\delta}=1.
$$
严格地说，这是分布意义下的等式。

**例 4.4（低频与高频）**
- 低频成分对应信号的整体趋势、缓慢变化；
- 高频成分对应细节、边缘、突变。

图像压缩（如 JPEG）正是利用这一点：保留低频，丢弃部分高频。

### 4.5 离散傅里叶变换与 FFT

计算机处理的是离散信号。对长度为 $N$ 的序列 $x_0,\dots,x_{N-1}$，**离散傅里叶变换（DFT）**为
$$
X_k=\sum_{n=0}^{N-1}x_n e^{-2\pi ikn/N},
\qquad k=0,1,\dots,N-1.
$$
逆变换为
$$
x_n=\frac{1}{N}\sum_{k=0}^{N-1}X_k e^{2\pi ikn/N}.
$$

直接计算 DFT 需要 $O(N^2)$ 次运算；**快速傅里叶变换（FFT）**利用对称性把复杂度降到
$$
O(N\log N).
$$
FFT 是 20 世纪最重要的算法之一，Cooley–Tukey 算法是其经典实现。

**采样定理（Nyquist–Shannon）**：若信号带宽不超过 $B$，则采样频率至少为 $2B$ 时，可以由采样点完全重建信号。这解释了为什么 CD 采用 $44.1\,\mathrm{kHz}$ 采样率（人耳可听频率上限约 $20\,\mathrm{kHz}$）。

### 4.6 傅里叶变换的应用

1. **音频处理**
   - 均衡器：增强或削弱某些频段；
   - 降噪：识别并抑制噪声频率；
   - MP3/AAC：利用人耳听觉特性压缩频域系数；
   - 语音识别：频谱图（spectrogram）是语音特征的基础。

2. **图像处理**
   - JPEG：使用离散余弦变换（DCT），与 DFT 密切相关；
   - 图像滤波：低通滤波去噪、高通滤波锐化；
   - 压缩：保留低频系数，丢弃高频细节。

3. **医学成像**
   - MRI：采集的数据本身就是 k 空间（频域）数据，图像通过逆傅里叶变换重建；
   - CT：傅里叶切片定理把投影数据与二维傅里叶变换联系起来。

4. **通信**
   - OFDM（正交频分复用）：Wi-Fi、4G/5G、数字电视的核心技术；
   - 调制与解调：把信号搬到不同频段；
   - 信道估计与均衡。

5. **偏微分方程**
   - 热方程：傅里叶变换把空间导数变成乘法，把 PDE 变成 ODE；
   - 波动方程、Schrödinger 方程同样可以这样处理；
   - 谱方法（spectral methods）在科学计算中广泛使用。

6. **概率论**
   - 特征函数 $\varphi_X(t)=\mathbb{E}[e^{itX}]$ 就是概率密度的傅里叶变换；
   - 独立随机变量之和的特征函数是特征函数之积，对应卷积定理；
   - 中心极限定理的傅里叶证明。

7. **量子力学**
   - 位置表象与动量表象通过傅里叶变换联系；
   - 不确定性原理是傅里叶变换的数学后果。

8. **数论**
   - Poisson 求和公式；
   - theta 函数与 Riemann zeta 函数的函数方程；
   - 模形式。

9. **光学与晶体学**
   - 衍射图案是孔径函数的傅里叶变换；
   - X 射线晶体学通过衍射数据重建分子结构。

10. **机器学习**
    - 卷积神经网络（CNN）与卷积定理；
    - 傅里叶神经算子（FNO）用于求解 PDE；
    - 谱聚类、谱图理论。

### 4.7 Lean 4 代码

```lean
-- 傅里叶变换与逆变换
-- Mathlib 中使用类型类 `FourierTransform E F` 统一不同空间上的变换
#check FourierTransform.fourier
#check FourierTransformInv.fourierInv

-- 线性性：𝓕(f + g) = 𝓕 f + 𝓕 g
#check FourierAdd.fourier_add
#check FourierSMul.fourier_smul

-- L^p 空间：傅里叶变换通常定义在 L^1 或 L^2 上
#check MeasureTheory.Lp
```

下面是一段“示意性”的连续傅里叶变换定义，帮助把公式和代码对应起来：

```lean
-- 一维连续傅里叶变换（示意）
-- ∫ x : ℝ, ... 表示在 ℝ 上对 x 做积分
noncomputable def FourierTransform1D (f : ℝ → ℂ) (ξ : ℝ) : ℂ :=
  ∫ x : ℝ, f x * Complex.exp (-2 * Real.pi * Complex.I * x * ξ)

-- 离散傅里叶变换（DFT，示意）
noncomputable def DiscreteFourierTransform
    (N : ℕ) (x : Fin N → ℂ) (k : Fin N) : ℂ :=
  ∑ n : Fin N, x n * Complex.exp
    (-2 * Real.pi * Complex.I * (k : ℂ) * (n : ℂ) / (N : ℂ))
```

---

## 5. 四个主题的联系与总结

### 5.1 它们之间的联系

这四个主题看起来分属不同领域，但有一些有趣的联系：

- **贝叶斯分析与傅里叶变换**：概率分布的特征函数就是傅里叶变换；高斯分布在高斯先验、Kalman 滤波中同时出现。独立随机变量之和的分布对应卷积，而卷积在频域变成乘积。
- **范畴论与其余三者**：范畴论提供统一语言。概率映射可以组织成 Markov 范畴；信号处理中的线性系统可以用 monoidal category 描述；连分数可以看成某个动力系统的轨道。
- **连分数与傅里叶变换**：连分数研究实数的有理逼近，傅里叶变换研究函数的频率分解；两者都体现“用简单的基元逼近复杂对象”的思想——前者用 $1/(a+\cdots)$，后者用复指数波。
- **贝叶斯分析与连分数**：在某些数值贝叶斯计算中，需要用有理近似表示概率或分位数；连分数可以提供分母较小的精确近似。

### 5.2 总结表

| 主题 | 核心对象 | 关键性质 | 典型应用 |
|------|----------|----------|----------|
| 贝叶斯分析 | 先验、似然、后验 | 后验 ∝ 似然 × 先验；共轭先验；序贯更新 | 医学诊断、垃圾邮件过滤、A/B 测试、Kalman 滤波 |
| 范畴论 | 对象、态射、函子、自然变换 | 复合、泛性质、伴随、Yoneda | 函数式编程、数据库、量子信息、代数拓扑 |
| 连分数 | 整数序列 $[a_0;a_1,a_2,\dots]$ | 最佳有理逼近、交替收敛、周期性 | 日历、音乐、齿轮、RSA 攻击、Pell 方程 |
| 傅里叶变换 | 频率分解 $\hat f(\xi)$ | 卷积定理、Plancherel、不确定性原理 | 音频/图像处理、通信、PDE、MRI、量子力学 |

### 5.3 一句话总结

- **贝叶斯分析**：用新证据更新旧信念，后验 ∝ 似然 × 先验。
- **范畴论**：研究对象与态射的抽象语言，用泛性质统一数学结构。
- **连分数**：用整数序列给出实数的最佳有理逼近，是数论与数值分析的桥梁。
- **傅里叶变换**：把信号分解成频率，是信号处理、PDE 与量子力学的共同工具。
