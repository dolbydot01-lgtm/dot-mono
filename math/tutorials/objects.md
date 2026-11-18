# 数学指南

> 本文系统整理**群、环、域、向量空间**等基本代数结构：直观解释、严格定义、典型例子、相关定理，以及对应的关键 Lean 4 代码。文中的代码是 **Lean 4 / Mathlib 定义摘录**，不是完整可编译工程；重在展示数学概念在 Lean 中的写法和逐行注释。

## 目录

1. [记号约定](#0-记号约定)
2. [基本数系](#1-基本数系)
3. [预备：二元运算](#2-预备二元运算)
4. [半群与幺半群](#3-半群与幺半群)
5. [群](#4-群)
6. [环](#5-环)
7. [域](#6-域)
8. [向量空间](#7-向量空间)
9. [结构之间的关系](#8-结构之间的关系)
10. [关于 Lean 4 代码](#9-关于-lean-4-代码)

---

## 0. 记号约定

| 记号 | 读法 | 含义 |
|------|------|------|
| $\forall$ | 对任意 | 全称量词 |
| $\exists$ | 存在 | 存在量词 |
| $\in$ | 属于 | 元素属于集合 |
| $\subseteq$ | 包含于 | 子集 |
| $\le$ | 小于等于 | 在群/空间语境中也表示“子群/子空间” |
| $\trianglelefteq$ | 正规子群 | $H$ 是 $G$ 的正规子群 |
| $\cong$ | 同构 | 两个结构在改名意义下相同 |
| $\ker$ | 核 | 被映射送到单位元/零元的元素集合 |
| $\operatorname{im}$ | 像 | 映射的所有函数值 |
| $\operatorname{span}$ | 张成 | 所有有限线性组合 |
| $\dim$ | 维数 | 基的基数 |
| $\oplus$ | 直和 | 子空间交集为 $\{0\}$ 的和 |
| $\times$ | 笛卡尔积 | $A\times B=\{(a,b):a\in A,b\in B\}$ |
| $\varnothing$ | 空集 | 不含任何元素的集合 |
| $\mathbb{F}_p$ | 素域 | $p$ 个元素的有限域 $\mathbb{Z}/p\mathbb{Z}$ |

---

## 1. 基本数系

自然数

$$
\mathbb{N} = \{0, 1, 2, 3, \dots\}.
$$

有些教材从 $1$ 开始；本文从 $0$ 开始，并把正自然数记作
$\mathbb{N}_{>0} = \{1,2,3,\dots\}$。

整数

$$
\mathbb{Z} = \{0, \pm 1, \pm 2, \pm 3, \dots\}.
$$

有理数

$$
\mathbb{Q} = \left\{ \frac{p}{q} : p, q \in \mathbb{Z},\ q \neq 0 \right\}.
$$

这里的 $\frac{p}{q}$ 表示等价类：$\frac{p}{q}=\frac{p'}{q'}$ 当且仅当 $pq'=p'q$。

实数 $\mathbb{R}$：有理数的**完备化**。两种经典构造：

- **Dedekind 分割**：把 $\mathbb{Q}$ 分成 $(A,B)$ 两半，$A$ 中的数都小于 $B$ 中的数；
- **Cauchy 序列**：有理数 Cauchy 序列的等价类。

复数

$$
\mathbb{C} = \{a + bi : a,b \in \mathbb{R}\}, \qquad i^2 = -1.
$$

极坐标写法：

$$
z = e^{i\theta} = \cos\theta + i\sin\theta.
$$

包含关系：

$$
\mathbb{N} \subset \mathbb{Z} \subset \mathbb{Q} \subset \mathbb{R} \subset \mathbb{C}.
$$

从“运算能否永远进行”的角度看，这些数系是在逐步补全：

| 数系 | 加法 | 减法 | 乘法 | 除法（除数非零） | 结构名称 |
|------|------|------|------|------------------|----------|
| $\mathbb{N}$ | 封闭 | 不封闭 | 封闭 | 不封闭 | 交换幺半群（加法、乘法） |
| $\mathbb{Z}$ | 封闭 | 封闭 | 封闭 | 不封闭 | 整环 |
| $\mathbb{Q}$ | 封闭 | 封闭 | 封闭 | 封闭 | 域 |
| $\mathbb{R}$ | 封闭 | 封闭 | 封闭 | 封闭 | 域 |
| $\mathbb{C}$ | 封闭 | 封闭 | 封闭 | 封闭 | 域 |

这张表已经暗示了全文主线：

> **从群到环再到域，就是不断给集合增加运算、增加“可逆性”的过程；向量空间则是一个域作用在一个阿贝尔群上的结果。**

### 直观速记

- **群**：一个集合配一个二元运算；运算满足结合律，有单位元，每个元素有逆元。
- **环**：一个集合配加法与乘法；加法构成阿贝尔群，乘法满足结合律与分配律，并有乘法单位元。
- **域**：一个交换环，其中每个非零元素都有乘法逆元（可以做除法）。
- **向量空间**：一个域“作用”在一个阿贝尔群上，作用满足四条分配/相容公理。

---

## 2. 预备：二元运算

### 2.1 直观

“运算”就是把两个元素合成为一个元素的规则。例如整数加法 $2+3=5$、矩阵乘法、函数复合、置换的复合，都是二元运算。

集合上的二元运算必须“关得住”：两个集合内的元素运算后仍在集合内。这个性质叫**封闭性**。在现代定义中，封闭性由“映射”一词自动保证，因为映射的陪域就是原来的集合。

### 2.2 定义与性质

**定义 2.1（二元运算）**
集合 $S$ 上的一个二元运算是一个映射

$$
* \colon S \times S \to S, \qquad (a,b) \mapsto a*b.
$$

**定义 2.2（运算的四条基本性质）**
设 $*$ 是 $S$ 上的二元运算，$a,b,c\in S$：

1. **结合律**：$(a*b)*c = a*(b*c)$。
2. **交换律**：$a*b = b*a$。
3. **单位元**：存在 $e\in S$，使得对任意 $a\in S$ 都有 $e*a=a*e=a$。
4. **逆元**：若单位元 $e$ 存在，且 $a*b=b*a=e$，则称 $b$ 是 $a$ 的逆元，记作 $b=a^{-1}$。

**命题 2.3（唯一性）**
单位元若存在则唯一；逆元若存在则唯一。

证明：

- 单位元：设 $e,e'$ 都是单位元，则 $e = e*e' = e'$。
- 逆元：设 $b,c$ 都是 $a$ 的逆元，则 $b = b*e = b*(a*c) = (b*a)*c = e*c = c$。

### 2.3 关键 Lean 4 代码

```lean
-- 二元运算：类型 α 上的运算就是一个函数 α → α → α
-- “封闭性”由返回类型 α 自动保证，不需要单独写公理
def BinaryOperation (α : Type) : Type := α → α → α

-- 结合律：先算哪一对不影响最终结果
-- Mathlib 中同名概念是 `Std.Associative`
def IsAssociative {α : Type} (operation : α → α → α) : Prop :=
  ∀ a b c : α, operation (operation a b) c = operation a (operation b c)

-- 交换律：交换两个运算对象不改变结果
-- Mathlib 中同名概念是 `Std.Commutative`
def IsCommutative {α : Type} (operation : α → α → α) : Prop :=
  ∀ a b : α, operation a b = operation b a

-- 单位元：与任何元素运算都不改变它（左单位元 + 右单位元）
def IsIdentity {α : Type} (operation : α → α → α) (identity : α) : Prop :=
  (∀ a : α, operation identity a = a) ∧
  (∀ a : α, operation a identity = a)

-- 逆元：与 a 运算后回到单位元（左逆元 + 右逆元）
def IsInverse {α : Type} (operation : α → α → α) (identity : α)
    (inverse : α → α) : Prop :=
  ∀ a : α,
    operation a (inverse a) = identity ∧
    operation (inverse a) a = identity

-- 查看 Mathlib 中的对应谓词
#check Std.Associative
#check Std.Commutative
```

---

## 3. 半群与幺半群

### 3.1 定义

- **半群**：$(S,*)$，其中 $*$ 满足结合律。
- **幺半群**：半群 + 单位元。
- **群**：幺半群 + 每个元素有逆元。

层层加强：

半群 $\subset$ 幺半群 $\subset$ 群。

中文里的“幺”是“一”的意思，“幺半群”就是“有单位元（一）的半群”。

### 3.2 例子

| 结构 | 运算 | 单位元 | 是群吗 |
|------|------|--------|--------|
| $(\mathbb{N}_{>0},+)$ | 加法 | 无 | 否（只是半群） |
| $(\mathbb{N},+)$ | 加法 | $0$ | 否（只有 $0$ 可逆） |
| $(\mathbb{Z},\times)$ | 乘法 | $1$ | 否（只有 $\pm1$ 可逆） |
| $(\Sigma^*)$ | 字符串连接 | 空串 $\varepsilon$ | 否（非空串不可逆） |
| $(X^X,\circ)$ | 函数复合 | $\mathrm{id}_X$ | 否（只有双射可逆） |
| $(M_n(F),\times)$ | 矩阵乘法 | $I_n$ | 否（只有可逆矩阵可逆） |

这一节的价值在于：**群的定义不是凭空出现的，而是从“结合 + 单位 + 逆”逐层加强出来的。**

### 3.3 关键 Lean 4 代码

```lean
-- 半群：只要求结合律
-- `Semigroup` 的核心字段是 `mul_assoc`
#check Semigroup

-- 幺半群：半群 + 单位元
-- `Monoid` 增加 `one`、`one_mul`、`mul_one`
#check Monoid

-- 群：幺半群 + 每个元素有逆元
-- `Group` 增加 `inv`、`mul_inv_cancel`、`inv_mul_cancel`
#check Group

-- 类型类之间的继承关系：Group ⇒ Monoid ⇒ Semigroup
example (G : Type) [Group G] : Monoid G := inferInstance
example (G : Type) [Monoid G] : Semigroup G := inferInstance
```

---

## 4. 群

### 4.1 定义

**定义 4.1（群）**
集合 $G$ 配上二元运算 $\cdot$ 称为**群**，如果：

1. **结合律**：$(a\cdot b)\cdot c=a\cdot(b\cdot c)$ 对任意 $a,b,c\in G$ 成立；
2. **单位元**：存在 $e\in G$，使 $e\cdot a=a\cdot e=a$ 对任意 $a\in G$ 成立；
3. **逆元**：对任意 $a\in G$，存在 $a^{-1}\in G$，使 $a\cdot a^{-1}=a^{-1}\cdot a=e$。

**定义 4.2（阿贝尔群）**
若群 $G$ 还满足 $a\cdot b=b\cdot a$ 对任意 $a,b\in G$ 成立，则称 $G$ 为**阿贝尔群**（Abel 群），也称**交换群**。

### 4.2 基本性质

设 $G$ 是群，$a,b,c\in G$：

1. 单位元唯一，逆元唯一。
2. **消去律**：$ab=ac\Rightarrow b=c$；$ba=ca\Rightarrow b=c$。
3. $(a^{-1})^{-1}=a$。
4. $(ab)^{-1}=b^{-1}a^{-1}$。注意顺序反转：先穿的袜子后脱。
5. 幂运算：$a^{m+n}=a^ma^n$，$(a^m)^n=a^{mn}$，其中 $a^0=e$。

### 4.3 群的阶与元素的阶

- 若 $G$ 是有限集，称 $|G|$ 为群 $G$ 的**阶**。
- 对 $g\in G$，若存在正整数 $k$ 使 $g^k=e$，称最小的这样的 $k$ 为 $g$ 的**阶**，记作 $\operatorname{ord}(g)$；若不存在，称 $g$ 的阶为无穷。

例子：

- 在 $(\mathbb{Z}/6\mathbb{Z},+)$ 中，$1$ 的阶是 $6$，$2$ 的阶是 $3$，$3$ 的阶是 $2$，$0$ 的阶是 $1$。
- 在 $(\mathbb{Z},+)$ 中，除 $0$ 外所有元素的阶都是无穷。

### 4.4 子群

**定义 4.3（子群）**
设 $H$ 是群 $G$ 的非空子集。若 $H$ 对乘法和取逆都封闭，即

$$
a,b\in H\Rightarrow ab\in H, \qquad a\in H\Rightarrow a^{-1}\in H,
$$

则称 $H$ 是 $G$ 的**子群**，记作 $H\le G$。

**子群判别法**：$H\le G$ 当且仅当 $H$ 非空且对任意 $a,b\in H$ 有 $ab^{-1}\in H$。若 $G$ 有限，则只需 $H$ 非空且对乘法封闭。

例子：

- $n\mathbb{Z}=\{nk:k\in\mathbb{Z}\}\le\mathbb{Z}$。
- $SL_n(F)=\{A\in GL_n(F):\det A=1\}\le GL_n(F)$。
- 中心 $Z(G)=\{g\in G:gx=xg\ \forall x\in G\}\le G$。
- 任意多个子群的交集仍是子群；两个子群的并通常**不是**子群。

### 4.5 循环群

**定义 4.4（循环群）**
设 $G$ 是群，$g\in G$。称

$$
\langle g\rangle=\{g^k:k\in\mathbb{Z}\}
$$

为由 $g$ 生成的**循环子群**。若存在 $g\in G$ 使 $G=\langle g\rangle$，则称 $G$ 为**循环群**。

性质：

- $\mathbb{Z}=\langle1\rangle$，$\mathbb{Z}/n\mathbb{Z}=\langle1\rangle$。
- 循环群的每个子群仍是循环群。
- $\mathbb{Z}$ 的子群都是 $n\mathbb{Z}$。
- 有限循环群的子群阶数整除群阶，且对每个正因子恰有一个子群。

### 4.6 群同态

**定义 4.5（群同态）**
设 $(G,\cdot)$ 与 $(H,*)$ 是群。映射 $\varphi:G\to H$ 称为**群同态**，如果

$$
\varphi(a\cdot b)=\varphi(a)*\varphi(b) \qquad (\forall a,b\in G).
$$

- **核**：$\ker\varphi=\{g\in G:\varphi(g)=e_H\}$。
- **像**：$\operatorname{im}\varphi=\{\varphi(g):g\in G\}$。
- 若 $\varphi$ 是双射，则称为**同构**，记作 $G\cong H$。
- 单同态 $\iff\ker\varphi=\{e_G\}$。
- 第一同构定理：$G/\ker\varphi\cong\operatorname{im}\varphi$。

### 4.7 拉格朗日定理

**定理 4.6（Lagrange）**
设 $G$ 是有限群，$H\le G$。则 $|H|$ 整除 $|G|$。

推论：

- 元素 $g$ 的阶整除 $|G|$，特别地 $g^{|G|}=e$。
- 素数阶群必为循环群。

### 4.8 群的例子总表

| 群 | 元素 | 运算 | 交换？ | 阶 |
|----|------|------|--------|----|
| $(\mathbb{Z},+)$ | 整数 | 加法 | 是 | 无限 |
| $(\mathbb{Z}/n\mathbb{Z},+)$ | $n$ 个剩余类 | 模 $n$ 加法 | 是 | $n$ |
| $(\mathbb{Q}^\times,\times)$ | 非零有理数 | 乘法 | 是 | 无限 |
| $S_n$ | $\{1,\dots,n\}$ 的置换 | 复合 | $n\ge3$ 时否 | $n!$ |
| $A_n$ | 偶置换 | 复合 | $n\ge4$ 时否 | $n!/2$ |
| $GL_n(F)$ | 可逆 $n\times n$ 矩阵 | 矩阵乘法 | $n\ge2$ 时否 | 有限域情形见下 |
| $D_n$ | 正 $n$ 边形对称 | 复合 | $n\ge3$ 时否 | $2n$ |
| $S^1$ | 单位复数 $\{z\in\mathbb{C}:\vert z\vert=1\}$ | 乘法 | 是 | 无限 |
| $\mu_n$ | $n$ 次单位根 | 乘法 | 是 | $n$ |

若 $F=\mathbb{F}_q$ 是有限域，则

$$
\vert GL_n(\mathbb{F}_q)\vert=(q^n-1)(q^n-q)\cdots(q^n-q^{n-1}).
$$

计数思路：第 $1$ 列可取任意非零向量，共 $q^n-1$ 种；第 $k$ 列不能落在前 $k-1$ 列张成的子空间中，故有 $q^n-q^{k-1}$ 种。

### 4.9 关键 Lean 4 代码

```lean
-- 群：`Group G`
-- 阿贝尔群：`CommGroup G`（在群的基础上加交换律）
#check Group
#check CommGroup

-- 群的三条公理在 Lean 中就是三个引理
-- 结合律
example (G : Type) [Group G] (a b c : G) :
    (a * b) * c = a * (b * c) :=
  mul_assoc a b c

-- 单位元
example (G : Type) [Group G] (a : G) :
    1 * a = a :=
  one_mul a

-- 逆元
example (G : Type) [Group G] (a : G) :
    a * a⁻¹ = 1 :=
  mul_inv_cancel a

-- 子群：`Subgroup G`
-- 对乘法封闭
example (G : Type) [Group G] (H : Subgroup G) {a b : G}
    (ha : a ∈ H) (hb : b ∈ H) :
    a * b ∈ H :=
  H.mul_mem ha hb

-- 对取逆封闭
example (G : Type) [Group G] (H : Subgroup G) {a : G}
    (ha : a ∈ H) :
    a⁻¹ ∈ H :=
  H.inv_mem ha

-- 群同态：`MonoidHom G H`
-- 群同态是保持乘法的映射；`MonoidHom` 还保持单位元
#check MonoidHom
```

---

## 5. 环

### 5.1 定义

**定义 5.1（环）**
集合 $R$ 配上两个二元运算 $+$ 和 $\cdot$ 称为**环**，如果：

1. $(R,+)$ 是阿贝尔群，加法单位元记作 $0$，$a$ 的加法逆元记作 $-a$；
2. 乘法满足结合律：$(ab)c=a(bc)$；
3. 存在乘法单位元 $1\in R$，使 $1a=a1=a$ 对一切 $a\in R$ 成立；
4. **分配律**：$a(b+c)=ab+ac$，$(a+b)c=ac+bc$。

> **约定**：本文采用“环含乘法单位元 $1$”的约定。有些教材不要求 $1$，把本文的环称为“含幺环”；不含 $1$ 的结构称为**伪环**（rng，即 ring 去掉 i）。

记号：$ab$ 表示 $a\cdot b$；$a-b$ 表示 $a+(-b)$。

### 5.2 直接推论

设 $R$ 是环，$a,b,c\in R$：

1. $0a=a0=0$。
2. $(-a)b=a(-b)=-(ab)$。
3. $(-a)(-b)=ab$。
4. $a(b-c)=ab-ac$。
5. 若 $1=0$，则 $R=\{0\}$。这样的环称为**零环**。

前两条的证明思路：

- $0a=(0+0)a=0a+0a$，两边加上 $-(0a)$ 得 $0=0a$。
- $ab+(-a)b=(a+(-a))b=0b=0$，故 $(-a)b=-(ab)$。

### 5.3 环中的乘法“好坏”

- **单位**：若存在 $b$ 使 $ab=1$，则称 $a$ 为单位（可逆元）。所有单位在乘法下构成群 $R^\times$。
- **零因子**：若非零的 $a$ 存在非零的 $b$ 使 $ab=0$，则称 $a$ 为零因子。
- **整环**：交换环，$1\ne0$，且没有零因子。
- **除环**：$1\ne0$，且每个非零元都是单位（不要求乘法交换）。
- **域**：交换的除环。

关系：

域 $\subset$ 整环 $\subset$ 交换环 $\subset$ 环，且 域 $\subset$ 除环 $\subset$ 环。

注意两条链在“除环”处分叉：除环不要求交换，所以整环与除环互不包含。

**消去律**：在整环中，

$$
ab=ac,\ a\ne0 \implies b=c.
$$

因为 $a(b-c)=0$，而 $a\ne0$ 且无零因子，所以 $b-c=0$。

**有限整环是域**：设 $R$ 是有限整环，任取非零 $a$，映射 $x\mapsto ax$ 是单射（无零因子），有限集上单射必为满射，故存在 $x$ 使 $ax=1$。所以每个非零元可逆。

### 5.4 理想与商环

**定义 5.2（理想）**
设 $R$ 是环，$I\subseteq R$。若

1. $(I,+)$ 是 $(R,+)$ 的子群；
2. 对任意 $r\in R$、$a\in I$，有 $ra\in I$ 且 $ar\in I$，

则称 $I$ 是 $R$ 的**理想**。

理想是“可以作商”的加法子群，类比群中的正规子群：

- 群：正规子群 $N\trianglelefteq G$ $\to$ 商群 $G/N$。
- 环：理想 $I\trianglelefteq R$ $\to$ 商环 $R/I$。
- 向量空间：子空间 $W\le V$ $\to$ 商空间 $V/W$。

关键对应：

- 环同态的核是理想。
- $R/I$ 是域 $\iff$ $I$ 是极大理想（$R$ 为非零含幺交换环）。
- $R/I$ 是整环 $\iff$ $I$ 是素理想。
- 对域 $F$，$F[x]/(f)$ 是域 $\iff$ $f$ 不可约。

### 5.5 环的例子总表

| 环 | 交换？ | 整环？ | 域？ | 说明 |
|----|--------|--------|------|------|
| $\mathbb{Z}$ | 是 | 是 | 否 | 单位只有 $\pm1$ |
| $\mathbb{Q},\mathbb{R},\mathbb{C}$ | 是 | 是 | 是 | 特征 $0$ |
| $\mathbb{F}_p$ | 是 | 是 | 是 | 特征 $p$ |
| $\mathbb{Z}[x]$ | 是 | 是 | 否 | $2$ 不可逆 |
| $F[x]$（$F$ 为域） | 是 | 是 | 否 | $x$ 不可逆 |
| $M_n(F)$（$n\ge2$） | 否 | 否 | 否 | 有零因子，如 $E_{11}E_{22}=0$ |
| $\mathbb{Z}/n\mathbb{Z}$（$n\ge2$） | 是 | $n$ 素数时是 | $n$ 素数时是 | $n$ 合数时有零因子 |
| $\mathbb{H}$（四元数） | 否 | 否 | 否 | 除环，非域 |
| $R\times S$ | 是 | 否 | 否 | $(1,0)(0,1)=(0,0)$ |
| $F^X$（函数环） | 是 | 否 | 否 | 支集不交的函数相乘为 $0$ |

补充例子：

- **布尔环**：$(\mathcal{P}(X),\triangle,\cap)$，其中 $\triangle$ 是对称差。每个元素满足 $a^2=a$；当 $|X|\ge2$ 时有零因子。
- **四元数体**：$\mathbb{H}=\{a+bi+cj+dk:a,b,c,d\in\mathbb{R}\}$，其中 $i^2=j^2=k^2=ijk=-1$。它是除环，但乘法不交换，所以不是域。
- **分式域**：任何整环 $R$ 都可以嵌入一个域
  $\operatorname{Frac}(R)=\left\{\frac{a}{b}:a,b\in R,\ b\ne0\right\}\Big/\sim$，
  其中 $\frac{a}{b}\sim\frac{c}{d}\iff ad=bc$。例如 $\operatorname{Frac}(\mathbb{Z})=\mathbb{Q}$，$\operatorname{Frac}(F[x])=F(x)$。

### 5.6 关键 Lean 4 代码

```lean
-- 环：`Ring R`
-- 交换环：`CommRing R`（在环的基础上加乘法交换律）
#check Ring
#check CommRing

-- 加法结合律
example (R : Type) [Ring R] (a b c : R) :
    (a + b) + c = a + (b + c) :=
  add_assoc a b c

-- 乘法结合律
example (R : Type) [Ring R] (a b c : R) :
    (a * b) * c = a * (b * c) :=
  mul_assoc a b c

-- 左分配律
example (R : Type) [Ring R] (a b c : R) :
    a * (b + c) = a * b + a * c :=
  left_distrib a b c

-- 右分配律
example (R : Type) [Ring R] (a b c : R) :
    (a + b) * c = a * c + b * c :=
  right_distrib a b c

-- 整环：`IsDomain R`（交换环 + 无零因子）
#check IsDomain

-- 除环：`DivisionRing K`（非零元都可逆，不要求乘法交换）
#check DivisionRing

-- 域：`Field F`（交换的除环）
#check Field

-- 域中每个非零元都有乘法逆元
example (F : Type) [Field F] (a : F) (ha : a ≠ 0) :
    a * a⁻¹ = 1 :=
  mul_inv_cancel₀ ha

-- 理想：`Ideal R`
-- 理想对左乘封闭
example (R : Type) [Ring R] (I : Ideal R) (r : R) {a : R}
    (ha : a ∈ I) :
    r * a ∈ I :=
  Ideal.mul_mem_left I r ha
```

---

## 6. 域

### 6.1 定义

**定义 6.1（域）**
交换环 $F$ 称为**域**，如果：

1. $1\ne0$；
2. 对任意 $a\in F$，若 $a\ne0$，则存在 $a^{-1}\in F$ 使 $aa^{-1}=1$。

等价说法：

- $F$ 的非零元在乘法下构成阿贝尔群，记作 $F^\times=F\setminus\{0\}$。
- $F$ 是交换的除环。

**域的等价刻画**（对非零含幺交换环 $R$）：

1. $R$ 是域；
2. $R$ 只有两个理想：$(0)$ 与 $R$；
3. $R$ 是整环，且每个非零元都是单位；
4. $R\setminus\{0\}$ 在乘法下构成群。

### 6.2 特征

**定义 6.2（特征）**
设 $F$ 是域。记 $n\cdot1=1+1+\cdots+1$（共 $n$ 个 $1$ 相加）。

若存在正整数 $n$ 使 $n\cdot1=0$，则称最小的这样的 $n$ 为 $F$ 的**特征**，记作 $\operatorname{char}F$；若不存在，规定 $\operatorname{char}F=0$。

**定理 6.3**
任意域的特征只能是 $0$ 或素数。

证明：若 $\operatorname{char}F=n=mk$ 是合数，其中 $1<m,k<n$，则

$$
(m\cdot1)(k\cdot1)=(mk)\cdot1=n\cdot1=0.
$$

由 $n$ 的最小性，$m\cdot1\ne0$ 且 $k\cdot1\ne0$，这与域无零因子矛盾。

**素域**：域 $F$ 的所有子域的交，称为 $F$ 的素域。

- 特征 $0$：素域同构于 $\mathbb{Q}$。
- 特征 $p$：素域同构于 $\mathbb{F}_p=\mathbb{Z}/p\mathbb{Z}$。

### 6.3 域扩张

**定义 6.4（域扩张）**
设 $F\subseteq K$ 都是域，且 $F$ 的运算在 $K$ 中限制后与原来一致。则称 $K$ 是 $F$ 的**域扩张**，记作 $K/F$。

此时 $K$ 自动成为 $F$ 上的向量空间。定义**扩张次数**

$$
[K:F]=\dim_F K.
$$

若 $[K:F]<\infty$，称 $K/F$ 为**有限扩张**。

例子：

- $[\mathbb{C}:\mathbb{R}]=2$，基为 $\{1,i\}$。
- $[\mathbb{Q}(\sqrt2):\mathbb{Q}]=2$，基为 $\{1,\sqrt2\}$。
- $[\mathbb{Q}(\sqrt2,\sqrt3):\mathbb{Q}]=4$，基为 $\{1,\sqrt2,\sqrt3,\sqrt6\}$。
- $[\mathbb{R}:\mathbb{Q}]$ 是无限维（Hamel 基）。
- $[\mathbb{F}_{p^n}:\mathbb{F}_p]=n$。

**塔律**：若 $F\subseteq E\subseteq K$ 是有限扩张，则

$$
[K:F]=[K:E]\cdot[E:F].
$$

### 6.4 有序域（补充）

域 $F$ 称为**有序域**，如果存在全序 $\le$，使得对任意 $a,b,c\in F$：

1. $a\le b\Rightarrow a+c\le b+c$；
2. $0\le a$ 且 $0\le b\Rightarrow0\le ab$。

性质：

- $\mathbb{Q}$ 和 $\mathbb{R}$ 是有序域。
- $\mathbb{C}$ 不能成为有序域：在有序域中平方非负，但 $i^2=-1<0$。
- 每个有序域的特征都是 $0$，因而都包含一个与 $\mathbb{Q}$ 同构的素域。
- $\mathbb{R}$ 在同构意义下是唯一的 **Dedekind 完备**有序域。

### 6.5 域的例子

- 特征 $0$：$\mathbb{Q}$、$\mathbb{R}$、$\mathbb{C}$。
- 特征 $p$：$\mathbb{F}_p=\mathbb{Z}/p\mathbb{Z}$。
- 有限域 $\mathbb{F}_{p^n}$：元素个数 $p^n$，在同构意义下唯一。
- $\mathbb{Q}(\sqrt2)=\{a+b\sqrt2:a,b\in\mathbb{Q}\}$。
- $\mathbb{Q}(i)=\{a+bi:a,b\in\mathbb{Q}\}$。
- 有理函数域 $F(x)=\operatorname{Frac}(F[x])$。
- 四元数体 $\mathbb{H}$ 是除环，但**不是**域（乘法不交换）。

$\mathbb{F}_4$ 的具体构造：

$$
\mathbb{F}_4=\mathbb{F}_2[x]/(x^2+x+1)=\{0,1,\alpha,\alpha+1\},
$$

其中 $\alpha^2=\alpha+1$，且 $\alpha^3=1$。

### 6.6 关键 Lean 4 代码

```lean
-- 域：`Field F`
#check Field

-- 特征：`CharP F p` 表示“p 个 1 相加等于 0”
-- `ringChar F` 直接给出特征值（0 或素数）
#check CharP
#check ringChar

-- 域扩张：`Algebra F K` 表示 K 是 F 上的代数
-- 扩张次数就是 K 作为 F-向量空间的维数
#check Algebra
#check Module.finrank

-- 例如：复数域作为实数向量空间的维数是 2
#check (Module.finrank ℝ ℂ)
```

---

## 7. 向量空间

### 7.1 定义

**定义 7.1（向量空间）**
设 $F$ 是域，$V$ 是非空集合。若 $V$ 上有加法 $+$ 和数乘

$$
F\times V\to V,\qquad (a,v)\mapsto av,
$$

满足下列条件，则称 $V$ 为 $F$ 上的**向量空间**（线性空间）：

1. $(V,+)$ 是阿贝尔群，加法单位元记作 $0_V$，$v$ 的加法逆元记作 $-v$；
2. $a(u+v)=au+av$；
3. $(a+b)v=av+bv$；
4. $(ab)v=a(bv)$；
5. $1v=v$

对任意 $a,b\in F$、$u,v\in V$ 成立。

> **与模的关系**：向量空间正是“域上的模”。若把域 $F$ 换成一般的环 $R$，得到的是 $R$-模；模不一定有基（例如 $\mathbb{Z}/2\mathbb{Z}$ 作为 $\mathbb{Z}$-模没有基）。域的特殊性在于每个非零元可逆，因此每个向量空间都有基，维数也良定义。

### 7.2 数乘的基本性质

设 $V$ 是 $F$ 上的向量空间，$a\in F$，$v\in V$：

1. $0_Fv=0_V$。
2. $a0_V=0_V$。
3. $(-a)v=-(av)$。
4. $a(-v)=-(av)$。
5. 若 $av=0_V$，则 $a=0_F$ 或 $v=0_V$。

第 5 条的证明：若 $a\ne0$，则

$$
v=1v=(a^{-1}a)v=a^{-1}(av)=a^{-1}0_V=0_V.
$$

### 7.3 例子

| 向量空间 | 基 | 维数 |
|----------|----|------|
| $F^n$ | $e_1,\dots,e_n$ | $n$ |
| $M_{m\times n}(F)$ | 矩阵单位 $E_{ij}$ | $mn$ |
| $F[x]$ | $1,x,x^2,\dots$ | $\aleph_0$ |
| $F[x]_{\le n}$ | $1,x,\dots,x^n$ | $n+1$ |
| $F^X$（$X$ 有限） | 指示函数 $\delta_x$ | $\vert X\vert$ |
| $\mathbb{C}$ over $\mathbb{R}$ | $1,i$ | $2$ |
| $\mathbb{Q}(\sqrt2)$ over $\mathbb{Q}$ | $1,\sqrt2$ | $2$ |
| $\mathbb{R}$ over $\mathbb{Q}$ | Hamel 基（需选择公理） | 无限 |

更多例子：

- 齐次线性方程组 $Ax=0$ 的解集是 $F^n$ 的子空间，维数为 $n-\operatorname{rank}A$。
- 域扩张 $K/F$ 中，$K$ 是 $F$-向量空间，$\dim_FK=[K:F]$。
- $\mathbb{C}$ 作为 $\mathbb{C}$-向量空间是 $1$ 维的；同一个集合，换一个域，维数就变了。

### 7.4 子空间

**定义 7.2（子空间）**
设 $W\subseteq V$。若

1. $W\ne\varnothing$；
2. 对任意 $u,v\in W$，$u+v\in W$；
3. 对任意 $a\in F$、$v\in W$，$av\in W$，

则称 $W$ 为 $V$ 的**子空间**，记作 $W\le V$。

等价判别法：$W$ 非空，且对任意 $a,b\in F$、$u,v\in W$，有 $au+bv\in W$。

性质：

- 子空间自动含有零向量：取 $v\in W$，则 $0v=0\in W$。
- 任意多个子空间的交集仍是子空间。
- 两个子空间的和 $U+W=\{u+w:u\in U,w\in W\}$ 仍是子空间。
- 两个子空间的并通常不是子空间（例如 $\mathbb{R}^2$ 中两条不同的过原点直线）。

### 7.5 线性组合、张成、线性无关

**线性组合**：$a_1v_1+\cdots+a_nv_n$，其中 $a_i\in F$，$v_i\in V$。

**张成**：

$$
\operatorname{span}(S)=\left\{\sum_{i=1}^n a_iv_i:n\ge0,\ a_i\in F,\ v_i\in S\right\}.
$$

规定 $\operatorname{span}(\varnothing)=\{0\}$。$\operatorname{span}(S)$ 是包含 $S$ 的最小子空间。

**线性无关**：$v_1,\dots,v_n$ 线性无关，如果

$$
\sum_{i=1}^n a_iv_i=0\implies a_1=\cdots=a_n=0.
$$

否则称为**线性相关**。等价地，线性相关当且仅当某个向量可以表示为其余向量的线性组合。

对无限集合 $S$，称 $S$ 线性无关，如果它的每个有限子集都线性无关。

性质：

- 线性无关集的子集仍线性无关。
- 包含零向量的集合一定线性相关。
- 若 $S$ 张成 $V$，则从 $S$ 中删去“多余”的向量可以得到基。

### 7.6 基与维数

**定义 7.3（基）**
$B\subseteq V$ 称为 $V$ 的**基**，如果 $B$ 线性无关且 $\operatorname{span}(B)=V$。

等价说法：每个向量 $v\in V$ 都能唯一地写成 $B$ 中有限个向量的线性组合。

**定义 7.4（维数）**
若 $V$ 有基 $B$，称 $|B|$ 为 $V$ 的**维数**，记作 $\dim_FV$。

基本定理（需要选择公理）：

1. 每个向量空间都有基。
2. 任意两组基的基数相同，所以维数不依赖基的选取。
3. 任意线性无关集都可扩充为基；任意张成集都包含一组基。

有限维基本定理：设 $\dim_FV=n<\infty$，则

1. 任意线性无关集至多含 $n$ 个向量；
2. 任意张成集至少含 $n$ 个向量；
3. 任意 $n$ 个线性无关的向量都构成基；
4. 任意 $n$ 个张成 $V$ 的向量都构成基。

维数公式：若 $U,W$ 是有限维空间 $V$ 的子空间，则

$$
\dim(U+W)=\dim U+\dim W-\dim(U\cap W).
$$

当 $U\cap W=\{0\}$ 时，$U+W$ 称为**直和**，记作 $U\oplus W$，此时

$$
\dim(U\oplus W)=\dim U+\dim W.
$$

### 7.7 线性映射

**定义 7.5（线性映射）**
映射 $T:V\to W$ 称为**线性映射**，如果

$$
T(au+bv)=aT(u)+bT(v) \qquad (\forall a,b\in F,\ \forall u,v\in V).
$$

等价于同时满足 $T(u+v)=T(u)+T(v)$ 与 $T(av)=aT(v)$。

- **核**：$\ker T=\{v\in V:T(v)=0_W\}$。
- **像**：$\operatorname{im}T=\{T(v):v\in V\}$。
- $T$ 是单射 $\iff\ker T=\{0\}$。
- $T$ 是**同构**，如果 $T$ 是双射。

**秩-零化度定理**：若 $V$ 有限维，则

$$
\dim V=\dim\ker T+\dim\operatorname{im}T.
$$

**矩阵表示**：取定 $V$ 与 $W$ 的基后，每个线性映射 $T:V\to W$ 对应唯一一个 $m\times n$ 矩阵 $A$，其中 $n=\dim V$，$m=\dim W$。

- 线性映射的复合对应矩阵乘法。
- $T$ 是同构 $\iff$ $A$ 可逆 $\iff$ $\operatorname{rank}A=n=m$。
- 有限维空间 $V\cong W\iff\dim V=\dim W$。
- 同一个线性变换在不同基下的矩阵相似：$A'=P^{-1}AP$。

### 7.8 关键 Lean 4 代码

```lean
-- 向量空间：域 F 上的模 `Module F V`
#check Module

-- 数乘对向量加法分配
example (F V : Type) [Field F] [AddCommGroup V] [Module F V]
    (a : F) (u v : V) :
    a • (u + v) = a • u + a • v :=
  smul_add a u v

-- 数乘对标量加法分配
example (F V : Type) [Field F] [AddCommGroup V] [Module F V]
    (a b : F) (v : V) :
    (a + b) • v = a • v + b • v :=
  add_smul a b v

-- 数乘与域乘法相容
example (F V : Type) [Field F] [AddCommGroup V] [Module F V]
    (a b : F) (v : V) :
    (a * b) • v = a • (b • v) :=
  mul_smul a b v

-- 1 作用为恒等
example (F V : Type) [Field F] [AddCommGroup V] [Module F V]
    (v : V) :
    (1 : F) • v = v :=
  one_smul F v

-- 子空间：`Submodule F V`
-- 对加法封闭
example (F V : Type) [Field F] [AddCommGroup V] [Module F V]
    (W : Submodule F V) {u v : V} (hu : u ∈ W) (hv : v ∈ W) :
    u + v ∈ W :=
  W.add_mem hu hv

-- 基：`Module.Basis ι F V`
#check Module.Basis

-- 维数：`Module.finrank F V`
#check Module.finrank

-- 线性映射：`V →ₗ[F] W`
example (F V W : Type) [Field F] [AddCommGroup V] [Module F V]
    [AddCommGroup W] [Module F W]
    (T : V →ₗ[F] W) (a : F) (v : V) :
    T (a • v) = a • T v :=
  T.map_smul a v
```

---

## 8. 结构之间的关系

### 8.1 两条主轴

```text
【一个运算】

  集合 + 二元运算
        │ 加结合律
        ▼
      半群
        │ 加单位元
        ▼
      幺半群
        │ 加逆元
        ▼
       群 ──── 加交换律 ────▶ 阿贝尔群


【两个运算】

       环
        │ 乘法交换
        ▼
      交换环
        │ 1 ≠ 0 且无零因子
        ▼
      整环
        │ 每个非零元可逆
        ▼
       域


【域作用在阿贝尔群上】

  域 F  ×  阿贝尔群 (V,+)
        │ 满足四条数乘公理
        ▼
     F-向量空间
```

### 8.2 对照表

| 结构 | 运算个数 | 关键公理 | 典型例子 |
|------|----------|----------|----------|
| 半群 | 1 | 结合律 | $(\mathbb{N}_{>0},+)$ |
| 幺半群 | 1 | 结合律 + 单位元 | $(\mathbb{N},+)$ |
| 群 | 1 | 结合律 + 单位元 + 逆元 | $(\mathbb{Z},+)$，$S_n$ |
| 阿贝尔群 | 1 | 群 + 交换律 | $(\mathbb{Z},+)$，$(\mathbb{Q}^\times,\times)$ |
| 环 | 2 | 加法阿贝尔群 + 乘法幺半群 + 分配律 | $\mathbb{Z}$，$M_n(F)$ |
| 交换环 | 2 | 环 + 乘法交换 | $\mathbb{Z}$，$\mathbb{Z}[x]$ |
| 整环 | 2 | 交换环 + $1\ne0$ + 无零因子 | $\mathbb{Z}$，$F[x]$ |
| 域 | 2 | 整环 + 非零元可逆 | $\mathbb{Q}$，$\mathbb{R}$，$\mathbb{C}$，$\mathbb{F}_p$ |
| 向量空间 | 2（加法 + 数乘） | 加法阿贝尔群 + 数乘四公理 | $F^n$，$F[x]$ |

### 8.3 反例链

理解这些结构的关键，是记住“上一层不蕴含下一层”的反例：

| 反例 | 满足 | 不满足 | 原因 |
|------|------|--------|------|
| $(\mathbb{N}_{>0},+)$ | 半群 | 幺半群 | 没有加法单位元 $0$ |
| $(\mathbb{N},+)$ | 幺半群 | 群 | 正数没有加法逆元 |
| $S_3$ | 群 | 阿贝尔群 | $(12)(23)\ne(23)(12)$ |
| $M_2(\mathbb{R})$ | 环 | 交换环 | 矩阵乘法不交换 |
| $\mathbb{Z}/6\mathbb{Z}$ | 交换环 | 整环 | $2\cdot3\equiv0\pmod6$ |
| $\mathbb{Z}$ | 整环 | 域 | $2$ 不可逆 |
| $\mathbb{H}$ | 除环 | 域 | 四元数乘法不交换 |
| $\mathbb{R}$ | 域 | 代数闭域 | $x^2+1$ 无实根 |

另外，阿贝尔群只是向量空间的加法部分；要成为向量空间，还必须指定一个域和数乘作用。

### 8.4 每一步多买了什么

| 加上这一条 | 得到 | 能做什么 |
|------------|------|----------|
| 结合律 | 半群 | 省略括号，定义幂 |
| 单位元 | 幺半群 | 有“什么都不做”的元素 |
| 逆元 | 群 | 解方程 $ax=b$；描述对称 |
| 交换律 | 阿贝尔群 | 运算顺序无关；$\mathbb{Z}$-模的基础 |
| 第二个运算 + 分配律 | 环 | 算术、多项式、矩阵 |
| 乘法交换 | 交换环 | 因式分解、理想、素理想 |
| 无零因子 | 整环 | 消去律；构造分式域 |
| 非零元可逆 | 域 | 除法；线性代数；域扩张 |
| 域作用在阿贝尔群上 | 向量空间 | 线性组合、基、维数、线性映射 |

### 8.5 三座桥

**桥 1：分式域（整环 → 域）**

每个整环 $R$ 都可以嵌入一个域：

$$
R\hookrightarrow\operatorname{Frac}(R).
$$

例如：

$$
\mathbb{Z}\hookrightarrow\mathbb{Q},\qquad
F[x]\hookrightarrow F(x).
$$

所以整环是“几乎可以做除法”的环：只差把分母补进去。

**桥 2：域扩张（域 → 向量空间）**

若 $K/F$ 是域扩张，则 $K$ 是 $F$ 上的向量空间，且

$$
[K:F]=\dim_FK.
$$

这把域论问题转化成了线性代数问题。例如：

- $[\mathbb{C}:\mathbb{R}]=2$；
- $[\mathbb{Q}(\sqrt2):\mathbb{Q}]=2$；
- $[\mathbb{F}_{p^n}:\mathbb{F}_p]=n$。

**桥 3：模（环 → 向量空间）**

把向量空间定义中的“域”换成“环”，就得到模。

**定义 8.1（左模）**
设 $R$ 是环，$M$ 是阿贝尔群。若存在标量乘法 $R\times M\to M$，$(r,m)\mapsto rm$，满足

$$
r(m+n)=rm+rn,\quad
(r+s)m=rm+sm,\quad
(rs)m=r(sm),\quad
1m=m
$$

对任意 $r,s\in R$、$m,n\in M$ 成立，则称 $M$ 为**左 $R$-模**。

- 域上的模就是向量空间。
- 环上的模不一定有基，例如 $\mathbb{Z}/2\mathbb{Z}$ 作为 $\mathbb{Z}$-模没有基。
- 阿贝尔群就是 $\mathbb{Z}$-模，所以“阿贝尔群”与“$\mathbb{Z}$-模”是同一回事。

**定义 8.2（代数）**
设 $F$ 是域，$A$ 是 $F$-向量空间。若 $A$ 上还有乘法，使 $(A,+,\cdot)$ 成为环，且标量乘法与乘法相容：

$$
a(xy)=(ax)y=x(ay) \qquad (\forall a\in F,\ x,y\in A),
$$

则称 $A$ 为 $F$ 上的**代数**。

例子：$F[x]$、$M_n(F)$、$\mathbb{C}$（作为 $\mathbb{R}$-代数）、$\mathbb{H}$（作为 $\mathbb{R}$-代数）。

**商结构对照表**：

| 结构 | 用来作商的子结构 | 商结构 | 条件 |
|------|------------------|--------|------|
| 群 | 子群 $H$ | $G/H$ | $H$ 正规 |
| 环 | 理想 $I$ | $R/I$ | — |
| 向量空间 | 子空间 $W$ | $V/W$ | — |
| 模 | 子模 $N$ | $M/N$ | — |

它们都遵循同一个模式：把“相差一个子结构”的元素粘在一起，并要求运算与这种粘合相容。

### 8.6 例子串：$\mathbb{Z}\to\mathbb{Q}\to\mathbb{R}\to\mathbb{C}$

这条链把本文的概念串了起来：

1. $\mathbb{Z}$ 是整环，不是域：乘法有单位元 $1$，但 $2$ 没有乘法逆元。
2. $\operatorname{Frac}(\mathbb{Z})=\mathbb{Q}$：把分母补进去，得到域。
3. $\mathbb{Q}$ 是有序域，但不完备；$\mathbb{R}$ 是它的 Dedekind 完备化。
4. $\mathbb{R}$ 是完备有序域，但代数不闭：$x^2+1$ 没有实根。
5. $\mathbb{C}=\mathbb{R}(i)$ 是代数闭域；$[\mathbb{C}:\mathbb{R}]=2$。
6. $\mathbb{C}$ 不能成为有序域，因为 $i^2=-1<0$ 与“平方非负”矛盾。

### 8.7 关键 Lean 4 代码（模与代数）

```lean
-- 模：`Module R M`，把向量空间中的“域”换成“环”
#check Module

-- 模的数乘公理与向量空间完全一样
example (R M : Type) [Ring R] [AddCommGroup M] [Module R M]
    (r : R) (m n : M) :
    r • (m + n) = r • m + r • n :=
  smul_add r m n

-- 代数：`Algebra F A`，A 是 F-向量空间且带有相容的乘法
#check Algebra

-- 标量乘法与乘法相容
example (F A : Type) [Field F] [Ring A] [Algebra F A]
    (a : F) (x y : A) :
    (a • x) * y = a • (x * y) :=
  Algebra.smul_mul_assoc a x y
```

---

## 9. 关于 Lean 4 代码

- 文中的代码是 **Lean 4 / Mathlib 关键定义摘录**，不是完整可编译工程；重在展示数学概念在 Lean 中的写法和逐行注释。
- 代码默认已 `import Mathlib`；`#check` 用来查看 Mathlib 中对应定义的类型。
- 核心对应关系：

| 数学结构 | Mathlib 中的名字 |
|----------|------------------|
| 群 | `Group G` |
| 阿贝尔群 | `CommGroup G` |
| 子群 | `Subgroup G` |
| 环 | `Ring R` |
| 交换环 | `CommRing R` |
| 整环 | `IsDomain R` |
| 除环 | `DivisionRing K` |
| 域 | `Field F` |
| 理想 | `Ideal R` |
| 向量空间 / 模 | `Module F V` |
| 子空间 | `Submodule F V` |
| 基 | `Module.Basis ι F V` |
| 维数 | `Module.finrank F V` |
| 线性映射 | `V →ₗ[F] W` |
| 代数 | `Algebra F A` |

- `drafts.lean` 用自定义 `class` 形式给出了群、环、域、向量空间的公理版本，可与本文的 Mathlib 写法对照：

| 结构 | 本文（Mathlib） | `drafts.lean`（自定义类） |
|------|------------------|---------------------------|
| 群 | `Group G` | `MyGroup` |
| 环 | `Ring R` | `MyRing` |
| 交换环 | `CommRing R` | `MyCommRing` |
| 域 | `Field F` | `MyField` |
| 向量空间 | `Module F V` | `MyVectorSpace` |

---

## 一句话总结

- **群**：可逆的运算世界。
- **环**：加法可逆、乘法未必可逆的算术世界。
- **域**：非零元全部可逆的交换环，是“能做除法”的世界。
- **向量空间**：域作用在阿贝尔群上，是“线性组合”的世界。

从群到环到域，是在不断补充运算和可逆性；向量空间则把域与阿贝尔群结合起来，开启了基、维数和线性映射的理论。
