
#

```lean
import Mathlib

theorem archimedean_real' (x y : ℝ) (hx : 0 < x) :
    ∃ n : ℕ, y < n * x := by
  by_contra h
  push_neg at h
  -- h : ∀ n : ℕ, (n : ℝ) * x ≤ y
  set S : Set ℝ := Set.range (fun n : ℕ => (n : ℝ) * x) with hS
  -- S 非空
  have hne : S.Nonempty := ⟨0, 0, by simp⟩
  -- S 有上界 y
  have hbdd : BddAbove S := ⟨y, by rintro _ ⟨n, rfl⟩; exact h n⟩
  -- sSup S - x < sSup S，所以 sSup S - x 不是上界
  have hlt : sSup S - x < sSup S := by linarith
  obtain ⟨_, ⟨n, rfl⟩, hn⟩ := exists_lt_of_lt_csSup hne hlt
  -- 于是 (n+1)*x 也在 S 中，且比 sSup S 大
  have hmem : ((n + 1 : ℕ) : ℝ) * x ∈ S := ⟨n + 1, rfl⟩
  have hle : ((n + 1 : ℕ) : ℝ) * x ≤ sSup S := le_csSup hbdd hmem
  push_cast at hle
  nlinarith
  ```


  [ ] 实数集的稠密性证明

  [ ] 无理数在 R 中稠密