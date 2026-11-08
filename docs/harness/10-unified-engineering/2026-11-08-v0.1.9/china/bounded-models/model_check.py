#!/usr/bin/env python3
"""Finite specification checks. Standard library only; no product or network I/O.

All transitions are abstract atomic events. The checker does NOT establish
implementation refinement, authentic observations, target fencing, or liveness.
Run from any directory: python3 model_check.py [--output-dir DIRECTORY].
"""
from __future__ import annotations

import argparse
from collections import Counter, deque
from dataclasses import asdict, dataclass, replace
import hashlib
from itertools import combinations, product
import json
from pathlib import Path
import sys


def changed(values, i, value):
    return values[:i] + (value,) + values[i + 1:]


def event(op, action=None, amount=None, **extra):
    result = {"op": op}
    if action is not None:
        result["action"] = "AB"[action]
    if amount is not None:
        result["amount"] = amount
    return result | extra


def state_json(state):
    return asdict(state) if hasattr(state, "__dataclass_fields__") else state


def trace_to(state, parents):
    path = []
    while parents[state] is not None:
        previous, operation = parents[state]
        path.append({"event": operation, "state": state_json(state)})
        state = previous
    path.append({"event": {"op": "initial"}, "state": state_json(state)})
    return list(reversed(path))


def explore(initial, successors, checks, *, max_states=750_000):
    """BFS exhausts the reachable finite graph; first failing edge is shortest.

    Checks are independent observation predicates over before/event/after. We
    continue after failures to count the ENTIRE graph, including mutant states.
    No depth truncation, random sampling, symmetry reduction, or partial-order
    reduction is used. A state-cap overrun fails rather than claiming coverage.
    """
    parents = {initial: None}
    depths = {initial: 0}
    queue = deque([initial])
    failures = {}
    failure_counts = Counter()
    operations = Counter()
    depth_histogram = Counter({0: 1})
    edges = 0
    for name, check in checks.items():
        if not check(initial, {"op": "initial"}, initial):
            failures[name] = {"length": 0, "trace": trace_to(initial, parents)}
    while queue:
        before = queue.popleft()
        for operation, after in successors(before):
            edges += 1
            operations[operation["op"]] += 1
            for name, check in checks.items():
                if not check(before, operation, after):
                    failure_counts[name] += 1
                    if name not in failures:
                        failures[name] = {
                            "length": depths[before] + 1,
                            "trace": trace_to(before, parents) + [
                                {"event": operation, "state": state_json(after)}
                            ],
                        }
            if after not in parents:
                if len(parents) >= max_states:
                    raise RuntimeError("state cap reached; enumeration incomplete")
                parents[after] = (before, operation)
                depths[after] = depths[before] + 1
                depth_histogram[depths[after]] += 1
                queue.append(after)
    return {
        "complete": True,
        "states": len(parents),
        "transitions": edges,
        "max_shortest_depth": max(depths.values()),
        "depth_histogram": dict(sorted(depth_histogram.items())),
        "transition_coverage": dict(sorted(operations.items())),
        "violating_edges": dict(sorted(failure_counts.items())),
        "shortest_counterexamples": failures,
    }


# 1. Two conflicting logical actions. Phase names are bookkeeping predicates,
# not statements about the physical world's current state.
UNRESOLVED = frozenset({"reserved", "dispatched", "unknown"})


@dataclass(frozen=True)
class Actions:
    phase: tuple = ("idle", "idle")
    cancel_requested: tuple = (False, False)
    sender_stopped: tuple = (False, False)


def action_steps(state, variant):
    for i in range(2):
        phase = state.phase[i]
        other = state.phase[1 - i]
        if phase == "idle" and other not in UNRESOLVED:
            yield event("reserve", i), replace(
                state, phase=changed(state.phase, i, "reserved"))
        if phase == "reserved" and not state.cancel_requested[i]:
            if variant == "omit_dispatch_recheck" or other not in UNRESOLVED:
                yield event("send", i), replace(
                    state, phase=changed(state.phase, i, "dispatched"))
        if phase != "idle" and not state.cancel_requested[i]:
            phases = state.phase
            if variant == "cancel_means_not_applied" and phase in {"dispatched", "unknown"}:
                phases = changed(phases, i, "not_applied")
            yield event("cancel", i), replace(
                state, phase=phases,
                cancel_requested=changed(state.cancel_requested, i, True))
        if phase == "reserved" and state.cancel_requested[i]:
            yield event("abandon_unsent", i), replace(
                state, phase=changed(state.phase, i, "abandoned"))
        if phase in {"dispatched", "unknown"}:
            for op, target in [("success", "success"), ("no_effect_evidence", "not_applied")]:
                yield event(op, i), replace(state, phase=changed(state.phase, i, target))
        if phase == "dispatched":
            yield event("outcome_unknown", i), replace(
                state, phase=changed(state.phase, i, "unknown"))
        if phase in {"success", "not_applied"}:
            yield event("withdraw_evidence", i), replace(
                state, phase=changed(state.phase, i, "unknown"))
        if phase in {"dispatched", "unknown", "success", "not_applied"} and not state.sender_stopped[i]:
            yield event("sender_terminated", i), replace(
                state, sender_stopped=changed(state.sender_stopped, i, True))


def dispatch_conflict_free(before, operation, after):
    if operation["op"] != "send":
        return True
    actor = "AB".index(operation["action"])
    # Oracle inspects the authoritative pre-transition occupancy, independent
    # of whether the particular successor generator chose to recheck it.
    return not any(j != actor and p in {"reserved", "dispatched", "unknown"}
                   for j, p in enumerate(before.phase))


def cancel_is_not_resolution(before, operation, after):
    if operation["op"] != "cancel":
        return True
    actor = "AB".index(operation["action"])
    return (before.phase[actor] not in {"dispatched", "unknown"}
            or after.phase[actor] not in {"success", "not_applied", "abandoned"})


def check_actions():
    checks = {
        "dispatch_has_no_unresolved_conflict": dispatch_conflict_free,
        "cancel_request_is_not_effect_resolution": cancel_is_not_resolution,
        "FALSE_CONJECTURE_active_count_at_most_one":
            lambda b, e, a: sum(p in UNRESOLVED for p in a.phase) <= 1,
    }
    results = {variant: explore(Actions(), lambda s, v=variant: action_steps(s, v), checks)
               for variant in ["correct", "omit_dispatch_recheck", "cancel_means_not_applied"]}
    expected = {
        "correct": {"FALSE_CONJECTURE_active_count_at_most_one"},
        "omit_dispatch_recheck": {"FALSE_CONJECTURE_active_count_at_most_one",
                                    "dispatch_has_no_unresolved_conflict"},
        "cancel_means_not_applied": {"FALSE_CONJECTURE_active_count_at_most_one",
                                      "cancel_request_is_not_effect_resolution"},
    }
    for name, wanted in expected.items():
        actual = set(results[name]["shortest_counterexamples"])
        if actual != wanted:
            raise RuntimeError(f"action checker expectation mismatch: {name}: {actual}")
    return results


# 2. Positive AND/OR support with two derived nodes and three independent roots.
# Formula: disjunction of 0..2 nonempty conjunctions, each of arity 1..2.
# Empty formula is false. No negation, probabilistic support, or time semantics.
ATOM_NAMES = ("a", "b", "c", "y", "z")
BOOL2 = tuple(product((False, True), repeat=2))
BOOL3 = tuple(product((False, True), repeat=3))


def formula_value(formula, atoms):
    return any(all(atoms[index] for index in clause) for clause in formula)


def step_support(network, bases, derived):
    atoms = bases + derived
    return tuple(formula_value(formula, atoms) for formula in network)


def iterate_support(network, bases, initial=(False, False)):
    current = initial
    seen = set()
    while current not in seen:
        seen.add(current)
        new = step_support(network, bases, current)
        if new == current:
            return new
        current = new
    raise RuntimeError("unexpected cycle in positive monotone update")


def least_fixed_point_oracle(network, bases):
    """Independent oracle: enumerate all four assignments, then order them.

    This does not reuse the iterative solver, does not initialize from old
    state, and does not call a reachability/descendant invalidation routine.
    """
    fixed = [d for d in BOOL2 if step_support(network, bases, d) == d]
    least = [d for d in fixed if all(all(not x or y for x, y in zip(d, f)) for f in fixed)]
    if len(least) != 1:
        raise RuntimeError("finite positive system must have a unique least fixed point")
    return least[0]


def descendants(network, root):
    affected = {root}
    while True:
        added = {3 + i for i, formula in enumerate(network)
                 if any(atom in affected for clause in formula for atom in clause)}
        new = affected | added
        if new == affected:
            return affected - {root}
        affected = new


def support_update(network, bases, old_derived, changed_base, variant):
    if variant == "stale_seed":
        return iterate_support(network, bases, old_derived)
    if variant == "clear_all_descendants" and not bases[changed_base]:
        impacted = descendants(network, changed_base)
        return tuple(False if 3 + i in impacted else old_derived[i] for i in range(2))
    return iterate_support(network, bases)


def network_label(network):
    return {ATOM_NAMES[3 + i]: " OR ".join(" AND ".join(ATOM_NAMES[a] for a in clause)
                                          for clause in formula) or "FALSE"
            for i, formula in enumerate(network)}


def support_witness(network, old_bases, removed_base, variant):
    # Shortest known prefix to this base valuation from all roots false: one
    # addition per true bit. The global first mutant failure is selected by
    # minimum total length across all networks/valuations; focused BFS below
    # independently proves the requested two-node cycle's minimum length.
    bases = (False, False, False)
    derived = (False, False)
    trace = [{"event": {"op": "initial"}, "state": {"bases": bases, "derived": derived}}]
    for index, present in enumerate(old_bases):
        if present:
            bases = changed(bases, index, True)
            derived = support_update(network, bases, derived, index, variant)
            trace.append({"event": {"op": "add_root", "root": ATOM_NAMES[index]},
                          "state": {"bases": bases, "derived": derived}})
    bases = changed(bases, removed_base, False)
    derived = support_update(network, bases, derived, removed_base, variant)
    trace.append({"event": {"op": "withdraw_root", "root": ATOM_NAMES[removed_base]},
                  "state": {"bases": bases, "derived": derived,
                            "oracle_lfp": least_fixed_point_oracle(network, bases)}})
    return {"length": len(trace) - 1, "network": network_label(network), "trace": trace}


@dataclass(frozen=True)
class SupportState:
    bases: tuple = (False, False, False)
    derived: tuple = (False, False)


def focused_support(network, variant, initial=SupportState()):
    def successors(state):
        for index in range(3):
            bases = changed(state.bases, index, not state.bases[index])
            derived = support_update(network, bases, state.derived, index, variant)
            yield {"op": "add_root" if bases[index] else "withdraw_root", "root": ATOM_NAMES[index]}, SupportState(bases, derived)
    result = explore(initial, successors, {
        "supported_equals_least_fixed_point":
            lambda b, e, a: a.derived == least_fixed_point_oracle(network, a.bases)
    })
    for witness in result["shortest_counterexamples"].values():
        witness["network"] = network_label(network)
    return {"network": network_label(network), **result}


def check_support():
    clauses = tuple(combinations(range(5), 1)) + tuple(combinations(range(5), 2))
    formulas = ((),) + tuple((c,) for c in clauses) + tuple(combinations(clauses, 2))
    stats = Counter()
    shortest = {}
    for network in product(formulas, repeat=2):
        stats["networks"] += 1
        oracle = {bases: least_fixed_point_oracle(network, bases) for bases in BOOL3}
        for bases in BOOL3:
            stats["stable_assignments_checked"] += 1
            old = iterate_support(network, bases)
            if old != oracle[bases]:
                raise RuntimeError("bottom iteration disagrees with all-fixed-point oracle")
            for index in range(3):
                updated = changed(bases, index, not bases[index])
                stats["transitions_checked"] += 1
                kind = "withdrawals_checked" if bases[index] else "additions_checked"
                stats[kind] += 1
                correct = support_update(network, updated, old, index, "correct")
                if correct != oracle[updated]:
                    raise RuntimeError("correct support transition failed")
                for variant in ["stale_seed", "clear_all_descendants"]:
                    actual = support_update(network, updated, old, index, variant)
                    if actual != oracle[updated]:
                        stats[variant + "_failing_transitions"] += 1
                        length = sum(bases) + 1
                        if variant not in shortest or length < shortest[variant]["length"]:
                            shortest[variant] = support_witness(network, bases, index, variant)
    cycle = (((0,), (4,)), ((3,),))  # y = a OR z; z = y
    and_or = (((0, 1), (2,)), ((3,),))  # y = (a AND b) OR c; z = y
    focused = {
        "cycle_correct": focused_support(cycle, "correct"),
        "cycle_stale_seed": focused_support(cycle, "stale_seed"),
        "and_or_correct": focused_support(and_or, "correct"),
        "and_or_clear_descendants": focused_support(and_or, "clear_all_descendants"),
    }
    if set(shortest) != {"stale_seed", "clear_all_descendants"}:
        raise RuntimeError("expected support mutants did not fail")
    return {"formula_count_per_node": len(formulas), **dict(stats),
            "shortest_counterexamples": shortest, "focused_bfs": focused}


# 3. Cost has physical hidden spending h, possible future spending f, and a
# ledger reservation r. Correct r bounds h+f, not only f. U is settled cost.
@dataclass(frozen=True)
class Budget:
    settled: int
    closing_remaining: int
    phase: tuple = ("idle", "idle")
    reserved: tuple = (0, 0)
    hidden_spent: tuple = (0, 0)
    future_max: tuple = (0, 0)


def budget_steps(state, total, variant, caps=None):
    caps = caps or (total, total)
    ledger = state.settled + sum(state.reserved) + state.closing_remaining
    for i in range(2):
        phase, hold, hidden, future = (state.phase[i], state.reserved[i],
                                       state.hidden_spent[i], state.future_max[i])
        if phase == "idle":
            for amount in range(1, caps[i] + 1):
                if ledger + amount <= total:
                    yield event("reserve_cost", i, amount), replace(
                        state, phase=changed(state.phase, i, "running"),
                        reserved=changed(state.reserved, i, amount),
                        future_max=changed(state.future_max, i, amount))
        if phase == "running":
            for amount in range(1, future + 1):
                yield event("spend_unreported", i, amount), replace(
                    state, hidden_spent=changed(state.hidden_spent, i, hidden + amount),
                    future_max=changed(state.future_max, i, future - amount))
            if future:
                # Stopping is assumed to establish no future spending. Already
                # spent, unreported cost remains a liability even after stop.
                yield event("stop_release_future_only", i), replace(
                    state, phase=changed(state.phase, i, "stopped" if hidden else "done"),
                    reserved=changed(state.reserved, i, max(0, hold - future)),
                    future_max=changed(state.future_max, i, 0))
        if phase in {"running", "stopped"} and hidden:
            # Actual bills must still be accepted in the mutant even if its
            # bookkeeping under-reserved. Refusing the bill would hide costs.
            yield event("settle_all_reported", i, hidden), replace(
                state, settled=state.settled + hidden,
                phase=changed(state.phase, i, "done" if future == 0 else phase),
                reserved=changed(state.reserved, i, max(0, hold - hidden)),
                hidden_spent=changed(state.hidden_spent, i, 0))
            if variant == "forget_unreported" and hold > future:
                yield event("MUTANT_keep_only_future", i, hold - future), replace(
                    state, reserved=changed(state.reserved, i, future))
    for amount in range(1, state.closing_remaining + 1):
        yield event("consume_closing_reserve", amount=amount), replace(
            state, settled=state.settled + amount,
            closing_remaining=state.closing_remaining - amount)


def budget_checks(total):
    return {
        "reservation_covers_unsettled_liability": lambda b, e, a:
            all(r >= h + f for r, h, f in zip(a.reserved, a.hidden_spent, a.future_max)),
        "ledger_total_with_closing_within_budget": lambda b, e, a:
            a.settled + sum(a.reserved) + a.closing_remaining <= total,
        "physical_worst_case_within_budget": lambda b, e, a:
            a.settled + sum(a.hidden_spent) + sum(a.future_max) + a.closing_remaining <= total,
        "final_settled_cost_within_budget": lambda b, e, a:
            (any(p in {"running", "stopped"} for p in a.phase)
             or a.closing_remaining != 0 or a.settled <= total),
    }


def replay_budget_example():
    state = Budget(0, 0)
    trace = [{"event": {"op": "initial"}, "state": state_json(state)}]
    commands = [event("reserve_cost", 0, 10), event("spend_unreported", 0, 8),
                event("MUTANT_keep_only_future", 0, 8), event("reserve_cost", 1, 8),
                event("spend_unreported", 0, 2), event("spend_unreported", 1, 8),
                event("settle_all_reported", 0, 10), event("settle_all_reported", 1, 8)]
    for command in commands:
        targets = [after for op, after in budget_steps(state, 10, "forget_unreported", (10, 8))
                   if op == command]
        if len(targets) != 1:
            raise RuntimeError(f"example transition not enabled: {command}")
        state = targets[0]
        trace.append({"event": command, "state": state_json(state)})
    if state.settled != 18 or state.phase != ("done", "done"):
        raise RuntimeError("specified 18 > 10 example was not reproduced")
    # At the same hidden=8, future=2 boundary under the correct rule, the
    # reservation remains ten and no second reservation is admitted.
    conservative = Budget(0, 0, ("running", "idle"), (10, 0), (8, 0), (2, 0))
    rejected = not any(op["op"] == "reserve_cost" and op.get("action") == "B"
                       for op, _ in budget_steps(conservative, 10, "correct"))
    if not rejected:
        raise RuntimeError("conservative example admitted second action")
    return {"bound": 10, "length": len(commands), "trace": trace,
            "minimum_claim": "Explicit required scenario, not a global shortest path claim; general mutant minima come from BFS below.",
            "correct_rule_blocks_second_reservation": rejected}


def check_budget():
    total, closing = 4, 1
    result = {variant: explore(Budget(0, closing),
                              lambda s, v=variant: budget_steps(s, total, v),
                              budget_checks(total))
              for variant in ["correct", "forget_unreported"]}
    if result["correct"]["shortest_counterexamples"]:
        raise RuntimeError("conservative budget model failed")
    if set(result["forget_unreported"]["shortest_counterexamples"]) != set(budget_checks(total)):
        raise RuntimeError("budget mutant did not expose all expected violations")
    return {"exhaustive_bound": total, "closing_initial": closing,
            **result, "required_18_over_10": replay_budget_example()}


# 4. All nine binding fields vary once (0 -> 1). D is a conjunction abstraction
# of all *read* applicability inputs: authority, evidence, time and freshness.
# We expose each invalidating event, but merge their false-D states. This does
# not claim to have enumerated all combinations/values of real clocks or ACLs.
BINDING_FIELDS = ("historyId", "taskId", "specVersion", "witnessId", "resultId",
                  "artifactVersion", "availabilityRevision", "acceptancePolicyVersion", "decisionRevision")


@dataclass(frozen=True)
class Acceptance:
    current: tuple = (0,) * 9
    note_revision: int = 0
    applicability_D_valid: bool = True
    decision_withdrawn: bool = False
    binding: tuple | None = None
    accepted_global_revision: int = -1
    event_oracle_valid: bool = False


def global_revision(state):
    return (sum(state.current) + state.note_revision
            + int(not state.applicability_D_valid) + int(state.decision_withdrawn))


def acceptance_steps(state):
    if state.binding is None and state.applicability_D_valid:
        yield event("accept_current_binding"), replace(
            state, binding=state.current, accepted_global_revision=global_revision(state),
            event_oracle_valid=True)
    for index, name in enumerate(BINDING_FIELDS):
        if state.current[index] == 0:
            yield event("update_binding_field", field=name), replace(
                state, current=changed(state.current, index, 1), event_oracle_valid=False)
    if state.note_revision == 0:
        yield event("update_unrelated_note"), replace(state, note_revision=1)
    if state.applicability_D_valid:
        for reason in ["principal_authority", "evidence_validity", "explicit_clock", "freshness_watermark"]:
            yield event("invalidate_read_input", input=reason), replace(
                state, applicability_D_valid=False, event_oracle_valid=False)
    if state.binding is not None and not state.decision_withdrawn:
        yield event("withdraw_acceptance"), replace(
            state, decision_withdrawn=True, event_oracle_valid=False)


def applicable(state, variant):
    if state.binding is None or not state.applicability_D_valid or state.decision_withdrawn:
        return False
    if variant == "global_revision":
        return state.accepted_global_revision == global_revision(state)
    if variant == "omit_spec_version":
        return all(now == old for i, (now, old) in enumerate(zip(state.current, state.binding)) if i != 2)
    return state.current == state.binding


def check_acceptance():
    # Differential oracles: field comparison vs an event-history invalidation
    # monitor. The latter remembers an accepted decision until a relevant event;
    # it does not compare tuples or global revisions.
    result = explore(Acceptance(), acceptance_steps, {
        variant + "_matches_event_oracle":
            (lambda b, e, a, v=variant: applicable(a, v) == a.event_oracle_valid)
        for variant in ["correct", "global_revision", "omit_spec_version"]
    })
    expected = {"global_revision_matches_event_oracle", "omit_spec_version_matches_event_oracle"}
    if set(result["shortest_counterexamples"]) != expected:
        raise RuntimeError("acceptance checker expectation mismatch")
    return {"binding_fields": BINDING_FIELDS, "D_abstraction": "conjunction, true -> false once",
            "notes_bound": "0 -> 1 once", "acceptances_per_run": 1, **result}


def check_input_snapshots(directory):
    metadata = json.loads((directory / "inputs.json").read_text())
    for row in metadata["inputs"]:
        digest = hashlib.sha256((directory / row["snapshot"]).read_bytes()).hexdigest()
        if digest != row["sha256"]:
            raise RuntimeError(f"specification snapshot hash mismatch: {row['name']}")
    return metadata


def collect_traces(value, path=""):
    if isinstance(value, dict):
        if "trace" in value:
            yield path, value
        for key, child in value.items():
            if key != "trace":
                yield from collect_traces(child, path + "/" + str(key))


def render_traces(results):
    lines = ["# 可重复最短反例轨迹", "",
             "由 model_check.py 自动生成。动作、预算、验收与聚焦支持采用 BFS，轨迹在所列初态与抽象转移粒度下最短。", "",
             "全公式域的两个支持反例按根事实最少添加前缀加一次撤回选择；2/3 步最短性的初态下界见 README。", "",
             "18 > 10 是额外要求场景，经同一转移函数重放；没有声称它是所有超支的全局最短轨迹。", ""]
    for name, entry in collect_traces(results):
        lines += ["## " + name.strip("/"), "", f"长度：{entry.get('length', '?')} 个转移。", ""]
        if "network" in entry:
            lines += ["支持公式：`" + json.dumps(entry["network"], ensure_ascii=False) + "`", ""]
        lines += ["```text"]
        for index, step in enumerate(entry["trace"]):
            lines += [f"{index:02d} {json.dumps(step['event'], ensure_ascii=False, sort_keys=True)}",
                      "   " + json.dumps(step["state"], ensure_ascii=False, sort_keys=True)]
        lines += ["```", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
    metadata = check_input_snapshots(directory)
    output = args.output_dir.resolve() if args.output_dir else directory
    output.mkdir(parents=True, exist_ok=True)
    results = {
        "schema_version": 1,
        "kind": "bounded_specification_model_check_not_product_test",
        "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "inputs": metadata,
        "action_model": check_actions(),
        "support_model": check_support(),
        "budget_model": check_budget(),
        "acceptance_model": check_acceptance(),
        "checks_passed": True,
        "meaning_of_passed": "Correct bounded variants passed stated properties; specified false conjectures and mutants produced counterexamples. Not a general proof or product validation.",
    }
    (output / "results.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
    (output / "TRACES.md").write_text(render_traces(results))
    summary = {
        "actions": {k: {x: v[x] for x in ["states", "transitions", "max_shortest_depth"]}
                    for k, v in results["action_model"].items()},
        "support": {k: v for k, v in results["support_model"].items()
                    if k not in {"shortest_counterexamples", "focused_bfs"}},
        "budget": {k: {x: results["budget_model"][k][x] for x in ["states", "transitions", "max_shortest_depth"]}
                   for k in ["correct", "forget_unreported"]},
        "acceptance": {x: results["acceptance_model"][x] for x in ["states", "transitions", "max_shortest_depth"]},
        "checks_passed": True,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"MODEL CHECK FAILED: {error}", file=sys.stderr)
        raise
