"""Append review witnesses to unchanged frozen proof sources; local use only."""
from pathlib import Path

base = Path(__file__).resolve().parent
out = base / "witnesses"
out.mkdir(exist_ok=True)

dag = r'''

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
'''

budget = r'''

namespace BudgetAudit
open HarnessBudget

-- A nonzero run exercises every constructor, including an unfinished prefix
-- with hidden spending and a future obligation. The abstract release guard
-- is deliberately permissive; this is not evidence about external effects.
def permit (_ : Obligation) (_ : Nat) : Prop := True
def s0 : State := initialState 1
def s1 : State := ⟨0, 0, 2, [⟨0, 5, 5⟩]⟩
def s2 : State := ⟨0, 3, 2, [⟨3, 2, 5⟩]⟩
def s3 : State := ⟨2, 3, 2, [⟨1, 2, 3⟩]⟩
def s4 : State := ⟨2, 3, 2, [⟨1, 1, 2⟩]⟩
def s5 : State := ⟨3, 4, 1, [⟨1, 1, 2⟩]⟩

theorem reserveStep : Step 10 permit s0 s1 :=
  Step.Reserve s0 5 1 (by decide)
theorem spendStep : Step 10 permit s1 s2 :=
  Step.Spend 0 0 2 [] [] ⟨0, 5, 5⟩ 3 (by decide)
theorem settleStep : Step 10 permit s2 s3 :=
  Step.Settle 0 3 2 [] [] ⟨3, 2, 5⟩ 2 (by decide)
theorem releaseStep : Step 10 permit s3 s4 :=
  Step.Release 2 3 2 [] [] ⟨1, 2, 3⟩ 1 (by decide) True.intro
theorem closeStep : Step 10 permit s4 s5 :=
  Step.Close s4 1 (by decide)
theorem cancelStep : Step 10 permit s5 s5 := Step.Cancel s5

theorem nonzeroRun : Run 10 permit s0 s5 :=
  Run.snoc (Run.snoc (Run.snoc (Run.snoc (Run.snoc
    (Run.snoc (Run.refl s0) reserveStep) spendStep) settleStep)
    releaseStep) closeStep) cancelStep

theorem concreteSafe : s5.actualSpent ≤ 10 :=
  from_empty_finite_run_safe (by decide : 1 ≤ 10) nonzeroRun

example : s5.actualSpent = 4 ∧ hiddenTotal s5.actions = 1 := by decide

-- One proof of a numeric relation is reusable for two equal numeric entries.
-- This shows exactly what action/generation binding is absent from the type.
def identical : Obligation := ⟨0, 3, 3⟩
def released : Obligation := ⟨0, 0, 0⟩
def numericCertificate (a : Obligation) (amount : Nat) : Prop :=
  a = identical ∧ amount = 3
theorem certificate : numericCertificate identical 3 := ⟨rfl, rfl⟩
def pairStart : State := ⟨0, 0, 0, [identical, identical]⟩
def pairMiddle : State := ⟨0, 0, 0, [released, identical]⟩
def pairEnd : State := ⟨0, 0, 0, [released, released]⟩
theorem releaseFirst : Step 6 numericCertificate pairStart pairMiddle :=
  Step.Release 0 0 0 [] [identical] identical 3 (by decide) certificate
theorem releaseSecond : Step 6 numericCertificate pairMiddle pairEnd :=
  Step.Release 0 0 0 [released] [] identical 3 (by decide) certificate
theorem same_numeric_certificate_reused : Run 6 numericCertificate pairStart pairEnd :=
  Run.snoc (Run.snoc (Run.refl pairStart) releaseFirst) releaseSecond
theorem pair_initial_safe : Safe 6 pairStart := by
  simp [Safe, Covered, CoveredAction, HonestAccounting, exposure,
    pairStart, identical, hiddenTotal, reservedTotal]
theorem pair_final_safe : pairEnd.actualSpent ≤ 6 :=
  (finite_run_budget_safety pair_initial_safe same_numeric_certificate_reused).2.2.2

#print axioms nonzeroRun
#print axioms concreteSafe
#print axioms same_numeric_certificate_reused
#print axioms pair_final_safe
end BudgetAudit
'''

for label, source, extra in [
    ("DagWitness", base / "inputs/dag/IncrementalDag.lean", dag),
    ("BudgetWitness", base / "inputs/budget/BudgetSafety.lean", budget),
]:
    (out / (label + ".lean")).write_text(source.read_text() + extra)
