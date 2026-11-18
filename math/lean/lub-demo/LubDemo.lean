module

-- `module`：启用 Lean 4 的模块系统。Mathlib 使用了模块系统，建议每个文件都这样开头。
import Mathlib

-- `import Mathlib`：导入整个 Mathlib 数学库。
-- 最小上界相关定义主要在 `Mathlib.Order.Bounds.Defs` 和
-- `Mathlib.Order.ConditionallyCompleteLattice.Basic` 中。

/-!
# 最小上界（上确界）最小示例

这个文件对照 `analysis/note.md` 里的定义，给出 Lean/Mathlib 中的写法。

阅读约定：

* 每一行代码上方或右侧都有注释，解释这一行在做什么；
* Mathlib 名字一律写全限定形式，例如 `Set.Ioo`、`Set.range`、`IsLUB`；
* 缩写名字在第一次出现时注释其英文全称和中文含义。

概念速查：

* `IsLUB S a`：`a` 是集合 `S` 的最小上界（Least Upper Bound）；
* `sSup S`：`S` 的上确界（Supremum），也就是最小上界；
* `isLUB_csSup`：实数的最小上界性（完备性）；
* `Set.Ioo a b`：开区间 `(a, b)`；
* `Set.range f`：函数 `f` 的值域。
-/

namespace LubDemo

-- `namespace LubDemo`：把下面的定义放进名为 `LubDemo` 的命名空间，
-- 避免和 Mathlib 或其他文件里的同名定义冲突。文件末尾有 `end LubDemo`。

/-- 最小上界性的直接表述：
每个非空、有上界的实数集都有上确界，而且这个上确界确实是它的最小上界。

参数说明：

* `S : Set ℝ`：`S` 是一个实数集合；
* `hne : Set.Nonempty S`：`S` 非空；
* `hbd : BddAbove S`：`S` 有上界（Bounded above）。

结论 `IsLUB S (sSup S)`：`sSup S` 是 `S` 的最小上界。
-/
example (S : Set ℝ) (hne : Set.Nonempty S) (hbd : BddAbove S) :
    IsLUB S (sSup S) :=
  -- `isLUB_csSup` 的类型是：
  --   Set.Nonempty S → BddAbove S → IsLUB S (sSup S)
  -- 这里依次把 hne 和 hbd 传给它。
  isLUB_csSup hne hbd

/-- 开区间 `(0, 1)` 的上确界是 `1`，但 `1` 不属于该集合，
因此这个集合没有最大值。

`Set.Ioo (0 : ℝ) 1` 读作“实数轴上从 0 到 1 的开区间”，
其中 `Ioo` 是 “interval open-open” 的缩写。
-/
theorem isLUB_Ioo_zero_one : IsLUB (Set.Ioo (0 : ℝ) 1) 1 := by
  -- `by`：进入 tactic（证明策略）模式。
  --
  -- `IsLUB S a` 的定义是 `IsLeast (upperBounds S)`，展开后等价于：
  --   1. `a ∈ upperBounds S`（`a` 是上界）；
  --   2. `a ∈ lowerBounds (upperBounds S)`（`a` 比所有上界都小）。
  --
  -- `constructor`：把“并且”形式的目标拆成两个子目标。
  constructor

  · -- 第一个子目标：1 ∈ upperBounds (Set.Ioo 0 1)，即 1 是上界。
    -- `mem_upperBounds` 是 “membership in upperBounds” 的缩写，定理内容是：
    --   a ∈ upperBounds S ↔ ∀ x ∈ S, x ≤ a
    -- `rw [mem_upperBounds]`：用这条等价关系重写目标。
    rw [mem_upperBounds]

    -- `intro x hx`：引入任意元素 x 和假设 hx : x ∈ Set.Ioo 0 1。
    intro x hx

    -- `Set.Ioo a b` 的定义是 {x | a < x ∧ x < b}，
    -- 所以 hx.1 : 0 < x，hx.2 : x < 1。
    -- `le_of_lt`：把严格不等式 x < 1 转成非严格不等式 x ≤ 1。
    exact le_of_lt hx.2

  · -- 第二个子目标：1 ∈ lowerBounds (upperBounds (Set.Ioo 0 1))，
    -- 即 1 比 (0,1) 的所有上界都小。
    -- `mem_lowerBounds` 是 “membership in lowerBounds” 的缩写：
    --   a ∈ lowerBounds S ↔ ∀ x ∈ S, a ≤ x
    rw [mem_lowerBounds]

    -- 引入任意上界 y，hy : y ∈ upperBounds (Set.Ioo 0 1)。
    intro y hy

    -- 把 hy 从上界集合的成员展开成全称命题：
    --   hy : ∀ x ∈ Set.Ioo 0 1, x ≤ y
    rw [mem_upperBounds] at hy

    -- `by_contra h`：反证法。要证 1 ≤ y，先假设 h : ¬ 1 ≤ y。
    by_contra h

    -- `push Not at h`：把否定推进不等式内部，
    -- 把 h : ¬ 1 ≤ y 化简成 h : y < 1。
    push Not at h

    -- `have 名字 : 类型 := 证明`：引入一个中间结论。
    -- 因为 1/2 ∈ Set.Ioo 0 1，用上界性质 hy 得到 1/2 ≤ y。
    -- `by norm_num`：用数值计算证明 1/2 ∈ Set.Ioo 0 1。
    have hy12 : (1 / 2 : ℝ) ≤ y := hy (1 / 2) (by norm_num)

    -- 令 x = (y + 1) / 2。下面证明 x 落在 (0, 1) 中。
    -- `by linarith`：线性算术策略，自动利用上下文中的不等式。
    have hx0 : 0 < (y + 1) / 2 := by linarith
    have hx1 : (y + 1) / 2 < 1 := by linarith

    -- `⟨hx0, hx1⟩`：构造“并且”类型的证明，
    -- 即证明 (y+1)/2 ∈ Set.Ioo 0 1。
    -- 再由上界性质 hy 得到 (y+1)/2 ≤ y。
    have hxle : (y + 1) / 2 ≤ y := hy ((y + 1) / 2) ⟨hx0, hx1⟩

    -- hxle 说 (y+1)/2 ≤ y，而由 h : y < 1 可得 y < (y+1)/2，
    -- 两者矛盾；`linarith` 自动发现这个矛盾并结束证明。
    linarith

/-- 数列 `1 - 1/(n+1)` 的上确界是 `1`，但 `1` 不是任何一项。

`Set.range f` 是函数 f 的值域，即 {f n | n}。
这里 f n = 1 - 1/(n+1)。
-/
example : IsLUB (Set.range fun n : ℕ => 1 - 1 / (n + 1 : ℝ)) 1 := by
  -- 同样把 IsLUB 拆成“是上界”和“是最小上界”两部分。
  constructor

  · -- 第一部分：1 是值域的上界。
    rw [mem_upperBounds]

    -- `rintro x ⟨n, rfl⟩` 是 intro + rcases 的组合写法：
    --   先引入 x（x 在值域中），
    --   再把“x 在值域中”拆成存在某个 n 使 f n = x；
    --   `rfl` 表示直接用这个等式把 x 替换成 f n。
    -- 于是目标变成：1 - 1/(n+1) ≤ 1。
    rintro x ⟨n, rfl⟩

    -- `positivity`：证明表达式为正，例如 (n : ℝ) + 1 > 0。
    have hpos : (0 : ℝ) < (n : ℝ) + 1 := by positivity

    -- 正数除以正数仍为正：1 / ((n:ℝ)+1) > 0。
    have hdiv : 0 < 1 / ((n : ℝ) + 1) := by positivity

    -- 由 hdiv 可知 1 - 1/(n+1) < 1，linarith 完成。
    linarith

  · -- 第二部分：1 是最小上界，即任何上界 y 都满足 1 ≤ y。
    rw [mem_lowerBounds]

    -- 引入任意上界 y。
    intro y hy

    -- 展开上界定义：hy : ∀ x ∈ Set.range f, x ≤ y。
    rw [mem_upperBounds] at hy

    -- 反证：假设 ¬ 1 ≤ y。
    by_contra h

    -- 化简为 h : y < 1。
    push Not at h

    -- 因为 y < 1，所以 1 - y > 0。
    have hε : 0 < 1 - y := by linarith

    -- `exists_nat_gt x` 是阿基米德性质：
    --   对任意实数 x，存在自然数 n 使 x < n。
    -- `obtain ⟨n, hn⟩`：拆开存在量词，得到 n 和 hn : 1/(1-y) < n。
    obtain ⟨n, hn⟩ := exists_nat_gt (1 / (1 - y))

    -- 因为 n ≤ n+1，所以 1/(1-y) < n+1。
    have hn' : 1 / (1 - y) < (n : ℝ) + 1 := by
      have hle : (n : ℝ) ≤ (n : ℝ) + 1 := by linarith
      linarith

    -- 目标：1/(n+1) < 1-y。
    have hdiv : 1 / ((n : ℝ) + 1) < 1 - y := by
      -- 分母 (n:ℝ)+1 为正。
      have h1 : (0 : ℝ) < (n : ℝ) + 1 := by positivity

      -- `div_lt_iff₀ h1` 是 “division less-than iff” 的缩写：
      --   a / c < b ↔ a < b * c，要求 c > 0（下标 ₀ 表示正分母版本）。
      -- 用它把目标变成 1 < (1-y) * ((n:ℝ)+1)。
      rw [div_lt_iff₀ h1]

      -- 对 hn' 使用同一个引理（分母 1-y > 0），得到
      --   1 < ((n:ℝ)+1) * (1-y)。
      -- `.mp`：取“当且仅当”命题的从左到右方向。
      have h2 := (div_lt_iff₀ hε).mp hn'

      -- `simpa [mul_comm] using h2`：
      --   用乘法交换律 mul_comm 整理 h2，然后把它作为当前目标的证明。
      simpa [mul_comm] using h2

    -- 取第 n 项 x = 1 - 1/(n+1)，它显然在值域中。
    -- `⟨n, rfl⟩` 给出存在性证明：存在 n，使得 f n = x。
    have hxmem : 1 - 1 / ((n : ℝ) + 1) ∈
        Set.range fun n : ℕ => 1 - 1 / (n + 1 : ℝ) :=
      ⟨n, rfl⟩

    -- hy 是全称命题，取 x 为上一步构造的项，得到 x ≤ y。
    have hxle : 1 - 1 / ((n : ℝ) + 1) ≤ y := hy _ hxmem

    -- 但 hdiv 说 y < 1 - 1/(n+1)，与 hxle 矛盾，linarith 结束。
    linarith

/-- 由 `IsLUB` 得到 `sSup` 的等式形式。

`IsLUB.csSup_eq` 的类型是：
  IsLUB S a → Set.Nonempty S → sSup S = a
即：如果 a 是 S 的最小上界，且 S 非空，那么 S 的上确界就是 a。
-/
example : sSup (Set.Ioo (0 : ℝ) 1) = 1 :=
  -- 第一个参数是上面证明的定理 isLUB_Ioo_zero_one；
  -- 第二个参数是“Set.Ioo 0 1 非空”的证明：
  --   `⟨1 / 2, by norm_num⟩` 表示存在元素 1/2，且 1/2 ∈ Set.Ioo 0 1。
  IsLUB.csSup_eq isLUB_Ioo_zero_one ⟨1 / 2, by norm_num⟩

/-!
## Mathlib 名字全称速查

定义与定理：

* `Set.Ioo` = “interval open-open”，开区间 (a, b)；
* `Set.range` = 函数的值域；
* `Set.Nonempty` = 集合非空，即 ∃ x, x ∈ S；
* `BddAbove` = “bounded above”，有上界；
* `upperBounds` = 上界组成的集合；
* `lowerBounds` = 下界组成的集合；
* `IsLUB` = “least upper bound”，最小上界；
* `sSup` = “supremum”，上确界；
* `mem_upperBounds` = “membership in upperBounds”，
  a ∈ upperBounds S ↔ ∀ x ∈ S, x ≤ a；
* `mem_lowerBounds` = “membership in lowerBounds”，
  a ∈ lowerBounds S ↔ ∀ x ∈ S, a ≤ x；
* `isLUB_csSup` = “IsLUB of sSup”，最小上界性/完备性；
* `IsLUB.csSup_eq` = 由 IsLUB 推出 sSup 的等式；
* `exists_nat_gt` = “exists natural greater than”，阿基米德性质；
* `div_lt_iff₀` = “division less-than iff”，正分母下的除法不等式。

证明策略（tactic）：

* `by`：进入 tactic 模式；
* `constructor`：拆分“并且”目标；
* `intro`：引入变量或假设；
* `rintro`：intro + rcases，可顺便拆存在量词；
* `rw [定理]`：rewrite，用等式/等价关系重写目标；
* `rw [定理] at h`：在假设 h 中重写；
* `exact`：给出正好匹配目标的证明；
* `have`：引入中间结论；
* `by_contra`：反证法；
* `push Not`：把否定推进到表达式内部；
* `linarith`：线性算术；
* `norm_num`：数值计算；
* `positivity`：证明表达式为正；
* `simpa`：simp + assumption，化简后使用已有结论；
* `obtain`：拆开存在量词或“并且”；
* `.mp` / `.mpr`：取“当且仅当”命题的两个方向。
-/

/-!
有理数不满足最小上界性。经典反例是

  S = {q : ℚ | q ^ 2 < 2},

它在 ℚ 中有上界（例如 2），但没有最小的有理上界：这个“缺口”
正是 ℝ 中的 √2。Mathlib 中的对应事实是 `irrational_sqrt_two`。

练习：把下面的命题补成完整证明。

example : ¬ ∃ a : ℚ, IsLUB {q : ℚ | q ^ 2 < 2} a := by
  sorry

提示：
1. 先证任何有理上界 a 必须满足 a ^ 2 = 2；
2. 再用 `irrational_sqrt_two`（或直接数论论证）导出矛盾。
-/

end LubDemo
