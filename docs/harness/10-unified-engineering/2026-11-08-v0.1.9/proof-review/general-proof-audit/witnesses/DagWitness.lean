import Std

/-!
Finite DAG incremental recomputation.

Nodes are numbered in a topological order. A node may read only its declared
predecessors. Values can have any type; node functions need not be monotone.
The affected set is an over-approximation closed under dependency successors.
This file proves a specification property, not dependency extraction correctness.
-/

namespace HarnessDag

universe u
variable {α : Type u}

abbrev Values (α : Type u) := Nat → α
abbrev Rules (α : Type u) := Nat → Values α → α

def put (s : Values α) (i : Nat) (v : α) : Values α :=
  fun j => if j = i then v else s j

def sweep (f : Rules α) (selected : Nat → Bool) (base : Values α) :
    Nat → Values α
  | 0 => base
  | k + 1 =>
      let prev := sweep f selected base k
      if selected k = true then put prev k (f k prev) else prev

def Local (f : Rules α) (deps : Nat → Nat → Prop) : Prop :=
  ∀ i x y, (∀ j, deps i j → x j = y j) → f i x = f i y

def Topological (deps : Nat → Nat → Prop) : Prop :=
  ∀ i j, deps i j → j < i

def Closed (selected : Nat → Bool) (deps : Nat → Nat → Prop) : Prop :=
  ∀ i j, deps i j → selected j = true → selected i = true

theorem sweep_unvisited (f : Rules α) (sel : Nat → Bool) (base : Values α)
    (k i : Nat) (h : k ≤ i) :
    sweep f sel base k i = base i := by
  induction k with
  | zero => rfl
  | succ k ih =>
      have hki : k ≤ i := by omega
      have hik : i ≠ k := by omega
      simp only [sweep]
      split
      · simpa [put, hik] using ih hki
      · exact ih hki

theorem sweep_preserves_prefix (f : Rules α) (sel : Nat → Bool)
    (base : Values α) (small big i : Nat)
    (hi : i < small) (hs : small ≤ big) :
    sweep f sel base big i = sweep f sel base small i := by
  induction big with
  | zero =>
      have : small = 0 := by omega
      subst small
      rfl
  | succ big ih =>
      by_cases heq : small = big + 1
      · subst small
        rfl
      · have hs' : small ≤ big := by omega
        have hik : i ≠ big := by omega
        simp only [sweep]
        split
        · simpa [put, hik] using ih hs'
        · exact ih hs'

theorem full_sweep_consistent (f : Rules α) (deps : Nat → Nat → Prop)
    (locality : Local f deps) (topo : Topological deps)
    (seed : Values α) (n i : Nat) (hi : i < n) :
    sweep f (fun _ => true) seed n i =
      f i (sweep f (fun _ => true) seed n) := by
  have saved := sweep_preserves_prefix f (fun _ => true) seed
    (i + 1) n i (by omega) (by omega)
  have written : sweep f (fun _ => true) seed (i + 1) i =
      f i (sweep f (fun _ => true) seed i) := by
    simp [sweep, put]
  rw [saved, written]
  apply locality
  intro j hd
  have hji := topo i j hd
  exact (sweep_preserves_prefix f (fun _ => true) seed i n j hji
    (by omega)).symm

theorem outside_affected_unchanged
    (oldRules newRules : Rules α) (deps : Nat → Nat → Prop)
    (selected : Nat → Bool) (old fresh : Values α) (n : Nat)
    (locality : Local newRules deps) (topo : Topological deps)
    (closed : Closed selected deps)
    (oldConsistent : ∀ i, i < n → old i = oldRules i old)
    (freshConsistent : ∀ i, i < n → fresh i = newRules i fresh)
    (sameRule : ∀ i, i < n → selected i = false →
      ∀ values, newRules i values = oldRules i values) :
    ∀ i, i < n → selected i = false → old i = fresh i := by
  intro i
  induction i using Nat.strongRecOn with
  | ind i ih =>
      intro hin hnot
      have equalInputs : ∀ j, deps i j → old j = fresh j := by
        intro j hd
        have hji := topo i j hd
        have hnj : selected j = false := by
          cases hb : selected j with
          | false => rfl
          | true =>
              have impossible := closed i j hd hb
              simp [hnot] at impossible
        exact ih j hji (by omega) hnj
      calc
        old i = oldRules i old := oldConsistent i hin
        _ = newRules i old := (sameRule i hin hnot old).symm
        _ = newRules i fresh := locality i old fresh equalInputs
        _ = fresh i := (freshConsistent i hin).symm

theorem selected_sweep_correct
    (f : Rules α) (deps : Nat → Nat → Prop)
    (selected : Nat → Bool) (old fresh : Values α) (n : Nat)
    (locality : Local f deps) (topo : Topological deps)
    (freshConsistent : ∀ i, i < n → fresh i = f i fresh)
    (outsideEqual : ∀ i, i < n → selected i = false → old i = fresh i) :
    ∀ k, k ≤ n → ∀ i, i < k →
      sweep f selected old k i = fresh i := by
  intro k
  induction k with
  | zero =>
      intro _ i hi
      omega
  | succ k ih =>
      intro hkn i hik
      have hk : k ≤ n := by omega
      have hlt : k < n := by omega
      by_cases hieq : i = k
      · subst i
        by_cases hsel : selected k = true
        · have inputs : ∀ j, deps k j →
              sweep f selected old k j = fresh j := by
            intro j hd
            exact ih hk j (topo k j hd)
          calc
            sweep f selected old (k + 1) k =
                f k (sweep f selected old k) := by simp [sweep, hsel, put]
            _ = f k fresh := locality k _ _ inputs
            _ = fresh k := (freshConsistent k hlt).symm
        · have hfalse : selected k = false := by
            cases hb : selected k <;> simp_all
          calc
            sweep f selected old (k + 1) k =
                sweep f selected old k k := by simp [sweep, hsel]
            _ = old k := sweep_unvisited f selected old k k (by omega)
            _ = fresh k := outsideEqual k hlt hfalse
      · have hil : i < k := by omega
        have unchanged := sweep_preserves_prefix f selected old k (k + 1) i
          hil (by omega)
        exact unchanged.trans (ih hk i hil)

/-- Main theorem: selective recomputation equals full evaluation below n. -/
theorem incremental_equals_full
    (oldRules newRules : Rules α) (deps : Nat → Nat → Prop)
    (selected : Nat → Bool) (old seed : Values α) (n : Nat)
    (locality : Local newRules deps) (topo : Topological deps)
    (closed : Closed selected deps)
    (oldConsistent : ∀ i, i < n → old i = oldRules i old)
    (sameRule : ∀ i, i < n → selected i = false →
      ∀ values, newRules i values = oldRules i values) :
    ∀ i, i < n →
      sweep newRules selected old n i =
        sweep newRules (fun _ => true) seed n i := by
  let fresh := sweep newRules (fun _ => true) seed n
  have hc : ∀ i, i < n → fresh i = newRules i fresh := by
    intro i hi
    exact full_sweep_consistent newRules deps locality topo seed n i hi
  have outside := outside_affected_unchanged oldRules newRules deps selected
    old fresh n locality topo closed oldConsistent hc sameRule
  exact selected_sweep_correct newRules deps selected old fresh n locality
    topo hc outside n (by omega)

#print axioms incremental_equals_full
#print axioms full_sweep_consistent

/- Concrete reduction checks: one changed root, an unaffected node, and a
   downstream AND-like combination. These do not replace the general theorem. -/
def exampleOld : Rules Nat
  | 0, _ => 10
  | 1, s => s 0 + 1
  | 2, _ => 7
  | 3, s => s 1 + s 2
  | _, _ => 0

def exampleNew : Rules Nat
  | 0, _ => 20
  | 1, s => s 0 + 1
  | 2, _ => 7
  | 3, s => s 1 + s 2
  | _, _ => 0

def exampleAffected (i : Nat) : Bool := i == 0 || i == 1 || i == 3
def exampleBrokenAffected (i : Nat) : Bool := i == 0
def exampleOldValues := sweep exampleOld (fun _ => true) (fun _ => 0) 4

example :
    (List.range 4).map exampleOldValues = [10, 11, 7, 18] := by decide

example :
    (List.range 4).map (sweep exampleNew exampleAffected exampleOldValues 4) =
      [20, 21, 7, 28] := by decide

example :
    (List.range 4).map (sweep exampleNew (fun _ => true) (fun _ => 0) 4) =
      [20, 21, 7, 28] := by decide

example :
    (List.range 4).map
        (sweep exampleNew exampleBrokenAffected exampleOldValues 4) =
      [20, 11, 7, 18] := by decide

example :
    sweep exampleNew exampleBrokenAffected exampleOldValues 4 3 ≠
      sweep exampleNew (fun _ => true) (fun _ => 0) 4 3 := by decide

end HarnessDag


namespace DagAudit
open HarnessDag

def oldRules : Rules Nat := fun i s =>
  if i = 0 then 10 else if i = 1 then 7 else if i = 2 then s 0 + 1 else 0
def newRules : Rules Nat := fun i s =>
  if i = 0 then 10 else if i = 1 then 7 else if i = 2 then s 1 + 1 else 0
def oldValues : Values Nat := fun i =>
  if i = 0 then 10 else if i = 1 then 7 else if i = 2 then 11 else 0
def newDeps (i j : Nat) : Prop := i = 2 ∧ j = 1
def selected (i : Nat) : Bool := decide (i = 2)

theorem locality : Local newRules newDeps := by
  intro i x y same
  by_cases h0 : i = 0
  · simp [newRules, h0]
  by_cases h1 : i = 1
  · simp [newRules, h1]
  by_cases h2 : i = 2
  · have equal := same 1 ⟨h2, rfl⟩
    simp [newRules, h0, h1, h2, equal]
  · simp [newRules, h0, h1, h2]

theorem topological : Topological newDeps := by
  rintro i j ⟨rfl, rfl⟩
  decide

theorem closed : Closed selected newDeps := by
  rintro i j ⟨rfl, rfl⟩ impossible
  simp [selected] at impossible

theorem oldConsistent : ∀ i, i < 3 → oldValues i = oldRules i oldValues := by
  intro i hi
  have cases : i = 0 ∨ i = 1 ∨ i = 2 := by omega
  rcases cases with rfl | rfl | rfl <;> rfl

theorem sameOutside : ∀ i, i < 3 → selected i = false →
    ∀ s, newRules i s = oldRules i s := by
  intro i _ hi s
  have h2 : i ≠ 2 := by simpa [selected] using hi
  simp [newRules, oldRules, h2]

-- Reads change from predecessor 0 to predecessor 1. All theorem premises
-- are proved rather than assumed; the new dependency graph is still a DAG.
theorem changed_read_set_instance : ∀ i, i < 3 →
    sweep newRules selected oldValues 3 i =
    sweep newRules (fun _ => true) (fun _ => 99) 3 i :=
  incremental_equals_full oldRules newRules newDeps selected oldValues
    (fun _ => 99) 3 locality topological closed oldConsistent sameOutside

example : oldValues 2 = 11 := by decide
example : sweep newRules selected oldValues 3 2 = 8 := by decide
example : selected 0 = false ∧ selected 1 = false ∧ selected 2 = true := by decide

#print axioms changed_read_set_instance
end DagAudit
