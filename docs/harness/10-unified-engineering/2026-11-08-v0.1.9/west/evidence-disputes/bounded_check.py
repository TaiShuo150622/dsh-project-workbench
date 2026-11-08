"""W11 independent evidence projection model; NOT Record/product code.

Identity/admissibility/root lineage are synthetic inputs. No authentication,
world-truth oracle, action permission, probability, or general logic engine.
"""
from dataclasses import dataclass, replace, asdict
from itertools import product, permutations
from pathlib import Path
import hashlib
import json


@dataclass(frozen=True)
class Key:
    history: str = "h1"
    subject: str = "artifact:demo"
    predicate: str = "check-passed"
    version: str = "v1"
    consumer: str = "alice"
    purpose: str = "review"


@dataclass(frozen=True)
class Observation:
    oid: str
    issuer: str
    key: Key
    polarity: str
    root: str
    authenticated: bool = True
    admitted: bool = True
    observed_at: int = 0


LABELS = {(False, False): "NEITHER", (True, False): "SUPPORT_ONLY",
          (False, True): "OPPOSE_ONLY", (True, True): "BOTH"}


class Model:
    def __init__(self):
        self.observations = {}
        self.retired = set()
        self.events = []

    def _validate_observation(self, observation):
        assert observation.polarity in ("+", "-")
        assert observation.oid.startswith(observation.issuer + ":")
        previous = self.observations.get(observation.oid)
        if previous is not None and previous != observation:
            raise ValueError("observation identity reused for different content")

    def add(self, observation):
        self._validate_observation(observation)
        self.observations[observation.oid] = observation
        self.events.append(("observe", observation.oid))

    def withdraw(self, actor, target):
        # Synthetic namespace authority. Not an implementation of authentication.
        if not target.startswith(actor + ":"):
            raise ValueError("withdrawal outside synthetic issuer namespace")
        self.retired.add(target)  # Retains a tombstone even before observation arrival.
        self.events.append(("withdraw", target))

    def correct(self, actor, old, new):
        # Validate all conditions before changing either part of the projection.
        if not old.startswith(actor + ":") or new.issuer != actor or new.oid == old:
            raise ValueError("invalid correction scope")
        self._validate_observation(new)
        self.retired.add(old)
        self.observations[new.oid] = new
        self.events.append(("correct", old, new.oid))

    def view(self, key):
        relevant = [o for o in self.observations.values()
                    if o.key == key and o.oid not in self.retired
                    and o.authenticated and o.admitted]
        positive = sorted({o.root for o in relevant if o.polarity == "+"})
        negative = sorted({o.root for o in relevant if o.polarity == "-"})
        return {"state": LABELS[bool(positive), bool(negative)],
                "support_roots": positive, "oppose_roots": negative,
                "independence": "UNDETERMINED", "action_permission": "NOT_COMPUTED"}



def candidate_policy(model, key, operation, binding, coverage="complete"):
    """One explicitly proposed application policy, never an execution permit.

    read/search concern evidence access or investigation, not publication.
    Every decision is bound to operation, exact model claim key, policy version
    and event watermark. Authority and obligations outside this model remain
    unchecked; READY_FOR_AUTH_CHECK is not authorization.
    """
    base = {"action_permission": "NOT_COMPUTED", "fact_truth": "NOT_COMPUTED"}
    expected = {"operation": operation, "claim_key": asdict(key),
                "policy_version": "demo-conservative-v1", "watermark": len(model.events)}
    if binding != expected:
        return dict(base, readiness="UNKNOWN", reason="STALE_OR_WRONG_SCOPE")
    if operation in ("view", "seek_evidence"):
        return dict(base, readiness="READY_FOR_AUTH_CHECK", reason="INVESTIGATION_NOT_ENDORSEMENT")
    if operation != "publish":
        return dict(base, readiness="UNKNOWN", reason="UNDEFINED_OPERATION_POLICY")
    if coverage != "complete":
        return dict(base, readiness="UNKNOWN", reason="INCOMPLETE_EVIDENCE_COVERAGE")
    state = model.view(key)["state"]
    if state == "SUPPORT_ONLY":
        return dict(base, readiness="READY_FOR_AUTH_CHECK", reason="CANDIDATE_EVIDENCE_GATE_ONLY")
    return dict(base, readiness="UNKNOWN", reason={
        "BOTH": "UNRESOLVED_CONFLICT", "NEITHER": "NO_APPLICABLE_SUPPORT",
        "OPPOSE_ONLY": "COUNTEREVIDENCE_REQUIRES_REVIEW"}[state])

def main():
    key = Key()
    p = Observation("a:1", "a", key, "+", "origin:1")
    n = Observation("b:1", "b", key, "-", "origin:2")
    duplicate_root = Observation("c:1", "c", key, "+", "origin:1")
    old = Observation("d:1", "d", replace(key, version="v0"), "+", "origin:3")
    named = []

    def record(name, actual, expected, note):
        assert actual == expected, (name, actual, expected)
        named.append({"id": name, "actual": actual, "expected": expected, "note": note})

    model = Model(); model.add(p); model.add(n)
    record("C01_same_key_conflict", model.view(key)["state"], "BOTH",
           "Authenticated/admitted observations can still conflict; no world truth inferred.")
    model = Model(); model.add(n); model.add(old)
    record("C02_late_old_version", model.view(key)["state"], "OPPOSE_ONLY",
           "Receipt order does not replace scoped version identity.")
    model = Model(); model.add(p); model.withdraw("a", p.oid)
    record("C03_withdraw_is_not_negation", model.view(key)["state"], "NEITHER",
           "Source withdrawal removes support without fabricating opposition.")
    second = Observation("d:2", "d", key, "+", "origin:4")
    model.add(second)
    record("C04_alternative_survives", model.view(key)["state"], "SUPPORT_ONLY",
           "Separate root remains; no statistical independence is asserted.")
    model = Model(); model.add(p); model.add(p); model.add(duplicate_root)
    record("C05_same_root_not_three_sources", len(model.view(key)["support_roots"]), 1,
           "Duplicate receptions and wrappers do not multiply canonical origin roots.")
    record("C06_independence_unknown", model.view(key)["independence"], "UNDETERMINED",
           "Deduplication does not establish independence.")
    corrected = replace(p, oid="a:2", polarity="-", root="origin:5")
    model = Model(); model.add(p); model.correct("a", p.oid, corrected)
    record("C07_explicit_correction", model.view(key)["state"], "OPPOSE_ONLY",
           "One correction retires a specified assertion and records a new assertion.")
    record("C08_history_kept", p.oid in model.observations and len(model.events) == 2, True,
           "Correction does not delete the original statement.")
    before = (dict(model.observations), set(model.retired), list(model.events))
    try:
        model.correct("b", corrected.oid, replace(corrected, oid="b:2", issuer="b"))
        raise AssertionError("invalid correction unexpectedly accepted")
    except ValueError:
        pass
    record("C09_invalid_correction_atomic", before == (model.observations, model.retired, model.events), True,
           "Only synthetic namespace control checked, not real credentials.")
    for order in ("withdraw-first", "observe-first"):
        model = Model()
        if order == "withdraw-first": model.withdraw("a", p.oid); model.add(p)
        else: model.add(p); model.withdraw("a", p.oid)
        record("C10_" + order, model.view(key)["state"], "NEITHER",
               "Late original statement cannot revive a retained withdrawal reference.")
    model = Model(); model.add(p); model.add(n)
    record("C11_no_explosion", model.view(replace(key, predicate="published"))["state"], "NEITHER",
           "This model has no inference rule from a contradiction to an unrelated atom.")
    model = Model(); model.add(replace(p, authenticated=False)); model.add(replace(n, admitted=False))
    record("C12_unqualified_sources", model.view(key)["state"], "NEITHER",
           "Identity/admissibility are supplied synthetic inputs; no checker implemented.")
    model = Model(); model.add(p)
    record("C13_support_does_not_grant_action", model.view(key)["action_permission"], "NOT_COMPUTED",
           "Four-state projection deliberately makes no action decision.")

    # 3^4 bounded absence/active/withdrawn assignments; direct set specification
    # is compared with folding operations, including old-version/duplicate-root inputs.
    observations = (p, n, duplicate_root, old)
    assignment_count = 0
    for states in product(range(3), repeat=4):
        model = Model()
        for observation, state in zip(observations, states):
            if state: model.add(observation)
            if state == 2: model.withdraw(observation.issuer, observation.oid)
        expected_p = {o.root for o, state in zip(observations, states)
                      if state == 1 and o.key == key and o.polarity == "+"}
        expected_n = {o.root for o, state in zip(observations, states)
                      if state == 1 and o.key == key and o.polarity == "-"}
        assert model.view(key)["state"] == LABELS[bool(expected_p), bool(expected_n)]
        assert model.view(key)["support_roots"] == sorted(expected_p)
        assert model.view(key)["oppose_roots"] == sorted(expected_n)
        assignment_count += 1

    order_count = 0
    for order in permutations(observations):
        model = Model()
        for observation in order: model.add(observation)
        assert model.view(key)["state"] == "BOTH"
        order_count += 1

    keys = [replace(key, predicate=pred, version=version, consumer=consumer, purpose=purpose)
            for pred, version, consumer, purpose in product(
                ("check-passed", "published"), ("v1", "v2"),
                ("alice", "bob"), ("review", "delivery"))]
    isolation_count = 0
    for changed, untouched in permutations(keys, 2):
        model = Model(); model.add(replace(p, key=changed)); model.add(replace(n, key=changed))
        assert model.view(changed)["state"] == "BOTH"
        assert model.view(untouched)["state"] == "NEITHER"
        isolation_count += 1

    # Explicit candidate application policy: operation/version/watermark scoped.
    policy_checks = []
    def policy_binding(m, k, operation):
        return {"operation": operation, "claim_key": asdict(k),
                "policy_version": "demo-conservative-v1", "watermark": len(m.events)}
    def check_policy(label, actual, expected):
        assert actual["readiness"] == expected, (label, actual, expected)
        assert actual["action_permission"] == "NOT_COMPUTED"
        assert actual["fact_truth"] == "NOT_COMPUTED"
        policy_checks.append({"id": label, "actual": actual, "expected_readiness": expected})
    for with_p, with_n in product((False, True), repeat=2):
        m = Model()
        if with_p: m.add(p)
        if with_n: m.add(n)
        for operation in ("view", "seek_evidence", "publish"):
            expected = "READY_FOR_AUTH_CHECK" if operation != "publish" or (with_p and not with_n) else "UNKNOWN"
            check_policy(m.view(key)["state"] + ":" + operation,
                         candidate_policy(m, key, operation, policy_binding(m, key, operation)), expected)
    m = Model(); m.add(p)
    b = policy_binding(m, key, "publish")
    check_policy("object_version_changed", candidate_policy(m, replace(key, version="v2"), "publish", b), "UNKNOWN")
    check_policy("operation_changed", candidate_policy(m, key, "view", b), "UNKNOWN")
    check_policy("policy_version_changed", candidate_policy(m, key, "publish", dict(b, policy_version="old-policy")), "UNKNOWN")
    check_policy("coverage_unknown", candidate_policy(m, key, "publish", b, coverage="unknown"), "UNKNOWN")
    m.add(n)
    check_policy("counterevidence_invalidates_cached_assessment", candidate_policy(m, key, "publish", b), "UNKNOWN")
    check_policy("fresh_conflict_assessment_is_still_unknown", candidate_policy(m, key, "publish", policy_binding(m, key, "publish")), "UNKNOWN")

    # Intentionally wrong illustrative policies, not claims about product code.
    def latest_received(items):
        last = items[-1]
        return LABELS[last.polarity == "+", last.polarity == "-"]

    retracted = Model(); retracted.add(p); retracted.withdraw("a", p.oid)
    negative_from_absence = LABELS[False, not bool(retracted.view(key)["support_roots"])]
    counterexamples = [
        {"policy": "latest_received_wins", "trace": [p.oid, n.oid],
         "wrong": latest_received([p, n]), "reference": "BOTH"},
        {"policy": "absence_of_support_means_negative", "trace": [p.oid, "withdraw " + p.oid],
         "wrong": negative_from_absence, "reference": retracted.view(key)["state"]},
        {"policy": "ignore_version_and_latest_wins", "trace": [n.oid, old.oid],
         "wrong": latest_received([n, old]), "reference": "OPPOSE_ONLY"},
        {"policy": "count_wrapper_rows_as_independent", "trace": [p.oid, p.oid, duplicate_root.oid],
         "wrong_independent_count": len([p, p, duplicate_root]),
         "canonical_positive_roots": len({o.root for o in [p, p, duplicate_root]}),
         "reference_independence": "UNDETERMINED"},
    ]
    conflict = Model(); conflict.add(p); conflict.add(n)
    wrong_positive_only_release = bool(conflict.view(key)["support_roots"])
    safe_candidate = candidate_policy(conflict, key, "publish", policy_binding(conflict, key, "publish"))
    counterexamples.append({"policy": "supported_boolean_releases_publication",
        "trace": [p.oid, n.oid], "wrong_release": wrong_positive_only_release,
        "candidate_readiness": safe_candidate["readiness"],
        "action_permission": safe_candidate["action_permission"],
        "note": "Illustrative app policy counterexample; not a truth-value theorem or existing product defect."})
    assert wrong_positive_only_release and safe_candidate["readiness"] == "UNKNOWN"
    assert all(c["wrong"] != c["reference"] for c in counterexamples[:3])
    assert counterexamples[3]["wrong_independent_count"] != counterexamples[3]["canonical_positive_roots"]
    result = {"status": "PASS", "scope": "INDEPENDENT_BOUNDED_RESEARCH_MODEL",
              "model_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "counts": {"named_checks": len(named), "four_observation_assignments": assignment_count,
                         "arrival_permutations": order_count, "claim_keys": len(keys),
                         "ordered_key_isolation_pairs": isolation_count,
                         "illustrative_bad_policy_counterexamples": len(counterexamples),
                         "candidate_operation_policy_checks": len(policy_checks)},
              "named_checks": named, "policy_checks": policy_checks, "counterexamples": counterexamples,
              "limits": ["Not Record S1, not a product test, not a general proof.",
                         "Synthetic authority, admissibility and canonical root lineage.",
                         "No global truth oracle, statistical independence or probability.",
                         "No arbitrary support formulas, recursion, execution permission or ACL implementation.",
                         "Candidate operation policy assumes synthetic coverage; not a universal policy or shipped behavior.",
                         "Only the enumerated bounded inputs and named traces were run."]}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
