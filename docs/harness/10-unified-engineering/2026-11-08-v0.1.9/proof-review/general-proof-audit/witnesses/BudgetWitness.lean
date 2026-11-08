import Std
import Lean.Elab.Tactic.Omega

/-!
P13: a budget-safety theorem for any finite list of actions and any finite
legal execution. All costs are natural numbers in a fixed accounting unit.

The theorem is about this transition system. Honesty of charge observations,
validity of release certificates, and the implementation's refinement to
these atomic transitions remain external obligations.
-/

namespace HarnessBudget

structure Obligation where
  hidden : Nat
  future : Nat
  reserved : Nat
  deriving Repr, DecidableEq

def CoveredAction (a : Obligation) : Prop :=
  a.hidden + a.future ≤ a.reserved

def Covered : List Obligation → Prop
  | [] => True
  | a :: rest => CoveredAction a ∧ Covered rest

def hiddenTotal : List Obligation → Nat
  | [] => 0
  | a :: rest => a.hidden + hiddenTotal rest

def reservedTotal : List Obligation → Nat
  | [] => 0
  | a :: rest => a.reserved + reservedTotal rest

theorem covered_append (xs ys : List Obligation) :
    Covered (xs ++ ys) ↔ Covered xs ∧ Covered ys := by
  induction xs with
  | nil => simp [Covered]
  | cons a rest ih => simp [Covered, ih, and_assoc]

theorem hiddenTotal_append (xs ys : List Obligation) :
    hiddenTotal (xs ++ ys) = hiddenTotal xs + hiddenTotal ys := by
  induction xs with
  | nil => simp [hiddenTotal]
  | cons a rest ih => simp [hiddenTotal, ih, Nat.add_assoc]

theorem reservedTotal_append (xs ys : List Obligation) :
    reservedTotal (xs ++ ys) = reservedTotal xs + reservedTotal ys := by
  induction xs with
  | nil => simp [reservedTotal]
  | cons a rest ih => simp [reservedTotal, ih, Nat.add_assoc]

theorem covered_focus {pre post : List Obligation} {a : Obligation}
    (h : Covered (pre ++ a :: post)) : CoveredAction a := by
  exact ((covered_append pre (a :: post)).mp h).2.1

theorem covered_replace {pre post : List Obligation} {a b : Obligation}
    (h : Covered (pre ++ a :: post)) (hb : CoveredAction b) :
    Covered (pre ++ b :: post) := by
  have split := (covered_append pre (a :: post)).mp h
  exact (covered_append pre (b :: post)).mpr ⟨split.1, hb, split.2.2⟩

theorem hiddenTotal_le_reservedTotal {actions : List Obligation}
    (h : Covered actions) : hiddenTotal actions ≤ reservedTotal actions := by
  induction actions with
  | nil => simp [hiddenTotal, reservedTotal]
  | cons a rest ih =>
    have head := h.1
    have tail := ih h.2
    dsimp [CoveredAction] at head
    simp only [hiddenTotal, reservedTotal]
    omega

structure State where
  settled : Nat
  actualSpent : Nat
  closing : Nat
  actions : List Obligation
  deriving Repr, DecidableEq

def exposure (s : State) : Nat :=
  s.settled + reservedTotal s.actions + s.closing

def HonestAccounting (s : State) : Prop :=
  s.actualSpent = s.settled + hiddenTotal s.actions

def Safe (budget : Nat) (s : State) : Prop :=
  Covered s.actions ∧ HonestAccounting s ∧ exposure s ≤ budget

/- `ReleaseCertified` is a parameter, not an axiom or a constructor that a
model can fabricate. An implementation must supply evidence that exactly
this amount of future liability has ceased to be possible. A cancellation
request alone has no such rule; the separate Cancel transition is a no-op
on the budget projection.

The arithmetic theorem does not authenticate this evidence. Its connection
to the real world's liability bound is part of the refinement obligation.
-/
inductive Step (budget : Nat)
    (ReleaseCertified : Obligation → Nat → Prop) : State → State → Prop where
  | Reserve (s : State) (cap extraClosing : Nat)
      (admission : exposure s + cap + extraClosing ≤ budget) :
      Step budget ReleaseCertified s
        { s with
          closing := s.closing + extraClosing
          actions := s.actions ++
            [{ hidden := 0, future := cap, reserved := cap }] }
  | Spend (settled spent closing : Nat) (pre post : List Obligation)
      (a : Obligation) (cost : Nat) (bounded : cost ≤ a.future) :
      Step budget ReleaseCertified
        ⟨settled, spent, closing, pre ++ a :: post⟩
        ⟨settled, spent + cost, closing,
          pre ++ { a with hidden := a.hidden + cost,
                          future := a.future - cost } :: post⟩
  | Settle (settled spent closing : Nat) (pre post : List Obligation)
      (a : Obligation) (cost : Nat) (alreadySpent : cost ≤ a.hidden) :
      Step budget ReleaseCertified
        ⟨settled, spent, closing, pre ++ a :: post⟩
        ⟨settled + cost, spent, closing,
          pre ++ { a with hidden := a.hidden - cost,
                          reserved := a.reserved - cost } :: post⟩
  | Release (settled spent closing : Nat) (pre post : List Obligation)
      (a : Obligation) (amount : Nat) (bounded : amount ≤ a.future)
      (certified : ReleaseCertified a amount) :
      Step budget ReleaseCertified
        ⟨settled, spent, closing, pre ++ a :: post⟩
        ⟨settled, spent, closing,
          pre ++ { a with future := a.future - amount,
                          reserved := a.reserved - amount } :: post⟩
  | Close (s : State) (cost : Nat) (bounded : cost ≤ s.closing) :
      Step budget ReleaseCertified s
        { s with settled := s.settled + cost,
                 actualSpent := s.actualSpent + cost,
                 closing := s.closing - cost }
  | Cancel (s : State) : Step budget ReleaseCertified s s

theorem spend_preserves_coverage {a : Obligation} {cost : Nat}
    (h : CoveredAction a) (bounded : cost ≤ a.future) :
    CoveredAction { a with hidden := a.hidden + cost, future := a.future - cost } := by
  dsimp [CoveredAction] at h ⊢
  omega

theorem settle_preserves_coverage {a : Obligation} {cost : Nat}
    (h : CoveredAction a) (alreadySpent : cost ≤ a.hidden) :
    CoveredAction { a with hidden := a.hidden - cost, reserved := a.reserved - cost } := by
  dsimp [CoveredAction] at h ⊢
  omega

theorem release_preserves_coverage {a : Obligation} {amount : Nat}
    (h : CoveredAction a) (bounded : amount ≤ a.future) :
    CoveredAction { a with future := a.future - amount, reserved := a.reserved - amount } := by
  dsimp [CoveredAction] at h ⊢
  omega

theorem step_preserves {budget : Nat}
    {ReleaseCertified : Obligation → Nat → Prop} {s t : State}
    (move : Step budget ReleaseCertified s t) (safe : Safe budget s) :
    Safe budget t := by
  cases move with
  | Reserve s cap extraClosing admission =>
    rcases safe with ⟨covered, accounting, bound⟩
    refine ⟨?_, ?_, ?_⟩
    · simpa [Covered, covered_append, CoveredAction] using covered
    · simpa [HonestAccounting, hiddenTotal_append, hiddenTotal] using accounting
    · dsimp [exposure] at admission ⊢
      simp only [reservedTotal_append, reservedTotal]
      omega
  | Spend settled spent closing pre post a cost bounded =>
    rcases safe with ⟨covered, accounting, bound⟩
    have localCoverage := covered_focus covered
    refine ⟨?_, ?_, ?_⟩
    · exact covered_replace covered (spend_preserves_coverage localCoverage bounded)
    · dsimp [HonestAccounting] at accounting ⊢
      simp only [hiddenTotal_append, hiddenTotal] at accounting ⊢
      omega
    · simpa [exposure, reservedTotal_append, reservedTotal] using bound
  | Settle settled spent closing pre post a cost alreadySpent =>
    rcases safe with ⟨covered, accounting, bound⟩
    have localCoverage := covered_focus covered
    refine ⟨?_, ?_, ?_⟩
    · exact covered_replace covered (settle_preserves_coverage localCoverage alreadySpent)
    · dsimp [HonestAccounting] at accounting ⊢
      simp only [hiddenTotal_append, hiddenTotal] at accounting ⊢
      omega
    · dsimp [CoveredAction] at localCoverage
      dsimp [exposure] at bound ⊢
      simp only [reservedTotal_append, reservedTotal] at bound ⊢
      omega
  | Release settled spent closing pre post a amount bounded certified =>
    rcases safe with ⟨covered, accounting, bound⟩
    have localCoverage := covered_focus covered
    refine ⟨?_, ?_, ?_⟩
    · exact covered_replace covered (release_preserves_coverage localCoverage bounded)
    · simpa [HonestAccounting, hiddenTotal_append, hiddenTotal] using accounting
    · dsimp [exposure] at bound ⊢
      simp only [reservedTotal_append, reservedTotal] at bound ⊢
      omega
  | Close s cost bounded =>
    rcases safe with ⟨covered, accounting, bound⟩
    refine ⟨covered, ?_, ?_⟩
    · dsimp [HonestAccounting] at accounting ⊢
      omega
    · dsimp [exposure] at bound ⊢
      omega
  | Cancel s => exact safe

/- Any finite number of steps, and any finite number of distinct obligation
entries. Reserve can append indefinitely across an unbounded family of finite
runs. There is no fixed numeric or action-count bound in these theorems. -/
inductive Run (budget : Nat)
    (ReleaseCertified : Obligation → Nat → Prop) : State → State → Prop where
  | refl (s : State) : Run budget ReleaseCertified s s
  | snoc {start mid finish : State} :
      Run budget ReleaseCertified start mid →
      Step budget ReleaseCertified mid finish →
      Run budget ReleaseCertified start finish

theorem run_preserves {budget : Nat}
    {ReleaseCertified : Obligation → Nat → Prop} {start finish : State}
    (run : Run budget ReleaseCertified start finish) :
    Safe budget start → Safe budget finish := by
  induction run with
  | refl => exact fun safe => safe
  | snoc prior move ih =>
    intro safe
    exact step_preserves move (ih safe)

theorem actual_spent_le_exposure {s : State}
    (coverage : Covered s.actions) (accounting : HonestAccounting s) :
    s.actualSpent ≤ exposure s := by
  have hiddenBound := hiddenTotal_le_reservedTotal coverage
  dsimp [HonestAccounting] at accounting
  dsimp [exposure]
  omega

theorem safe_actual_spent_le_budget {budget : Nat} {s : State}
    (safe : Safe budget s) : s.actualSpent ≤ budget := by
  have realBound := actual_spent_le_exposure safe.1 safe.2.1
  exact Nat.le_trans realBound safe.2.2

theorem finite_run_budget_safety {budget : Nat}
    {ReleaseCertified : Obligation → Nat → Prop} {start finish : State}
    (initial : Safe budget start)
    (run : Run budget ReleaseCertified start finish) :
    Covered finish.actions ∧
    HonestAccounting finish ∧
    exposure finish ≤ budget ∧
    finish.actualSpent ≤ budget := by
  have finalSafe := run_preserves run initial
  exact ⟨finalSafe.1, finalSafe.2.1, finalSafe.2.2,
    safe_actual_spent_le_budget finalSafe⟩

def initialState (closing : Nat) : State :=
  ⟨0, 0, closing, []⟩

theorem initial_safe {budget closing : Nat} (bound : closing ≤ budget) :
    Safe budget (initialState closing) := by
  simpa [Safe, initialState, Covered, HonestAccounting,
    hiddenTotal, exposure, reservedTotal] using bound

theorem from_empty_finite_run_safe {budget closing : Nat}
    {ReleaseCertified : Obligation → Nat → Prop} {finish : State}
    (closingBound : closing ≤ budget)
    (run : Run budget ReleaseCertified (initialState closing) finish) :
    finish.actualSpent ≤ budget := by
  exact (finite_run_budget_safety (initial_safe closingBound) run).2.2.2

-- Inspection commands are part of the compiler receipt. No custom axioms,
-- unchecked oracle, native evaluation proof, or admitted goals are used.
#print axioms step_preserves
#print axioms run_preserves
#print axioms actual_spent_le_exposure
#print axioms finite_run_budget_safety
#print axioms from_empty_finite_run_safe

end HarnessBudget


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
