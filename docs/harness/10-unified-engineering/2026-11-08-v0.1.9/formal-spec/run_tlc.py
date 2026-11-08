#!/usr/bin/env python3
"""Run finite TLC configurations, preserving expected counterexample logs."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent
CASES = {
    "combined": None,
    "fence-only": "NoDuplicateEffect",
    "dedupe-only": "NoStaleCommit",
    "unstable-key": "NoDuplicateEffect",
    "cancel-is-not-rollback": "NoCommitAfterLocalCancel",
    "world-is-not-ledger": "WorldEffectAlwaysKnown",
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--jar", required=True, type=pathlib.Path)
    parser.add_argument("--output-dir", type=pathlib.Path, default=HERE / "results")
    args = parser.parse_args()
    jar = args.jar.resolve()
    out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    report = {
        "started_at": datetime.now(timezone.utc).isoformat(),
        "tool_jar_sha256": digest(jar),
        "model_sha256": digest(HERE / "EffectContract.tla"),
        "runner_sha256": digest(pathlib.Path(__file__)),
        "scope": "Finite MaxSends=3, two epochs, one immutable logical action; no liveness claim",
        "cases": [],
    }
    for name, violated in CASES.items():
        cfg = HERE / (name + ".cfg")
        with tempfile.TemporaryDirectory(prefix="harness-tlc-") as meta:
            command = ["java", "-Xmx512m", "-cp", str(jar), "tlc2.TLC", "-workers", "1", "-config", str(cfg), "-metadir", meta, "-cleanup", str(HERE / "EffectContract.tla")]
            run = subprocess.run(command, cwd=HERE, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60)
        log = out / (name + ".log")
        log.write_text(run.stdout, encoding="utf-8")
        found = re.findall(r"Invariant (\w+) is violated", run.stdout)
        success = (
            run.returncode == 0 and "Model checking completed. No error has been found." in run.stdout
            if violated is None
            else run.returncode != 0 and found == [violated] and "The behavior up to this point is:" in run.stdout
        )
        counts = re.search(r"([\d,]+) states generated, ([\d,]+) distinct states found, ([\d,]+) states left on queue", run.stdout)
        states = dict(zip(("generated", "distinct", "queue_remaining"), [int(x.replace(",", "")) for x in counts.groups()])) if counts else None
        row = {
            "config": name, "config_sha256": digest(cfg), "exit_code": run.returncode,
            "expected_violation": violated, "observed_violations": found,
            "expectation_matched": success, "counts": states,
            "trace_states": len(re.findall(r"^State \d+:", run.stdout, re.M)),
            "log": log.name, "log_sha256": digest(log),
            "complete_exploration": violated is None and success,
        }
        report["cases"].append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
    report["completed_at"] = datetime.now(timezone.utc).isoformat()
    report["all_expectations_matched"] = all(row["expectation_matched"] for row in report["cases"])
    (out / "receipt.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return 0 if report["all_expectations_matched"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
