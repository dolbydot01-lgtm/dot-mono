module

import Mathlib

/-!
# 实数集的阿基米德性质（乘积形式，反证法 + 最小上界性）

目标：

> 对任意正实数 ε > 0 和任意实数 B，
> 存在自然数 n，使得 ε * n > B。

也就是说：给定任意正实数 ε，乘积 ε * n 可以随着 n 变得任意大。
等价说法：集合 {ε * n | n ∈ ℕ} 在 ℝ 中无上界。

证明只用两条性质：

1. 最小上界性（完备性）：非空有上界的实数集有最小上界；
2. 自然数对加法封闭：若 n 是自然数，则 n + 1 也是自然数。

整个证明采用**反证法**：假设存在某个界 B 使所有 ε * n 都不超过它，
推出与最小上界性矛盾。
-/

namespace ArchimedeanProperty

/-- 阿基米德性质的乘积形式：

对任意正实数 `ε` 和任意实数 `B`，存在自然数 `n`，
使得 `ε * n > B`。

证明思路：

1. 反证法，假设存在 `B`，使得所有自然数 `n` 都满足 `ε * n ≤ B`；
2. 于是集合 `S = {ε * n | n ∈ ℕ}` 非空且有上界 `B`；
3. 由最小上界性，令 `a = sSup S`，则 `a` 是 `S` 的最小上界；
4. 因为 `ε > 0`，所以 `a - ε < a`；而 `a` 是最小上界，
   所以 `a - ε` 不是上界；
5. 因此存在自然数 `n` 使 `a - ε < ε * n`；
6. 两边加上 ε，得 `a < ε * (n + 1)`；
7. 但 `ε * (n + 1)` 也属于 `S`，而 `a` 是 `S` 的上界，
   所以 `ε * (n + 1) ≤ a`，矛盾。
-/
theorem real_archimedean_mul (ε : ℝ) (hε : 0 < ε) (B : ℝ) :
    ∃ n : ℕ, B < ε * (n : ℝ) := by
  -- 反证法：`by_contra h` 假设结论不成立，
  -- 此时 h : ¬ ∃ n : ℕ, B < ε * (n : ℝ)。
  by_contra h

  -- `push Not at h`：把否定推进存在量词和不等式中。
  -- `Not` 是逻辑否定；这一步把 h 化简成
  --   h : ∀ n : ℕ, ε * (n : ℝ) ≤ B。
  push Not at h


  -- 构造集合 S = {ε * n | n ∈ ℕ}。
  -- `Set.range f` 是函数 f 的值域，即 {f n | n}；
  -- 这里 f n = ε * (n : ℝ)。
  let S : Set ℝ := Set.range fun n : ℕ => ε * (n : ℝ)

  -- 证明 S 非空。
  -- `Set.Nonempty S` 的定义是 ∃ y : ℝ, y ∈ S。
  have hS_nonempty : Set.Nonempty S := by
    -- 取 y = 0（实数）。
    refine ⟨(0 : ℝ), ?_⟩
    -- `Set.range` 的成员定义：
    --   y ∈ Set.range f ↔ ∃ n, f n = y。
    -- 取 n = 0，需要 ε * (0 : ℝ) = 0，由 simp 化简。
    exact ⟨0, by simp⟩

  -- 证明 S 有上界 B。
  -- `BddAbove S` 的定义是 (upperBounds S).Nonempty，
  -- 即“上界集合非空”。
  have hS_bdd : BddAbove S := by
    -- 取上界为 B。
    refine ⟨B, ?_⟩
    -- `mem_upperBounds` 是 “membership in upperBounds” 的缩写：
    --   B ∈ upperBounds S ↔ ∀ y ∈ S, y ≤ B。
    rw [mem_upperBounds]
    -- 引入任意 y ∈ S。
    intro y hy
    -- 拆开 hy : y ∈ Set.range (fun n : ℕ => ε * (n : ℝ))，
    -- 得到某个自然数 n 使 y = ε * (n : ℝ)；rfl 用这个等式替换 y。
    obtain ⟨n, rfl⟩ := hy
    -- 由反证假设 h，所有自然数都满足 ε * (n : ℝ) ≤ B。
    exact h n

  -- 由最小上界性（完备性），S 的上确界是 S 的最小上界。
  -- `sSup S` = supremum of S，即 S 的上确界。
  let a : ℝ := sSup S
  -- `isLUB_csSup` = “IsLUB of sSup”：
  --   Set.Nonempty S → BddAbove S → IsLUB S (sSup S)。
  -- `IsLUB S a` = “a is a least upper bound of S”。
  have ha : IsLUB S a := isLUB_csSup hS_nonempty hS_bdd

  -- 关键一步：a - ε 不是 S 的上界。
  have hnot_ub : a - ε ∉ upperBounds S := by
    -- 反证：假设 a - ε 是上界。
    intro hmem
    -- 因为 a 是最小上界，它 ≤ 任何上界；
    -- `ha.2` 是 “a 属于下界集合 lowerBounds (upperBounds S)”。
    have hle : a ≤ a - ε := ha.2 hmem
    -- a ≤ a - ε 与 ε > 0 矛盾。
    linarith

  -- 把“a - ε 不是上界”展开：
  -- `mem_upperBounds` 重写后，hnot_ub 变成
  --   ¬ ∀ y ∈ S, y ≤ a - ε。
  rw [mem_upperBounds] at hnot_ub
  -- `push Not` 再把它化成存在形式：
  --   ∃ y, y ∈ S ∧ a - ε < y。
  push Not at hnot_ub
  obtain ⟨y, hyS, hylt⟩ := hnot_ub

  -- 拆开 y ∈ S：存在自然数 n 使 y = ε * (n : ℝ)。
  obtain ⟨n, rfl⟩ := hyS

  -- 此时 hylt : a - ε < ε * (n : ℝ)。
  -- 先展开 ε * (n + 1) = ε * n + ε，方便线性算术处理。
  have hexpand : ε * ((n : ℝ) + 1) = ε * (n : ℝ) + ε := by ring

  -- 由 a - ε < ε * n 两边加 ε，得到 a < ε * (n + 1)。
  have hn1 : a < ε * ((n : ℝ) + 1) := by
    rw [hexpand]
    linarith

  -- ε * (n + 1) 也属于 S：取原像 n + 1。
  have hmem : ε * ((n : ℝ) + 1) ∈ S := by
    refine ⟨n + 1, ?_⟩
    -- 需要证明 ε * ((n + 1 : ℕ) : ℝ) = ε * ((n : ℝ) + 1)。
    -- `norm_cast`：把自然数到实数的强制转换规范化。
    norm_cast

  -- a 是 S 的上界，所以 ε * (n + 1) ≤ a。
  -- `ha.1` 是 “a 属于上界集合 upperBounds S”。
  have hub : ε * ((n : ℝ) + 1) ≤ a := ha.1 hmem

  -- a < ε * (n + 1) 与 ε * (n + 1) ≤ a 矛盾。
  linarith

/-- 取 `ε = 1`，乘积形式就退化为常见的加法形式：

对任意实数 `x`，存在自然数 `n`，使得 `x < n`。
-/
theorem real_archimedean (x : ℝ) : ∃ n : ℕ, x < n := by
  -- 对 ε = 1 使用乘积形式。
  obtain ⟨n, hn⟩ := real_archimedean_mul 1 (by norm_num) x
  -- hn : x < 1 * (n : ℝ)，化简掉乘以 1。
  exact ⟨n, by simpa using hn⟩

/-!
## 名字全称速查

* `Set.range` = 函数的值域；
* `Set.Nonempty` = 集合非空；
* `BddAbove` = bounded above，有上界；
* `upperBounds` = 上界组成的集合；
* `lowerBounds` = 下界组成的集合；
* `mem_upperBounds` = membership in upperBounds；
* `IsLUB` = least upper bound，最小上界；
* `sSup` = supremum，上确界；
* `isLUB_csSup` = IsLUB of sSup，最小上界性/完备性；
* `push Not` = 把逻辑否定推进到表达式内部；
* `by_contra` = 反证法；
* `linarith` = 线性算术；
* `ring` = 环等式化简；
* `norm_cast` = 规范化强制类型转换。
-/

end ArchimedeanProperty
