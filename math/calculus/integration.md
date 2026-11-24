# 一元函数积分学：概念讲解、核心证明及 7 套试卷

> 使用方式：试卷 1—5 为训练集，试卷 6—7 为综合测试集。每套均为 16 道计算题、4 道证明题，每题 5 分，共 100 分。建议先独立完成，再对照解析。

---

## 一、知识主线

积分学可以沿着两条线理解：

$$
\text{微分法的逆运算}
\longrightarrow
\text{原函数与不定积分},
$$

$$
\text{分割、近似、求和、取极限}
\longrightarrow
\text{定积分}
\longrightarrow
\text{应用与反常积分}.
$$

不定积分回答“谁求导以后等于给定函数”；定积分回答“曲边区域的累积量是多少”。牛顿—莱布尼茨公式用原函数把两者联系起来。

---

## 二、原函数与不定积分

### 2.1 原函数的定义

若在区间 $I$ 上，

$$
F'(x)=f(x),
$$

则称 $F$ 是 $f$ 在 $I$ 上的一个原函数。

若 $F$ 是 $f$ 的一个原函数，则所有原函数都可写成

$$
F(x)+C,
$$

其中 $C$ 为任意常数。因此

$$
\int f(x)\,dx=F(x)+C.
$$

不定积分表示的是函数族，不是某一个特定函数。求不定积分后必须补上积分常数。

连续函数一定有原函数。这个结论通常由变上限积分构造：

$$
F(x)=\int_a^x f(t)\,dt.
$$

### 2.2 不定积分的基本性质

$$
\left(\int f(x)\,dx\right)'=f(x),
$$

$$
\int f'(x)\,dx=f(x)+C,
$$

$$
\int[\alpha f(x)+\beta g(x)]\,dx
=\alpha\int f(x)\,dx+\beta\int g(x)\,dx.
$$

最后一条对任意常数 $\alpha,\beta$ 成立。

### 2.3 基本积分公式

| 被积函数 | 原函数 |
|---|---|
| $x^\alpha,\ \alpha\ne-1$ | $\dfrac{x^{\alpha+1}}{\alpha+1}+C$ |
| $\dfrac1x$ | $\ln|x|+C$ |
| $e^x$ | $e^x+C$ |
| $a^x$ | $\dfrac{a^x}{\ln a}+C$ |
| $\sin x$ | $-\cos x+C$ |
| $\cos x$ | $\sin x+C$ |
| $\sec^2x$ | $\tan x+C$ |
| $\csc^2x$ | $-\cot x+C$ |
| $\sec x\tan x$ | $\sec x+C$ |
| $\csc x\cot x$ | $-\csc x+C$ |
| $\dfrac1{1+x^2}$ | $\arctan x+C$ |
| $\dfrac1{\sqrt{1-x^2}}$ | $\arcsin x+C$ |
| $\tan x$ | $\ln|\sec x|+C$ |
| $\cot x$ | $\ln|\sin x|+C$ |
| $\sec x$ | $\ln|\sec x+\tan x|+C$ |
| $\csc x$ | $\ln|\csc x-\cot x|+C$ |

常用三角变形：

$$
\sin^2x=\frac{1-\cos2x}{2},
\quad\;\cos^2x=\frac{1+\cos2x}{2}.
$$

---

## 三、定积分的概念与性质

### 3.1 定积分作为黎曼和的极限

将区间 $[a,b]$ 分成 $n$ 个小区间，分点为

$$
a=x_0<x_1<\cdots<x_n=b.
$$

记 $\Delta x_i=x_i-x_{i-1}$，并在第 $i$ 个小区间任取 $\xi_i$。若当最大区间长度趋于零时，

$$
\sum_{i=1}^n f(\xi_i)\Delta x_i
$$

的极限存在且与分割及取点方式无关，则称该极限为 $f$ 在 $[a,b]$ 上的定积分：

$$
\int_a^b f(x)\,dx
=\lim_{\max\Delta x_i\to0}
\sum_{i=1}^n f(\xi_i)\Delta x_i.
$$

连续函数在闭区间上可积。

定积分是一个数；不定积分是一个函数族。

### 3.2 定积分的基本性质

设所涉及的积分均存在，则

$$
\int_a^b[\alpha f(x)+\beta g(x)]\,dx
=\alpha\int_a^b f(x)\,dx
+\beta\int_a^b g(x)\,dx,
$$

$$
\int_a^b f(x)\,dx
=-\int_b^a f(x)\,dx,
$$

$$
\int_a^a f(x)\,dx=0,
$$

$$
\int_a^b f(x)\,dx
=\int_a^c f(x)\,dx
+\int_c^b f(x)\,dx.
$$

若在 $[a,b]$ 上 $f(x)\le g(x)$，则

$$
\int_a^b f(x)\,dx
\le\int_a^b g(x)\,dx.
$$

特别地，

$$
\left|\int_a^b f(x)\,dx\right|
\le\int_a^b |f(x)|\,dx.
$$

### 3.3 定积分中值定理

若 $f$ 在 $[a,b]$ 上连续，则存在 $\xi\in[a,b]$，使

$$
\int_a^b f(x)\,dx=f(\xi)(b-a).
$$

因此

$$
f(\xi)=\frac1{b-a}\int_a^b f(x)\,dx
$$

可以理解成函数在区间上的平均值。

证明：由最值定理，$f$ 在 $[a,b]$ 上取得最小值 $m$ 与最大值 $M$。由积分的单调性，

$$
m(b-a)
\le\int_a^b f(x)\,dx
\le M(b-a).
$$

因此

$$
m\le
\frac1{b-a}\int_a^b f(x)\,dx
\le M.
$$

由介值定理，存在 $\xi\in[a,b]$，使 $f(\xi)$ 等于该积分平均值。

---

## 四、变上限积分与牛顿—莱布尼茨公式

若 $f$ 在包含 $a$ 的区间上连续，定义

$$
\Phi(x)=\int_a^x f(t)\,dt.
$$

### 4.1 变上限积分求导

$$
\Phi'(x)=f(x).
$$

证明：考虑增量

$$
\begin{aligned}
\Phi(x+h)-\Phi(x)
&=\int_a^{x+h}f(t)\,dt-\int_a^x f(t)\,dt\\
&=\int_x^{x+h}f(t)\,dt.
\end{aligned}
$$

由积分中值定理，存在 $\xi_h$ 位于 $x$ 与 $x+h$ 之间，使

$$
\frac{\Phi(x+h)-\Phi(x)}h=f(\xi_h).
$$

当 $h\to0$ 时，$\xi_h\to x$，再由 $f$ 连续，得到

$$
\Phi'(x)=f(x).
$$

复合形式：

$$
\frac d{dx}\int_a^{u(x)}f(t)\,dt
=f(u(x))u'(x).
$$

若上下限都随 $x$ 变化，

$$
\frac d{dx}\int_{v(x)}^{u(x)}f(t)\,dt
=f(u(x))u'(x)-f(v(x))v'(x).
$$

### 4.2 牛顿—莱布尼茨公式

若 $f$ 在 $[a,b]$ 上连续，$F$ 是 $f$ 的任意一个原函数，则

$$
\int_a^b f(x)\,dx=F(b)-F(a).
$$

证明：由变上限积分，

$$
\Phi(x)=\int_a^x f(t)\,dt
$$

也是 $f$ 的一个原函数。两个原函数只相差常数，因此

$$
\Phi(x)=F(x)+C.
$$

由 $\Phi(a)=0$，可得 $C=-F(a)$。于是

$$
\int_a^b f(x)\,dx
=\Phi(b)=F(b)-F(a).
$$

---

## 五、换元积分法

### 5.1 不定积分换元

若 $u=\varphi(x)$，则

$$
\int f(\varphi(x))\varphi'(x)\,dx
=\int f(u)\,du.
$$

第一类换元法用于“凑微分”；第二类换元法反过来令

$$
x=\psi(t),
\quad\;dx=\psi'(t)\,dt.
$$

代换必须保持区间上的一一对应，最后还要回代到原变量。

### 5.2 定积分换元

若 $x=\varphi(t)$，$\varphi$ 在相应区间上连续可导，则

$$
\int_a^b f(\varphi(x))\varphi'(x)\,dx
=\int_{\varphi(a)}^{\varphi(b)}f(u)\,du.
$$

也可写成

$$
\int_a^b f(x)\,dx
=\int_{\alpha}^{\beta}f(\varphi(t))\varphi'(t)\,dt,
$$

其中

$$
\varphi(\alpha)=a,
\quad\;\varphi(\beta)=b.
$$

定积分换元后，上下限必须同时改变，计算完不需要再回代。

---

## 六、分部积分法

由乘积求导公式

$$
(uv)'=u'v+uv'
$$

移项并积分，得

$$
\int u\,dv=uv-\int v\,du.
$$

定积分形式：

$$
\int_a^b u(x)v'(x)\,dx
=\left.u(x)v(x)\right|_a^b
-\int_a^b v(x)u'(x)\,dx.
$$

选择 $u$ 与 $dv$ 时，常用口诀：

> 反、对、幂、三、指。

通常排在前面的函数优先作为 $u$，后面的函数优先放入 $dv$。口诀只是经验，不应机械套用；目标是让新的积分更简单。

---

## 七、反常积分

### 7.1 无穷区间

$$
\int_a^{+\infty}f(x)\,dx
=\lim_{R\to+\infty}\int_a^R f(x)\,dx.
$$

若右端极限存在且有限，称反常积分收敛，否则发散。

### 7.2 无界函数

若 $f$ 在 $a$ 的右邻域无界，则

$$
\int_a^b f(x)\,dx
=\lim_{\varepsilon\to0^+}
\int_{a+\varepsilon}^b f(x)\,dx.
$$

端点 $b$ 处或区间内部瑕点类似处理。

### 7.3 常用比较基准

$$
\int_1^{+\infty}\frac{dx}{x^p}
\begin{cases}
\text{收敛},&p>1,\\
\text{发散},&p\le1.
\end{cases}
$$

$$
\int_0^1\frac{dx}{x^p}
\begin{cases}
\text{收敛},&p<1,\\
\text{发散},&p\ge1.
\end{cases}
$$

若 $0\le f(x)\le g(x)$：

- $\int g$ 收敛，则 $\int f$ 收敛；
- $\int f$ 发散，则 $\int g$ 发散。

若 $f\ge0$，且 $f(x)\sim Cg(x)$，$C>0$，则 $\int f$ 与 $\int g$ 同敛散。

---

## 八、定积分的应用

### 8.1 平面图形面积

若在 $[a,b]$ 上 $f(x)\ge g(x)$，则两曲线之间的面积为

$$
A=\int_a^b[f(x)-g(x)]\,dx.
$$

若两条曲线多次交叉，应先求交点并分区间取绝对值。

### 8.2 旋转体体积

曲线 $y=f(x)\ge0$，$x\in[a,b]$，绕 $x$ 轴旋转所得体积为

$$
V=\pi\int_a^b[f(x)]^2\,dx.
$$

曲线 $y=f(x)$ 与 $y=g(x)$ 围成区域绕 $x$ 轴旋转，若 $f\ge g\ge0$，体积为

$$
V=\pi\int_a^b
\left([f(x)]^2-[g(x)]^2\right)\,dx.
$$

### 8.3 函数平均值

函数 $f$ 在 $[a,b]$ 上的平均值为

$$
\bar f=\frac1{b-a}\int_a^b f(x)\,dx.
$$

### 8.4 经济应用

若需求函数为 $p=D(q)$，市场均衡价格为 $p_0$、均衡数量为 $q_0$，消费者剩余可写为

$$
CS=\int_0^{q_0}[D(q)-p_0]\,dq.
$$

类似地，若供给函数为 $p=S(q)$，生产者剩余可写为

$$
PS=\int_0^{q_0}[p_0-S(q)]\,dq.
$$

---

# 训练集：试卷 1—5

## 试卷 1：原函数与基本不定积分

### 一、计算题

1. 求 $\displaystyle\int\left(3x^2-\frac2x+1\right)\,dx$。
2. 求 $\displaystyle\int\left(\sqrt x+\frac1{x^2}\right)\,dx$。
3. 求 $\displaystyle\int(2e^x-3\sin x)\,dx$。
4. 求 $\displaystyle\int(x-1)^2\,dx$。
5. 求 $\displaystyle\int(1+\tan^2x)\,dx$。
6. 求 $\displaystyle\int(\sec^2x+\csc^2x)\,dx$。
7. 求 $\displaystyle\int(e^{2x}+2^x)\,dx$。
8. 求 $\displaystyle\int(x+1)^3\,dx$。
9. 求 $\displaystyle\int\frac{2x+1}{x^2+x+1}\,dx$。
10. 求 $\displaystyle\int\sin^2x\,dx$。
11. 求 $\displaystyle\int\cos^2x\,dx$。
12. 求 $\displaystyle\int\frac{x-2}{\sqrt x}\,dx$。
13. 已知 $F'(x)=x^2$，且 $F(0)=3$，求 $F(x)$。
14. 解初值问题

$$
    \frac{dy}{dx}=2x+1,
    \qquad y(0)=1.
$$

15. 求 $\displaystyle\int(3x^2+\sec^2x)\,dx$。
16. 求 $\displaystyle\int\frac{x+1}{\sqrt{x+1}}\,dx$，$x>-1$。

### 二、证明题

17. 证明：若 $F,G$ 都是 $f$ 在区间 $I$ 上的原函数，则 $F-G$ 为常数。
18. 证明不定积分的线性性质

$$
    \int[\alpha f(x)+\beta g(x)]\,dx
    =\alpha\int f(x)\,dx+\beta\int g(x)\,dx.
$$

19. 证明

$$
    \int\frac1x\,dx=\ln|x|+C.
$$

20. 证明

$$
    \int\tan x\,dx=-\ln|\cos x|+C.
$$

### 试卷 1 答案解析

1.

   $$
   \int\left(3x^2-\frac2x+1\right)\,dx
   =x^3-2\ln|x|+x+C.
   $$

2.

   $$
   \int\left(\sqrt x+\frac1{x^2}\right)\,dx
   =\frac23x^{3/2}-\frac1x+C.
   $$

3.

   $$
   \int(2e^x-3\sin x)\,dx
   =2e^x+3\cos x+C.
   $$

4.

   $$
   \int(x-1)^2\,dx=\frac{(x-1)^3}{3}+C.
   $$

5.

   $$
   \int(1+\tan^2x)\,dx=\int\sec^2x\,dx
   =\tan x+C.
   $$

6.

   $$
   \int(\sec^2x+\csc^2x)\,dx
   =\tan x-\cot x+C.
   $$

7.

   $$
   \int(e^{2x}+2^x)\,dx
   =\frac12e^{2x}+\frac{2^x}{\ln2}+C.
   $$

8.

   $$
   \int(x+1)^3\,dx
   =\frac14(x+1)^4+C.
   $$

9. 令

$$
   u=x^2+x+1,
   \qquad du=(2x+1)dx.
$$

   则

$$
   \int\frac{2x+1}{x^2+x+1}\,dx
   =\ln|x^2+x+1|+C.
$$

   由于 $x^2+x+1>0$，绝对值可省略。

10.

    $$
    \begin{aligned}
    \int\sin^2x\,dx
    &=\int\frac{1-\cos2x}{2}\,dx\\
    &=\frac x2-\frac{\sin2x}{4}+C.
    \end{aligned}
    $$

11.

    $$
    \int\cos^2x\,dx
    =\frac x2+\frac{\sin2x}{4}+C.
    $$

12.

    $$
    \frac{x-2}{\sqrt x}
    =x^{1/2}-2x^{-1/2}.
    $$

    所以

$$
    \int\frac{x-2}{\sqrt x}\,dx
    =\frac23x^{3/2}-4\sqrt x+C.
$$

13.

    $$
    F(x)=\int x^2\,dx=\frac{x^3}{3}+C.
    $$

    由 $F(0)=3$，得 $C=3$，所以

$$
    F(x)=\frac{x^3}{3}+3.
$$

14.

    $$
    y=\int(2x+1)\,dx=x^2+x+C.
    $$

    由 $y(0)=1$，得 $C=1$，所以

$$
    y=x^2+x+1.
$$

15.

    $$
    \int(3x^2+\sec^2x)\,dx
    =x^3+\tan x+C.
    $$

16.

    $$
    \frac{x+1}{\sqrt{x+1}}=\sqrt{x+1}.
    $$

    所以

$$
    \int\sqrt{x+1}\,dx
    =\frac23(x+1)^{3/2}+C.
$$

17. 由

$$
    (F-G)'=F'-G'=f-f=0.
$$

    在区间上任取两点 $x_1<x_2$，由拉格朗日中值定理，存在 $\xi$，使

$$
    (F-G)(x_2)-(F-G)(x_1)
    =0.
$$

    因此 $F-G$ 为常数。

18. 记

$$
    F(x)=\alpha\int f(x)\,dx
    +\beta\int g(x)\,dx.
$$

    则

$$
    F'(x)=\alpha f(x)+\beta g(x).
$$

    所以 $F$ 是 $\alpha f+\beta g$ 的一个原函数，线性性质成立。两端可能相差的常数已经包含在不定积分的任意常数中。

19. 当 $x>0$ 时，

$$
    (\ln|x|)'=(\ln x)'=\frac1x.
$$

    当 $x<0$ 时，

$$
    (\ln|x|)'=(\ln(-x))'
    =\frac1{-x}\cdot(-1)=\frac1x.
$$

    因此两个区间上都有

$$
    \int\frac1x\,dx=\ln|x|+C.
$$

20. 对右端求导：

$$
    \begin{aligned}
    (-\ln|\cos x|)'
    &=-\frac{1}{\cos x}(-\sin x)\\
    &=\frac{\sin x}{\cos x}
    =\tan x.
    \end{aligned}
$$

    所以

$$
    \int\tan x\,dx=-\ln|\cos x|+C.
$$

---

## 试卷 2：换元法与分部积分法

### 一、计算题

1. 求 $\displaystyle\int2x(x^2+1)^5\,dx$。
2. 求 $\displaystyle\int xe^{x^2}\,dx$。
3. 求 $\displaystyle\int\cos3x\,dx$。
4. 求 $\displaystyle\int\frac{\ln x}{x}\,dx$。
5. 求 $\displaystyle\int x\sqrt{x^2+4}\,dx$。
6. 求 $\displaystyle\int\frac{e^{\sqrt x}}{\sqrt x}\,dx$。
7. 求 $\displaystyle\int x\sin x\,dx$。
8. 求 $\displaystyle\int x\ln x\,dx$。
9. 求 $\displaystyle\int x^2e^x\,dx$。
10. 求 $\displaystyle\int\ln x\,dx$。
11. 求 $\displaystyle\int\arctan x\,dx$。
12. 求 $\displaystyle\int x\cos2x\,dx$。
13. 求 $\displaystyle\int\frac1{x\ln x}\,dx$。
14. 求 $\displaystyle\int\frac{2x+3}{x^2+3x+5}\,dx$。
15. 求 $\displaystyle\int\frac{\sin(\ln x)}x\,dx$。
16. 求 $\displaystyle\int\frac{x^2}{1+x^3}\,dx$。

### 二、证明题

17. 由乘积求导公式证明不定积分的分部积分公式

$$
    \int u\,dv=uv-\int v\,du.
$$

18. 证明不定积分换元公式

$$
    \int f(\varphi(x))\varphi'(x)\,dx
    =\int f(u)\,du.
$$

19. 证明

$$
    \int\sec x\,dx
    =\ln|\sec x+\tan x|+C.
$$

20. 证明递推公式

$$
    I_n=\int x^ne^x\,dx
    =x^ne^x-nI_{n-1},
    \qquad n\ge1.
$$

### 试卷 2 答案解析

1. 令 $u=x^2+1$，$du=2x\,dx$：

$$
   \int2x(x^2+1)^5\,dx
   =\frac16(x^2+1)^6+C.
$$

2. 令 $u=x^2$，$du=2x\,dx$：

$$
   \int xe^{x^2}\,dx
   =\frac12e^{x^2}+C.
$$

3.

   $$
   \int\cos3x\,dx=\frac13\sin3x+C.
   $$

4. 令 $u=\ln x$：

$$
   \int\frac{\ln x}{x}\,dx
   =\frac12(\ln x)^2+C.
$$

5. 令 $u=x^2+4$：

$$
   \int x\sqrt{x^2+4}\,dx
   =\frac13(x^2+4)^{3/2}+C.
$$

6. 令 $t=\sqrt x$，则 $dx=2t\,dt$：

$$
   \int\frac{e^{\sqrt x}}{\sqrt x}\,dx
   =2e^{\sqrt x}+C.
$$

7. 取 $u=x,dv=\sin x\,dx$：

$$
   \begin{aligned}
   \int x\sin x\,dx
   &=-x\cos x+\int\cos x\,dx\\
   &=-x\cos x+\sin x+C.
   \end{aligned}
$$

8. 取 $u=\ln x,dv=x\,dx$：

$$
   \begin{aligned}
   \int x\ln x\,dx
   &=\frac{x^2}{2}\ln x
   -\frac12\int x\,dx\\
   &=\frac{x^2}{2}\ln x-\frac{x^2}{4}+C.
   \end{aligned}
$$

9. 连续两次分部积分：

$$
   \int x^2e^x\,dx
   =x^2e^x-2\int xe^x\,dx.
$$

   又

$$
   \int xe^x\,dx=(x-1)e^x+C,
$$

   所以

$$
   \int x^2e^x\,dx=(x^2-2x+2)e^x+C.
$$

10.

    $$
    \int\ln x\,dx
    =x\ln x-\int1\,dx
    =x\ln x-x+C.
    $$

11. 取 $u=\arctan x,dv=dx$：

$$
    \begin{aligned}
    \int\arctan x\,dx
    &=x\arctan x-\int\frac{x}{1+x^2}\,dx\\
    &=x\arctan x-\frac12\ln(1+x^2)+C.
    \end{aligned}
$$

12.

    $$
    \int x\cos2x\,dx
    =\frac x2\sin2x+\frac14\cos2x+C.
    $$

13. 令 $u=\ln x$：

$$
    \int\frac1{x\ln x}\,dx
    =\ln|\ln x|+C.
$$

14. 分子恰好是分母的导数：

$$
    \int\frac{2x+3}{x^2+3x+5}\,dx
    =\ln(x^2+3x+5)+C.
$$

15. 令 $t=\ln x$：

$$
    \int\frac{\sin(\ln x)}x\,dx
    =-\cos(\ln x)+C.
$$

16. 令 $u=1+x^3$：

$$
    \int\frac{x^2}{1+x^3}\,dx
    =\frac13\ln|1+x^3|+C.
$$

17. 由

$$
    (uv)'=u'v+uv'
$$

    得

$$
    uv'=(uv)'-u'v.
$$

    两边积分：

$$
    \int u\,dv
    =uv-\int v\,du.
$$

18. 若 $u=\varphi(x)$，则

$$
    du=\varphi'(x)\,dx.
$$

    因此

$$
    \int f(\varphi(x))\varphi'(x)\,dx
    =\int f(u)\,du.
$$

    若右端为 $F(u)+C$，左端就是 $F(\varphi(x))+C$。

19. 对右端求导：

$$
    \begin{aligned}
    [\ln|\sec x+\tan x|]'
    &=\frac{\sec x\tan x+\sec^2x}
    {\sec x+\tan x}\\
    &=\sec x.
    \end{aligned}
$$

    因此原式成立。

20. 对 $I_n$ 分部积分，取

$$
    u=x^n,
    \qquad dv=e^xdx.
$$

    则

$$
    \begin{aligned}
    I_n
    &=x^ne^x-\int e^x\cdot nx^{n-1}\,dx\\
    &=x^ne^x-nI_{n-1}.
    \end{aligned}
$$

---

## 试卷 3：定积分、变上限积分与牛顿—莱布尼茨公式

### 一、计算题

1. 用黎曼和求 $\displaystyle\int_0^1x\,dx$。
2. 求 $\displaystyle\int_{-1}^2 3x^2\,dx$。
3. 求 $\displaystyle\int_0^\pi\sin x\,dx$。
4. 求 $\displaystyle\int_1^e\frac1x\,dx$。
5. 求 $\displaystyle\int_0^1e^x\,dx$。
6. 求 $\displaystyle\int_0^{\pi/2}\cos x\,dx$。
7. 求 $\displaystyle\int_{-1}^1(x^3+x)\,dx$。
8. 求 $\displaystyle\int_0^2|x-1|\,dx$。
9. 求 $\displaystyle\frac d{dx}\int_0^x e^{t^2}\,dt$。
10. 求 $\displaystyle\frac d{dx}\int_0^{x^2}\sin t\,dt$。
11. 求 $\displaystyle\frac d{dx}\int_x^{x^2}e^t\,dt$。
12. 求 $\displaystyle\frac d{dx}\int_{\sin x}^{\cos x}t^2\,dt$。
13. 求 $\displaystyle\int_0^1(2x+1)^5\,dx$。
14. 求 $\displaystyle\int_0^2\frac{x}{x^2+1}\,dx$。
15. 求 $\displaystyle\int_0^{\pi/2}x\cos x\,dx$。
16. 求 $\displaystyle\int_1^e\ln x\,dx$。

### 二、证明题

17. 证明牛顿—莱布尼茨公式。
18. 证明定积分中值定理。
19. 若 $f$ 在 $[-a,a]$ 上连续且为奇函数，证明

$$
    \int_{-a}^af(x)\,dx=0.
$$

20. 设 $f$ 在 $[a,b]$ 上连续且 $f(x)\ge0$。若

$$
    \int_a^b f(x)\,dx=0,
$$

    证明 $f(x)\equiv0$。

### 试卷 3 答案解析

1. 取分割

$$
   x_i=\frac in,\qquad \xi_i=\frac in.
$$

   则

$$
   \sum_{i=1}^n f(\xi_i)\Delta x
   =\sum_{i=1}^n\frac in\cdot\frac1n
   =\frac{n+1}{2n}\to\frac12.
$$

   所以

$$
   \int_0^1x\,dx=\frac12.
$$

2.

   $$
   \int_{-1}^2 3x^2\,dx
   =\left.x^3\right|_{-1}^2
   =8-(-1)=9.
   $$

3.

   $$
   \int_0^\pi\sin x\,dx
   =\left.(-\cos x)\right|_0^\pi
   =1-(-1)=2.
   $$

4.

   $$
   \int_1^e\frac1x\,dx
   =\left.\ln x\right|_1^e=1.
   $$

5.

   $$
   \int_0^1e^x\,dx=e-1.
   $$

6.

   $$
   \int_0^{\pi/2}\cos x\,dx
   =\left.\sin x\right|_0^{\pi/2}=1.
   $$

7. $x^3+x$ 是奇函数，积分区间关于原点对称，所以积分等于 $0$。

8.

   $$
   \begin{aligned}
   \int_0^2|x-1|\,dx
   &=\int_0^1(1-x)\,dx+\int_1^2(x-1)\,dx\\
   &=\frac12+\frac12=1.
   \end{aligned}
   $$

9. 由变上限积分求导，

$$
   \frac d{dx}\int_0^x e^{t^2}\,dt=e^{x^2}.
$$

10.

    $$
    \frac d{dx}\int_0^{x^2}\sin t\,dt
    =\sin(x^2)\cdot2x
    =2x\sin x^2.
    $$

11.

    $$
    \frac d{dx}\int_x^{x^2}e^t\,dt
    =e^{x^2}\cdot2x-e^x
    =2xe^{x^2}-e^x.
    $$

12.

    $$
    \begin{aligned}
    \frac d{dx}\int_{\sin x}^{\cos x}t^2\,dt
    &=\cos^2x\cdot(-\sin x)
    -\sin^2x\cdot\cos x\\
    &=-\sin x\cos^2x-\sin^2x\cos x.
    \end{aligned}
    $$

13.

    $$
    \int_0^1(2x+1)^5\,dx
    =\left.\frac{(2x+1)^6}{12}\right|_0^1
    =\frac{3^6-1}{12}
    =\frac{182}{3}.
    $$

14.

    $$
    \int_0^2\frac{x}{x^2+1}\,dx
    =\left.\frac12\ln(x^2+1)\right|_0^2
    =\frac12\ln5.
    $$

15. 分部积分：

$$
    \begin{aligned}
    \int_0^{\pi/2}x\cos x\,dx
    &=\left.x\sin x\right|_0^{\pi/2}
    -\int_0^{\pi/2}\sin x\,dx\\
    &=\frac\pi2-\left.(-\cos x)\right|_0^{\pi/2}\\
    &=\frac\pi2-1.
    \end{aligned}
$$

16.

    $$
    \int_1^e\ln x\,dx
    =\left.x\ln x-x\right|_1^e
    =(e-e)-(0-1)=1.
    $$

17. 定义

$$
    \Phi(x)=\int_a^x f(t)\,dt.
$$

    由变上限积分求导，$\Phi'(x)=f(x)$，所以 $\Phi$ 是 $f$ 的一个原函数。

    若 $F$ 是 $f$ 的任意原函数，则 $F-\Phi$ 的导数为零，故二者相差常数：

$$
    F(x)=\Phi(x)+C.
$$

    由 $\Phi(a)=0$，得 $C=F(a)$。因此

$$
    \Phi(b)=F(b)-F(a),
$$

    即

$$
    \int_a^b f(x)\,dx=F(b)-F(a).
$$

18. 设 $m,M$ 分别是 $f$ 在 $[a,b]$ 上的最小值和最大值。则

$$
    m\le f(x)\le M.
$$

    对不等式积分：

$$
    m(b-a)
    \le\int_a^b f(x)\,dx
    \le M(b-a).
$$

    除以 $b-a$，得平均值位于 $m,M$ 之间。由介值定理，存在 $\xi\in[a,b]$，使

$$
    f(\xi)=\frac1{b-a}\int_a^b f(x)\,dx.
$$

19.

    $$
    \begin{aligned}
    \int_{-a}^a f(x)\,dx
    &=\int_{-a}^0f(x)\,dx+\int_0^af(x)\,dx.
    \end{aligned}
    $$

    对第一项令 $t=-x$：

$$
    \int_{-a}^0f(x)\,dx
    =\int_0^a f(-t)\,dt
    =-\int_0^af(t)\,dt.
$$

    两项相消，故

$$
    \int_{-a}^af(x)\,dx=0.
$$

20. 反设存在 $x_0\in[a,b]$，使 $f(x_0)>0$。令

$$
    \varepsilon=\frac{f(x_0)}2>0.
$$

    由连续性，存在包含 $x_0$ 的小区间 $J$，使其中 $f(x)\ge f(x_0)/2$。于是

$$
    \int_a^b f(x)\,dx
    \ge\int_J\frac{f(x_0)}2\,dx>0,
$$

    这与积分为零矛盾。因此 $f(x)\equiv0$。

---

## 试卷 4：反常积分与定积分应用

### 一、计算题

1. 计算 $\displaystyle\int_1^{+\infty}\frac{dx}{x^2}$。
2. 判断 $\displaystyle\int_1^{+\infty}\frac{dx}{x}$ 是否收敛。
3. 计算 $\displaystyle\int_0^1\frac{dx}{\sqrt x}$。
4. 计算 $\displaystyle\int_0^1\ln x\,dx$。
5. 计算 $\displaystyle\int_{-\infty}^{+\infty}e^{-|x|}\,dx$。
6. 计算 $\displaystyle\int_0^{+\infty}e^{-2x}\,dx$。
7. 讨论

$$
   \int_2^{+\infty}\frac{dx}{x(\ln x)^p}
$$

   的敛散性；当它收敛时计算其值。
8. 判断 $\displaystyle\int_0^{\pi/2}\sec^2x\,dx$ 是否收敛。
9. 判断 $\displaystyle\int_1^{+\infty}\frac{\sin^2x}{x^2}\,dx$ 是否收敛。
10. 求曲线 $y=x^2$ 与 $y=x$ 在 $[0,1]$ 上围成的面积。
11. 求曲线 $y=\sqrt x$ 与 $y=x^2$ 围成的面积。
12. 曲线 $y=\sqrt x$、$x=4$ 与 $x$ 轴围成的区域绕 $x$ 轴旋转，求体积。
13. 曲线 $y=e^{-x}$ 与 $x$ 轴在 $x\ge0$ 围成的无界区域绕 $x$ 轴旋转，求体积。
14. 求 $\cos x$ 在 $[0,\pi/2]$ 上的平均值。
15. 求 $x^2$ 在 $[0,3]$ 上的平均值。
16. 需求函数为 $p=10-q$，均衡价格为 $4$。求消费者剩余。

### 二、证明题

17. 证明 $p$-积分

$$
    \int_1^{+\infty}\frac{dx}{x^p}
$$

    当且仅当 $p>1$ 时收敛。
18. 证明反常积分的比较判别法：若 $0\le f(x)\le g(x)$，且 $\int_a^{+\infty}g(x)\,dx$ 收敛，则 $\int_a^{+\infty}f(x)\,dx$ 也收敛。
19. 由定积分的“分割、近似、求和、取极限”思想推导绕 $x$ 轴旋转体的体积公式

$$
    V=\pi\int_a^b[f(x)]^2\,dx.
$$

20. 证明：若 $\int_a^{+\infty}|f(x)|\,dx$ 收敛，则 $\int_a^{+\infty}f(x)\,dx$ 收敛。

### 试卷 4 答案解析

1.

   $$
   \int_1^R\frac{dx}{x^2}
   =1-\frac1R\to1.
   $$

   所以反常积分收敛，值为 $1$。

2.

   $$
   \int_1^R\frac{dx}{x}=\ln R\to+\infty,
   $$

   所以积分发散。

3.

   $$
   \int_\varepsilon^1x^{-1/2}\,dx
   =2-2\sqrt\varepsilon\to2.
   $$

   所以

$$
   \int_0^1\frac{dx}{\sqrt x}=2.
$$

4.

   $$
   \int_\varepsilon^1\ln x\,dx
   =\left.(x\ln x-x)\right|_\varepsilon^1
   =-1-\varepsilon\ln\varepsilon+\varepsilon
   \to-1.
   $$

5. 利用偶性，

$$
   \begin{aligned}
   \int_{-\infty}^{+\infty}e^{-|x|}\,dx
   &=2\int_0^{+\infty}e^{-x}\,dx\\
   &=2.
   \end{aligned}
$$

6.

   $$
   \int_0^{+\infty}e^{-2x}\,dx
   =\left.-\frac12e^{-2x}\right|_0^{+\infty}
   =\frac12.
   $$

7. 令 $u=\ln x$，则

$$
   \int_2^{+\infty}\frac{dx}{x(\ln x)^p}
   =\int_{\ln2}^{+\infty}\frac{du}{u^p}.
$$

   所以当且仅当 $p>1$ 时收敛。此时

$$
   \int_{\ln2}^{+\infty}u^{-p}\,du
   =\frac{(\ln2)^{1-p}}{p-1}.
$$

8.

   $$
   \int_0^R\sec^2x\,dx=\tan R.
   $$

   当 $R\to(\pi/2)^-$ 时，$\tan R\to+\infty$，所以积分发散。

9.

   $$
   0\le\frac{\sin^2x}{x^2}\le\frac1{x^2},
   $$

   而 $\int_1^{+\infty}x^{-2}dx$ 收敛。由比较判别法，原积分收敛。

10. 在 $[0,1]$ 上 $x\ge x^2$，面积为

$$
    \int_0^1(x-x^2)\,dx
    =\frac12-\frac13=\frac16.
$$

11. 在 $[0,1]$ 上 $\sqrt x\ge x^2$，面积为

$$
    \int_0^1(\sqrt x-x^2)\,dx
    =\frac23-\frac13=\frac13.
$$

12.

    $$
    V=\pi\int_0^4(\sqrt x)^2\,dx
    =\pi\int_0^4x\,dx
    =8\pi.
    $$

13.

    $$
    V=\pi\int_0^{+\infty}e^{-2x}\,dx
    =\frac\pi2.
    $$

14.

    $$
    \bar f=\frac1{\pi/2}\int_0^{\pi/2}\cos x\,dx
    =\frac2\pi.
    $$

15.

    $$
    \bar f=\frac13\int_0^3x^2\,dx
    =\frac13\cdot9=3.
    $$

16. 均衡价格为 $p_0=4$ 时，

$$
    4=10-q_0,
$$

    所以 $q_0=6$。消费者剩余为

$$
    \begin{aligned}
    CS
    &=\int_0^6[(10-q)-4]\,dq\\
    &=\int_0^6(6-q)\,dq\\
    &=36-18=18.
    \end{aligned}
$$

17. 对任意 $R>1$，当 $p\ne1$ 时，

$$
    \int_1^R x^{-p}\,dx
    =\frac{R^{1-p}-1}{1-p}.
$$

    若 $p>1$，则 $1-p<0$，$R^{1-p}\to0$，极限为 $1/(p-1)$。

    若 $p<1$，则 $1-p>0$，$R^{1-p}\to+\infty$，积分发散。

    若 $p=1$，则

$$
    \int_1^R\frac{dx}{x}=\ln R\to+\infty.
$$

    因此当且仅当 $p>1$ 时收敛。

18. 对 $R>a$，由 $0\le f\le g$ 得

$$
    0\le\int_a^R f(x)\,dx
    \le\int_a^R g(x)\,dx.
$$

    随着 $R$ 增大，左端单调递增；右端趋于有限极限 $\int_a^\infty g$。单调有界，故左端极限存在且有限，即 $\int_a^\infty f$ 收敛。

19. 将 $[a,b]$ 分成小区间 $[x_{i-1},x_i]$。在第 $i$ 个小区间上，用高为 $f(\xi_i)$ 的细圆柱近似旋转体，其体积约为

$$
    \Delta V_i\approx\pi[f(\xi_i)]^2\Delta x_i.
$$

    求和：

$$
    V\approx\sum_{i=1}^n\pi[f(\xi_i)]^2\Delta x_i.
$$

    令最大区间长度趋于零，得到

$$
    V=\pi\int_a^b[f(x)]^2\,dx.
$$

20. 记

$$
    f^+(x)=\frac{|f(x)|+f(x)}2.
$$

    则 $0\le f^+\le|f|$。由比较判别法，$\int_a^\infty f^+$ 收敛。又

$$
    f=2f^+-|f|,
$$

    两个收敛的反常积分之差仍收敛，所以 $\int_a^\infty f$ 收敛。

---

## 试卷 5：综合积分技术与应用

### 一、计算题

1. 求 $\displaystyle\int\frac{x}{x^2+4}\,dx$。
2. 求 $\displaystyle\int\frac{dx}{x^2+4x+13}$。
3. 求 $\displaystyle\int\frac{dx}{x^2-4}$。
4. 求 $\displaystyle\int x^3e^{-x^2}\,dx$。
5. 求 $\displaystyle\int\sqrt{1-x^2}\,dx$。
6. 求 $\displaystyle\int\sin^3x\,dx$。
7. 求 $\displaystyle\int\sec^3x\,dx$。
8. 求 $\displaystyle\int_0^1\arctan x\,dx$。
9. 求 $\displaystyle\int_0^\pi x\sin x\,dx$。
10. 求 $\displaystyle\int_0^{\ln2}\frac{e^x}{1+e^{2x}}\,dx$。
11. 求 $y=x^3$ 与 $y=x$ 围成的总面积。
12. 直线 $y=x$ 在 $[0,2]$ 上与 $x$ 轴围成的区域绕 $x$ 轴旋转，求体积。
13. 曲线 $y=1/x$ 在 $x\ge1$ 下与 $x$ 轴围成的无界区域绕 $x$ 轴旋转，求体积。
14. 求 $\ln x$ 在 $[1,e]$ 上的平均值。
15. 需求函数 $p=20-2q$，均衡价格 $p_0=8$。求消费者剩余。
16. 求 $f(x)=x^2$ 在 $[0,3]$ 上满足积分中值定理的 $\xi$。

### 二、证明题

17. 证明定积分的分部积分公式。
18. 推导两条曲线 $y=f(x)\ge g(x)$ 在 $[a,b]$ 上围成区域的面积公式。
19. 证明

$$
    \int_0^1\frac{dx}{x^p}
$$

    当且仅当 $p<1$ 时收敛。
20. 设 $f$ 是周期为 $T$ 的连续函数。证明对任意实数 $a$，

$$
    \int_a^{a+T}f(x)\,dx
    =\int_0^Tf(x)\,dx.
$$

### 试卷 5 答案解析

1.

   $$
   \int\frac{x}{x^2+4}\,dx
   =\frac12\ln(x^2+4)+C.
   $$

2.

   $$
   x^2+4x+13=(x+2)^2+9.
   $$

   所以

$$
   \int\frac{dx}{x^2+4x+13}
   =\frac13\arctan\frac{x+2}{3}+C.
$$

3.

   $$
   \frac1{x^2-4}
   =\frac14\left(\frac1{x-2}-\frac1{x+2}\right).
   $$

   因此

$$
   \int\frac{dx}{x^2-4}
   =\frac14\ln\left|\frac{x-2}{x+2}\right|+C.
$$

4. 令 $u=x^2$：

$$
   \begin{aligned}
   \int x^3e^{-x^2}\,dx
   &=\frac12\int u e^{-u}\,du\\
   &=-\frac12(x^2+1)e^{-x^2}+C.
   \end{aligned}
$$

5. 几何上这是单位圆面积的半部分；
   由三角换元 $x=\sin t$，

$$
   \begin{aligned}
   \int\sqrt{1-x^2}\,dx
   &=\frac12(x\sqrt{1-x^2}+\arcsin x)+C.
   \end{aligned}
$$

6.

   $$
    \begin{aligned}
    \int\sin^3x\,dx
    &=\int(1-\cos^2x)\sin x\,dx\\
    &=-\cos x+\frac{\cos^3x}{3}+C.
    \end{aligned}
   $$

7. 取 $u=\sec x,dv=\sec^2x\,dx$ 分部积分，得

$$
    \int\sec^3x\,dx
    =\frac12\left(\sec x\tan x+\ln|\sec x+\tan x|\right)+C.
$$

8.

   $$
    \begin{aligned}
    \int_0^1\arctan x\,dx
    &=\left.x\arctan x\right|_0^1
    -\int_0^1\frac{x}{1+x^2}\,dx\\
    &=\frac\pi4-\frac12\ln2.
    \end{aligned}
   $$

9.

   $$
    \int_0^\pi x\sin x\,dx
    =\left.(-x\cos x+\sin x)\right|_0^\pi
    =\pi.
   $$

10. 令 $u=e^x$：

$$
    \int_0^{\ln2}\frac{e^x}{1+e^{2x}}\,dx
    =\left.\arctan(e^x)\right|_0^{\ln2}
    =\arctan2-\frac\pi4.
$$

11. 交点为 $x=-1,0,1$。总面积

$$
    \begin{aligned}
    A
    &=\int_{-1}^0(x^3-x)\,dx
    +\int_0^1(x-x^3)\,dx\\
    &=\frac14+\frac14=\frac12.
    \end{aligned}
$$

12.

    $$
    V=\pi\int_0^2x^2\,dx=\frac{8\pi}{3}.
    $$

13.

    $$
    V=\pi\int_1^{+\infty}x^{-2}\,dx=\pi.
    $$

14.

    $$
    \bar f=\frac1{e-1}\int_1^e\ln x\,dx
    =\frac1{e-1}.
    $$

15. 均衡数量：

$$
    8=20-2q_0,
    \qquad q_0=6.
$$

    消费者剩余：

$$
    \begin{aligned}
    CS
    &=\int_0^6[(20-2q)-8]\,dq\\
    &=\int_0^6(12-2q)\,dq
    =72-36=36.
    \end{aligned}
$$

16. 平均值为

$$
    \frac13\int_0^3x^2\,dx=3.
$$

    令 $\xi^2=3$，得 $\xi=\sqrt3\in[0,3]$。

17. 由

$$
    (uv)'=u'v+uv'
$$

    得

$$
    uv'=(uv)'-u'v.
$$

    在 $[a,b]$ 上积分：

$$
    \int_a^b u(x)v'(x)\,dx
    =\left.u(x)v(x)\right|_a^b
    -\int_a^b v(x)u'(x)\,dx.
$$

18. 将 $[a,b]$ 分割成小区间。在 $[x_{i-1},x_i]$ 上取 $\xi_i$，以高度

$$
    f(\xi_i)-g(\xi_i)
$$

    的矩形近似该窄条面积，则

$$
    A\approx\sum_{i=1}^n
    [f(\xi_i)-g(\xi_i)]\Delta x_i.
$$

    令最大区间长度趋于零，得到

$$
    A=\int_a^b[f(x)-g(x)]\,dx.
$$

19. 当 $p\ne1$ 时，

$$
    \int_\varepsilon^1x^{-p}\,dx
    =\frac{1-\varepsilon^{1-p}}{1-p}.
$$

    若 $p<1$，则 $1-p>0$，$\varepsilon^{1-p}\to0$，极限存在；若 $p>1$，则 $1-p<0$，$\varepsilon^{1-p}\to+\infty$，积分发散。

    当 $p=1$ 时，

$$
    \int_\varepsilon^1\frac{dx}{x}
    =-\ln\varepsilon\to+\infty.
$$

    因此当且仅当 $p<1$ 时收敛。

20. 定义

$$
    F(a)=\int_a^{a+T}f(x)\,dx.
$$

    由微积分基本定理，

$$
    F'(a)=f(a+T)-f(a).
$$

    因 $f$ 的周期为 $T$，$f(a+T)=f(a)$，故 $F'(a)\equiv0$。所以 $F$ 为常数。

    取 $a=0$，得 $F(a)=F(0)$，即

$$
    \int_a^{a+T}f(x)\,dx
    =\int_0^Tf(x)\,dx.
$$

---

# 测试集：试卷 6—7

## 试卷 6：综合测试一

### 一、计算题

1. 求 $\displaystyle\int\frac{x^3-1}{x-1}\,dx$。
2. 求 $\displaystyle\int xe^{2x}\,dx$。
3. 求 $\displaystyle\int\frac{dx}{1+\sqrt x}$。
4. 求 $\displaystyle\int x\sqrt{1+x^2}\,dx$。
5. 求 $\displaystyle\int_0^1x^2e^x\,dx$。
6. 求 $\displaystyle\int_0^{\pi/4}\tan x\,dx$。
7. 求 $\displaystyle\frac d{dx}\int_{x^2}^{x^3}\cos t\,dt$。
8. 计算 $\displaystyle\int_0^{+\infty}xe^{-x^2}\,dx$。
9. 计算 $\displaystyle\int_1^{+\infty}\frac{x+1}{x^3+1}\,dx$。
10. 求 $y=\ln x$ 与 $x$ 轴、$x=1$、$x=e$ 围成的面积。
11. 求 $y=\sin x$ 在 $[0,\pi]$ 上与 $x$ 轴围成的区域绕 $x$ 轴旋转所得体积。
12. 求 $x^2$ 在 $[0,2]$ 上的平均值。
13. 需求函数 $p=50-3q$，均衡价格 $p_0=20$。求消费者剩余。
14. 求 $\displaystyle\int_1^4|x-2|\,dx$。
15. 已知 $f$ 为偶函数，且 $\displaystyle\int_0^2f(x)\,dx=5$。求

$$
    \int_0^2[2f(x)+3]\,dx
$$

    以及 $\displaystyle\int_{-2}^2f(x)\,dx$。
16. 设

$$
    G(x)=\int_0^x(t-1)e^t\,dt.
$$

    求 $G$ 的驻点，并判断它是否为局部极值点。

### 二、证明题

17. 证明微积分基本定理：若 $f$ 在 $[a,b]$ 上连续，则

$$
    \frac d{dx}\int_a^x f(t)\,dt=f(x).
$$

18. 证明定积分换元公式。
19. 证明定积分中值定理。
20. 设 $f$ 连续。证明

$$
    \int_0^\pi x f(\sin x)\,dx
    =\frac\pi2\int_0^\pi f(\sin x)\,dx.
$$

### 试卷 6 答案解析

1. 当 $x\ne1$ 时，

$$
   \frac{x^3-1}{x-1}=x^2+x+1.
$$

   所以

$$
   \int\frac{x^3-1}{x-1}\,dx
   =\frac{x^3}{3}+\frac{x^2}{2}+x+C.
$$

2.

   $$
   \int xe^{2x}\,dx
   =e^{2x}\left(\frac x2-\frac14\right)+C.
   $$

3. 令 $t=\sqrt x$，则 $x=t^2,dx=2t\,dt$：

$$
   \begin{aligned}
   \int\frac{dx}{1+\sqrt x}
   &=\int\frac{2t}{1+t}\,dt\\
   &=2t-2\ln(1+t)+C\\
   &=2\sqrt x-2\ln(1+\sqrt x)+C.
   \end{aligned}
$$

4.

   $$
   \int x\sqrt{1+x^2}\,dx
   =\frac13(1+x^2)^{3/2}+C.
   $$

5.

   $$
   \int_0^1x^2e^x\,dx
   =\left.(x^2-2x+2)e^x\right|_0^1
   =e-2.
   $$

6.

   $$
   \int_0^{\pi/4}\tan x\,dx
   =\left.-\ln|\cos x|\right|_0^{\pi/4}
   =\frac12\ln2.
   $$

7.

   $$
   \frac d{dx}\int_{x^2}^{x^3}\cos t\,dt
   =3x^2\cos x^3-2x\cos x^2.
   $$

8. 令 $u=x^2$：

$$
   \int_0^{+\infty}xe^{-x^2}\,dx
   =\frac12\int_0^{+\infty}e^{-u}\,du
   =\frac12.
$$

9. 因

$$
   x^3+1=(x+1)(x^2-x+1),
$$

   原积分为

$$
   \int_1^{+\infty}\frac{dx}{x^2-x+1}.
$$

   又

$$
   x^2-x+1=\left(x-\frac12\right)^2+\frac34.
$$

   所以

$$
   \begin{aligned}
   \int_1^{+\infty}\frac{dx}{x^2-x+1}
   &=\left.\frac2{\sqrt3}
   \arctan\frac{2x-1}{\sqrt3}\right|_1^{+\infty}\\
   &=\frac2{\sqrt3}
   \left(\frac\pi2-\frac\pi6\right)\\
   &=\frac{2\pi}{3\sqrt3}.
   \end{aligned}
$$

10.

    $$
    A=\int_1^e\ln x\,dx=1.
    $$

11.

    $$
    V=\pi\int_0^\pi\sin^2x\,dx
    =\pi\cdot\frac\pi2
    =\frac{\pi^2}{2}.
    $$

12.

    $$
    \bar f=\frac12\int_0^2x^2\,dx
    =\frac43.
    $$

13. 均衡数量：

$$
    20=50-3q_0,
    \qquad q_0=10.
$$

    消费者剩余：

$$
    \begin{aligned}
    CS
    &=\int_0^{10}(50-3q-20)\,dq\\
    &=\int_0^{10}(30-3q)\,dq\\
    &=300-150=150.
    \end{aligned}
$$

14.

    $$
    \begin{aligned}
    \int_1^4|x-2|\,dx
    &=\int_1^2(2-x)\,dx+\int_2^4(x-2)\,dx\\
    &=\frac12+2=\frac52.
    \end{aligned}
    $$

15.

    $$
    \int_0^2[2f(x)+3]\,dx
    =2\cdot5+3\cdot2=16.
    $$

    偶函数在对称区间上的积分为

$$
    \int_{-2}^2f(x)\,dx
    =2\int_0^2f(x)\,dx=10.
$$

16.

    $$
    G'(x)=(x-1)e^x.
    $$

    唯一驻点为 $x=1$。又

$$
    G''(x)=xe^x,
    \qquad G''(1)=e>0.
$$

    因此 $x=1$ 是局部极小值点。

17. 对 $h$ 作差：

$$
    \Phi(x+h)-\Phi(x)
    =\int_x^{x+h}f(t)\,dt.
$$

    由积分中值定理，存在 $\xi_h$ 位于 $x,x+h$ 之间，使

$$
    \frac{\Phi(x+h)-\Phi(x)}h=f(\xi_h).
$$

    因 $f$ 连续且 $\xi_h\to x$，取极限得

$$
    \Phi'(x)=f(x).
$$

18. 令 $u=\varphi(x)$，则 $du=\varphi'(x)dx$。右端的上下限变为 $\varphi(a),\varphi(b)$，所以

$$
    \int_a^bf(\varphi(x))\varphi'(x)\,dx
    =\int_{\varphi(a)}^{\varphi(b)}f(u)\,du.
$$

    反之，若 $x=\varphi(t)$，则由链式法则与牛顿—莱布尼茨公式得到同一结论。

19. 设 $m,M$ 为 $f$ 在 $[a,b]$ 上的最小值与最大值。由于

$$
    m(b-a)\le\int_a^bf(x)\,dx\le M(b-a),
$$

    平均值

$$
    \mu=\frac1{b-a}\int_a^bf(x)\,dx
$$

    满足 $m\le\mu\le M$。由连续性及介值定理，存在 $\xi$，使 $f(\xi)=\mu$。

20. 令

$$
    I=\int_0^\pi x f(\sin x)\,dx.
$$

    作代换 $x=\pi-t$：

$$
    \begin{aligned}
    I
    &=\int_\pi^0(\pi-t)f(\sin t)(-dt)\\
    &=\int_0^\pi(\pi-t)f(\sin t)\,dt\\
    &=\pi\int_0^\pi f(\sin t)\,dt-I.
    \end{aligned}
$$

    移项得

$$
    2I=\pi\int_0^\pi f(\sin x)\,dx,
$$

    即

$$
    I=\frac\pi2\int_0^\pi f(\sin x)\,dx.
$$

---

## 试卷 7：综合测试二

### 一、计算题

1. 求 $\displaystyle\int x\cos(x^2)\,dx$。
2. 求 $\displaystyle\int\frac{e^x}{e^x+1}\,dx$。
3. 求 $\displaystyle\int x\arctan x\,dx$。
4. 求 $\displaystyle\int_0^1xe^{-x}\,dx$。
5. 求 $\displaystyle\int_0^{\pi/2}\sin^2x\,dx$。
6. 判断 $\displaystyle\int_1^2\frac{dx}{x\ln x}$ 的敛散性。
7. 计算 $\displaystyle\int_{-\infty}^{+\infty}\frac{dx}{1+x^2}$。
8. 计算 $\displaystyle\int_0^1\frac{dx}{\sqrt{1-x^2}}$。
9. 计算 $\displaystyle\int_1^{+\infty}\frac{dx}{x^3}$。
10. 求曲线 $y=x^2$ 与 $y=2-x^2$ 围成的面积。
11. 求 $y=\sqrt x$ 与 $y=x$ 在 $[0,1]$ 上围成的区域绕 $x$ 轴旋转所得体积。
12. 求 $\sin x$ 在 $[0,\pi]$ 上的平均值。
13. 设

$$
    H(x)=\int_0^xe^{-t^2}\,dt.
$$

    求使 $H'(x)$ 取得最大值的点。
14. 边际收益为

$$
    MR(q)=20-4q.
$$

    求产量从 $0$ 增加到 $5$ 时的总收益。
15. 计算 $\displaystyle\int_{-1}^1(x^5+x+2)\,dx$。
16. 计算 $\displaystyle\int_0^{+\infty}\frac{e^{-\sqrt x}}{\sqrt x}\,dx$。

### 二、证明题

17. 证明定积分分部积分公式

$$
    \int_a^bu(x)v'(x)\,dx
    =\left.u(x)v(x)\right|_a^b
    -\int_a^bv(x)u'(x)\,dx.
$$

18. 证明反常积分的比较判别法：若 $0\le f(x)\le g(x)$，且 $\int_a^\infty f$ 发散，则 $\int_a^\infty g$ 发散。
19. 证明

$$
    \int_1^{+\infty}\frac{dx}{x^p}
$$

    当 $p>1$ 时收敛。
20. 证明对任意非负整数 $n$，

$$
    \int_0^{\pi/2}\sin^n x\,dx
    =\int_0^{\pi/2}\cos^n x\,dx.
$$

### 试卷 7 答案解析

1.

   $$
   \int x\cos(x^2)\,dx
   =\frac12\sin(x^2)+C.
   $$

2.

   $$
   \int\frac{e^x}{e^x+1}\,dx
   =\ln(e^x+1)+C.
   $$

3.

   $$
   \begin{aligned}
   \int x\arctan x\,dx
   &=\frac{x^2}{2}\arctan x
   -\frac12\int\frac{x^2}{1+x^2}\,dx\\
   &=\frac{x^2}{2}\arctan x
   -\frac12(x-\arctan x)+C\\
   &=\frac12\left[(x^2+1)\arctan x-x\right]+C.
   \end{aligned}
   $$

4.

   $$
   \begin{aligned}
   \int_0^1xe^{-x}\,dx
   &=\left.-(x+1)e^{-x}\right|_0^1\\
   &=1-\frac2e.
   \end{aligned}
   $$

5.

   $$
   \int_0^{\pi/2}\sin^2x\,dx
   =\int_0^{\pi/2}\frac{1-\cos2x}{2}\,dx
   =\frac\pi4.
   $$

6. 令 $u=\ln x$，则

$$
   \int_1^2\frac{dx}{x\ln x}
   =\int_0^{\ln2}\frac{du}{u},
$$

   该积分在 $u=0$ 处有瑕点，因而发散。

7.

   $$
   \int_{-\infty}^{+\infty}\frac{dx}{1+x^2}
   =\left.\arctan x\right|_{-\infty}^{+\infty}
   =\pi.
   $$

8.

   $$
   \int_0^1\frac{dx}{\sqrt{1-x^2}}
   =\left.\arcsin x\right|_0^1
   =\frac\pi2.
   $$

9.

   $$
   \int_1^{+\infty}x^{-3}\,dx
   =\frac12.
   $$

10. 交点为 $x=\pm1$。面积

$$
    \begin{aligned}
    A
    &=\int_{-1}^1[(2-x^2)-x^2]\,dx\\
    &=\int_{-1}^1(2-2x^2)\,dx
    =4-\frac43=\frac83.
    \end{aligned}
$$

11.

    $$
    V=\pi\int_0^1\left[(\sqrt x)^2-x^2\right]\,dx
    =\pi\int_0^1(x-x^2)\,dx
    =\frac\pi6.
    $$

12.

    $$
    \bar f=\frac1\pi\int_0^\pi\sin x\,dx
    =\frac2\pi.
    $$

13.

    $$
    H'(x)=e^{-x^2},
    \quad\;    H''(x)=-2xe^{-x^2}.
    $$

    当 $x<0$ 时 $H''>0$，当 $x>0$ 时 $H''<0$，所以 $H'$ 在 $x=0$ 取得最大值。

14.

    $$
    R(5)-R(0)
    =\int_0^5(20-4q)\,dq
    =100-50=50.
    $$

15. $x^5+x$ 是奇函数，在对称区间上积分为零，所以

$$
    \int_{-1}^1(x^5+x+2)\,dx
    =\int_{-1}^12\,dx=4.
$$

16. 令 $t=\sqrt x$，则 $dx=2t\,dt$：

$$
    \int_0^{+\infty}\frac{e^{-\sqrt x}}{\sqrt x}\,dx
    =2\int_0^{+\infty}e^{-t}\,dt
    =2.
$$

17. 由乘积求导公式

$$
    (uv)'=u'v+uv'.
$$

    在 $[a,b]$ 上积分：

$$
    \left.u(x)v(x)\right|_a^b
    =\int_a^bu'(x)v(x)\,dx
    +\int_a^bu(x)v'(x)\,dx.
$$

    移项即得

$$
    \int_a^bu(x)v'(x)\,dx
    =\left.u(x)v(x)\right|_a^b
    -\int_a^bv(x)u'(x)\,dx.
$$

18. 假设 $\int_a^\infty g$ 收敛。由 $0\le f\le g$，可知 $\int_a^\infty f$ 也收敛，与 $\int_a^\infty f$ 发散矛盾。因此 $\int_a^\infty g$ 必发散。

19. 当 $p>1$ 时，

$$
    \int_1^Rx^{-p}\,dx
    =\frac{R^{1-p}-1}{1-p}.
$$

    因 $1-p<0$，有 $R^{1-p}\to0$。所以

$$
    \int_1^{+\infty}x^{-p}\,dx
    =\frac1{p-1},
$$

    反常积分收敛。

20. 令 $x=\pi/2-t$：

$$
    \begin{aligned}
    \int_0^{\pi/2}\sin^n x\,dx
    &=\int_{\pi/2}^0
    \sin^n\left(\frac\pi2-t\right)(-dt)\\
    &=\int_0^{\pi/2}\cos^n t\,dt.
    \end{aligned}
$$

    交换积分变量名称，即得到所需等式。

---

## 复盘与评分建议

每套 100 分，计算题与证明题每题 5 分。

| 得分 | 建议 |
|---|---|
| 90—100 | 综合掌握较稳，重点复核换元上下限和反常积分收敛条件 |
| 75—89 | 针对错题重练换元、分部积分或面积体积应用 |
| 60—74 | 先完成试卷 1—3，熟记基本积分表和牛顿—莱布尼茨公式 |
| 60 以下 | 回到原函数、基本积分公式和定积分定义逐项补基础 |

常见失分点：

1. 不定积分漏写常数 $C$；
2. 定积分换元后没有更新上下限；
3. 被积函数含绝对值或分段表达式时没有拆分区间；
4. 反常积分没有先写成极限；
5. 面积题没有比较上下曲线或遗漏交点；
6. 旋转体体积漏乘 $\pi$；
7. 消费者剩余漏减均衡价格。

建议将错题按“基本公式、换元与分部、定积分性质、反常积分、应用”五类整理，每类至少保留一道完整规范解答。
