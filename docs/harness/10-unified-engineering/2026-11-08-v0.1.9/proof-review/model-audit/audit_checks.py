"""Local review checks; no product, network, or model API access."""
import hashlib
import importlib.util
import itertools
import json
from pathlib import Path
import sys
import time

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("reviewed_model", ROOT / "inputs/python/model_check.py")
model = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = model
spec.loader.exec_module(model)


def independent_formula_value(formula, bits):
    # Encode each AND clause as required set bits; OR is existence of a match.
    # Does not call either reviewed evaluator or fixed-point implementation.
    for clause in formula:
        required = sum(1 << atom for atom in clause)
        if bits & required == required:
            return True
    return False


def independent_lfp(network, bases):
    base_bits = sum((1 << i) for i, value in enumerate(bases) if value)
    fixed = []
    for value in range(4):
        full_bits = base_bits | (value << 3)
        result = sum((1 << i) for i, formula in enumerate(network)
                     if independent_formula_value(formula, full_bits))
        if result == value:
            fixed.append(value)
    minimum = [value for value in fixed if all(value & other == value for other in fixed)]
    assert len(minimum) == 1
    return tuple(bool(minimum[0] & (1 << i)) for i in range(2))


started = time.monotonic()
clauses = list(itertools.combinations(range(5), 1)) + list(itertools.combinations(range(5), 2))
formulas = [()] + [(clause,) for clause in clauses] + list(itertools.combinations(clauses, 2))
truth_cases = 0
for formula in formulas:
    for bits in range(32):
        atoms = tuple(bool(bits & (1 << i)) for i in range(5))
        assert model.formula_value(formula, atoms) == independent_formula_value(formula, bits)
        truth_cases += 1

fixed_point_cases = 0
for network in itertools.product(formulas, repeat=2):
    for bases in itertools.product((False, True), repeat=3):
        expected = independent_lfp(network, bases)
        assert model.least_fixed_point_oracle(network, bases) == expected
        fixed_point_cases += 1

original = json.loads((ROOT / "inputs/python/results.json").read_text())
rerun = json.loads((ROOT / "rerun/results.json").read_text())
assert original == rerun
graphs = list(original["action_model"].values()) + list(original["support_model"]["focused_bfs"].values())
graphs += [original["budget_model"][name] for name in ("correct", "forget_unreported")]
graphs += [original["acceptance_model"]]
for graph in graphs:
    assert sum(graph["depth_histogram"].values()) == graph["states"]
    assert sum(graph["transition_coverage"].values()) == graph["transitions"]
    assert max(map(int, graph["depth_histogram"])) == graph["max_shortest_depth"]
    for witness in graph["shortest_counterexamples"].values():
        assert len(witness["trace"]) - 1 == witness["length"]

# With a stored acceptance, each binding/current coordinate has three states;
# accepted/current note also has three states, and D/withdrawal have two each.
# Without acceptance: 2^9 current bindings, two notes, two D states.
acceptance_state_count = 3 ** 9 * 3 * 2 * 2 + 2 ** 9 * 2 * 2
assert original["acceptance_model"]["states"] == acceptance_state_count

# A deliberately wrong AND interpreter is installed only in this process.
# Both reviewed fixed-point algorithms share it. Probe the full support check.
saved_evaluator = model.formula_value
model.formula_value = lambda formula, atoms: any(any(atoms[index] for index in clause) for clause in formula)
mutation_probe = {"mutation": "interpret each AND clause as OR; do not alter either fixed-point solver"}
try:
    mutation_probe["minimal_semantic_error"] = {
        "formula": "a AND b", "atoms": [True, False, False, False, False],
        "expected": False, "mutated": model.formula_value(((0, 1),), (True, False, False, False, False))
    }
    mutation_result = model.check_support()
    mutation_probe["check_support_returned_without_error"] = True
    mutation_probe["networks"] = mutation_result["networks"]
    mutation_probe["stale_seed_failing_transitions"] = mutation_result["stale_seed_failing_transitions"]
    mutation_probe["clear_all_descendants_failing_transitions"] = mutation_result["clear_all_descendants_failing_transitions"]
finally:
    model.formula_value = saved_evaluator

report = {
    "review_type": "model_authored_independent_local_checks",
    "source_script_sha256": hashlib.sha256((ROOT / "inputs/python/model_check.py").read_bytes()).hexdigest(),
    "audit_script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    "formula_truth_table_cases": truth_cases,
    "independently_evaluated_fixed_point_cases": fixed_point_cases,
    "count_consistency_graphs": len(graphs),
    "independent_acceptance_state_count": acceptance_state_count,
    "rerun_json_equal": True,
    "common_mode_mutation_probe": mutation_probe,
    "elapsed_seconds": time.monotonic() - started,
    "meaning": "Original formula semantics matched independent bitmask evaluation in the stated finite domain. The mutation probe demonstrates the shared semantic dependency of the original oracles; it does not assert a bug in the frozen correct evaluator."
}
(ROOT / "audit_checks.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
