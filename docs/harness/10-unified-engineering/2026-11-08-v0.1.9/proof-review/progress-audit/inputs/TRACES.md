# C-08 可打印最短反例

前缀后重复 cycle 构成无限行为；Halt 表示已经停止的失败端点。长度按显式事件数计，初态为零步。

## C08-M01-zero-cost-loop

状态 2；显式边 2；fairness `[]`。

prefix:
```text
(empty)
```
cycle:
```text
{"phase": "run", "spent": 0} --QuerySame--> {"phase": "run", "spent": 0}
```
B=1. Every state has spent<=1; QuerySame has zero model cost. Does not assert real queries are free.

## C08-M02-fair-deliver

状态 2；显式边 2；fairness `[{"name": "delivery", "mode": "WF", "actions": ["Deliver"]}]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

Fairness on the continuously enabled productive action excludes M01; no time bound follows.

## C08-M03-busy-is-not-progress

状态 4；显式边 4；fairness `[{"name": "any_work", "mode": "WF", "actions": ["Background", "Discharge"]}]`。

prefix:
```text
(empty)
```
cycle:
```text
{"pending": true, "heartbeat": 0} --Background--> {"pending": true, "heartbeat": 1}
{"pending": true, "heartbeat": 1} --Background--> {"pending": true, "heartbeat": 0}
```
Background performs real state changes. Aggregate work fairness does not discharge the pending obligation.

## C08-M04-intermittent-WF

状态 3；显式边 3；fairness `[{"name": "discharge", "mode": "WF", "actions": ["Discharge"]}]`。

prefix:
```text
(empty)
```
cycle:
```text
{"available": true, "done": false} --CloseWindow--> {"available": false, "done": false}
{"available": false, "done": false} --OpenWindow--> {"available": true, "done": false}
```


## C08-M05-intermittent-SF

状态 3；显式边 3；fairness `[{"name": "discharge", "mode": "SF", "actions": ["Discharge"]}]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

Environment alternates availability in this graph; SF is an extra premise, not an implemented scheduler property.

## C08-M06-unavailable-even-SF

状态 1；显式边 1；fairness `[{"name": "resolution", "mode": "SF", "actions": ["Resolve"]}]`。

prefix:
```text
(empty)
```
cycle:
```text
{"effect": "unknown"} --PollUnknown--> {"effect": "unknown"}
```
Resolve is never enabled; its SF is vacuous. No duplicate external send is allowed by this graph.

## C08-M07-fixed-goal

状态 3；显式边 2；fairness `[{"name": "production", "mode": "WF", "actions": ["Produce"]}, {"name": "acceptance", "mode": "WF", "actions": ["Accept"]}]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

revision_parity is a quotient of an ever-increasing revision counter, not permission to reuse old version identities. ReviseGoal resets current evidence; the loop lifts by incrementing the real counter.

## C08-M07-changing-goal

状态 6；显式边 8；fairness `[{"name": "production", "mode": "WF", "actions": ["Produce"]}, {"name": "acceptance", "mode": "WF", "actions": ["Accept"]}]`。

prefix:
```text
(empty)
```
cycle:
```text
{"revision_parity": 0, "produced": false, "accepted": false} --ReviseGoal--> {"revision_parity": 1, "produced": false, "accepted": false}
{"revision_parity": 1, "produced": false, "accepted": false} --Produce--> {"revision_parity": 1, "produced": true, "accepted": false}
{"revision_parity": 1, "produced": true, "accepted": false} --ReviseGoal--> {"revision_parity": 0, "produced": false, "accepted": false}
```
revision_parity is a quotient of an ever-increasing revision counter, not permission to reuse old version identities. ReviseGoal resets current evidence; the loop lifts by incrementing the real counter.

## C08-M08-bounded-controller

状态 28；显式边 57；fairness `[]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

Two obligations with two fixed stages each, one acceptance stage, K=2 auxiliary steps. Successful stage completion is assumed, not established for arbitrary Coding work.

## C08-M08-query-cap-mutant

状态 10；显式边 22；fairness `[]`。

prefix:
```text
(empty)
```
cycle:
```text
{"stageA": 2, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"} --QuerySame--> {"stageA": 2, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"}
```
Two obligations with two fixed stages each, one acceptance stage, K=2 auxiliary steps. Successful stage completion is assumed, not established for arbitrary Coding work.

## C08-M09-stopped-is-not-accepted

状态 29；显式边 60；fairness `[]`。

prefix:
```text
{"stageA": 2, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"} --AdvanceA--> {"stageA": 1, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"}
{"stageA": 1, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"} --AdvanceA--> {"stageA": 0, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"}
{"stageA": 0, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"} --AdvanceB--> {"stageA": 0, "stageB": 1, "auxiliaryLeft": 2, "outcome": "running"}
{"stageA": 0, "stageB": 1, "auxiliaryLeft": 2, "outcome": "running"} --AdvanceB--> {"stageA": 0, "stageB": 0, "auxiliaryLeft": 2, "outcome": "running"}
{"stageA": 0, "stageB": 0, "auxiliaryLeft": 2, "outcome": "running"} --Reject--> {"stageA": 0, "stageB": 0, "auxiliaryLeft": 2, "outcome": "rejected"}
```
cycle:
```text
{"stageA": 0, "stageB": 0, "auxiliaryLeft": 2, "outcome": "rejected"} --Halt--> {"stageA": 0, "stageB": 0, "auxiliaryLeft": 2, "outcome": "rejected"}
```
最短 bad 前缀：
```text
AdvanceA -> {"stageA": 1, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"}
AdvanceA -> {"stageA": 0, "stageB": 2, "auxiliaryLeft": 2, "outcome": "running"}
AdvanceB -> {"stageA": 0, "stageB": 1, "auxiliaryLeft": 2, "outcome": "running"}
AdvanceB -> {"stageA": 0, "stageB": 0, "auxiliaryLeft": 2, "outcome": "running"}
Reject -> {"stageA": 0, "stageB": 0, "auxiliaryLeft": 2, "outcome": "rejected"}
```

All actual controller paths terminate; the lasso ends in analysis-only Halt at a rejected terminal state.

## C08-M10-ack-transfer

状态 5；显式边 5；fairness `[{"name": "recipient_acceptance", "mode": "WF", "actions": ["AcceptResponsibility"]}]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

Packet binds an unresolved effect; acknowledgement transfers responsibility but does not resolve that effect. Willing/authorized receiver is an explicit environment premise.

## C08-M10-offer-transfer-mutant

状态 5；显式边 5；fairness `[{"name": "recipient_acceptance", "mode": "WF", "actions": ["AcceptResponsibility"]}]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

最短 bad 前缀：
```text
Offer -> {"packet": true, "ack": false, "localStopped": false, "owner": "receiver", "unknown": true}
```

Packet binds an unresolved effect; acknowledgement transfers responsibility but does not resolve that effect. Willing/authorized receiver is an explicit environment premise.

## C08-M11-local-stop-is-not-handoff

状态 5；显式边 5；fairness `[{"name": "recipient_acceptance", "mode": "WF", "actions": ["AcceptResponsibility"]}]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

最短 bad 前缀：
```text
Offer -> {"packet": true, "ack": false, "localStopped": false, "owner": "sender", "unknown": true}
LocalStop -> {"packet": true, "ack": false, "localStopped": true, "owner": "sender", "unknown": true}
```



## C08-M12-fair-but-late

状态 15；显式边 22；fairness `[{"name": "time", "mode": "WF", "actions": ["Tick"]}, {"name": "prepare", "mode": "WF", "actions": ["Prepare"]}, {"name": "receiver", "mode": "WF", "actions": ["Ack"]}]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

最短 bad 前缀：
```text
Tick -> {"clock": 1, "phase": "run"}
Tick -> {"clock": 2, "phase": "run"}
Tick -> {"clock": 3, "phase": "run"}
```

Every fair behavior eventually receives, but deadline D=3 is not guaranteed. Any bad finite prefix can extend by Prepare/Ack and then stop fairly.

## C08-M13-bounded-deadline

状态 6；显式边 5；fairness `[]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

D=3, cutoff=1; each transition consumes one discrete time unit. Prepare and recipient Ack take <=1 unit each only in the conservative case. Unknown remains true after receipt.

## C08-M13-receiver-delay-mutant

状态 9；显式边 9；fairness `[]`。

prefix:
```text
{"clock": 0, "phase": "run", "unknown": true} --Work--> {"clock": 1, "phase": "run", "unknown": true}
{"clock": 1, "phase": "run", "unknown": true} --Prepare--> {"clock": 2, "phase": "offered", "unknown": true}
{"clock": 2, "phase": "offered", "unknown": true} --DelayAck--> {"clock": 3, "phase": "offered", "unknown": true}
{"clock": 3, "phase": "offered", "unknown": true} --DelayAck--> {"clock": 4, "phase": "offered", "unknown": true}
```
cycle:
```text
{"clock": 4, "phase": "offered", "unknown": true} --Halt--> {"clock": 4, "phase": "offered", "unknown": true}
```
最短 bad 前缀：
```text
Work -> {"clock": 1, "phase": "run", "unknown": true}
Prepare -> {"clock": 2, "phase": "offered", "unknown": true}
DelayAck -> {"clock": 3, "phase": "offered", "unknown": true}
```

D=3, cutoff=1; each transition consumes one discrete time unit. Prepare and recipient Ack take <=1 unit each only in the conservative case. Unknown remains true after receipt.

## C08-M14-service-missed

状态 14；显式边 13；fairness `[]`。

prefix:
```text
{"clock": 0, "completedMask": 0, "stopped": false} --TimePasses--> {"clock": 1, "completedMask": 0, "stopped": false}
{"clock": 1, "completedMask": 0, "stopped": false} --ObserveDue0--> {"clock": 2, "completedMask": 1, "stopped": false}
{"clock": 2, "completedMask": 1, "stopped": false} --TimePasses--> {"clock": 3, "completedMask": 1, "stopped": false}
{"clock": 3, "completedMask": 1, "stopped": false} --TimePasses--> {"clock": 4, "completedMask": 1, "stopped": false}
{"clock": 4, "completedMask": 1, "stopped": false} --CloseWindow--> {"clock": 4, "completedMask": 1, "stopped": true}
```
cycle:
```text
{"clock": 4, "completedMask": 1, "stopped": true} --Halt--> {"clock": 4, "completedMask": 1, "stopped": true}
```
最短 bad 前缀：
```text
TimePasses -> {"clock": 1, "completedMask": 0, "stopped": false}
ObserveDue0 -> {"clock": 2, "completedMask": 1, "stopped": false}
TimePasses -> {"clock": 3, "completedMask": 1, "stopped": false}
TimePasses -> {"clock": 4, "completedMask": 1, "stopped": false}
CloseWindow -> {"clock": 4, "completedMask": 1, "stopped": true}
```

Finite window [0,4], two due observations in slots 1 and 3. An observation can report no change and still discharge its due obligation. Closing is not retrospective coverage.

## C08-M14-service-scheduled

状态 6；显式边 5；fairness `[]`。

本图在所列 fairness 下没有避开目标的公平循环或失败死端。

Finite window [0,4], two due observations in slots 1 and 3. An observation can report no change and still discharge its due obligation. Closing is not retrospective coverage.

## C08-M15-finite-queue-open-closure

状态 2；显式边 2；fairness `[{"name": "complete_current", "mode": "WF", "actions": ["DischargeAndAdmitNext"]}]`。

prefix:
```text
(empty)
```
cycle:
```text
{"current_id_parity": 0, "pending": 1} --DischargeAndAdmitNext--> {"current_id_parity": 1, "pending": 1}
{"current_id_parity": 1, "pending": 1} --DischargeAndAdmitNext--> {"current_id_parity": 0, "pending": 1}
```
Each step completes the current obligation and admits a distinct new one under the same goal. Queue size is always one; the obligation universe is unbounded. Parity quotient lifts to successive fresh natural-number IDs, never ID reuse.

## C08-M16-fair-attempts-can-all-fail

状态 4；显式边 4；fairness `[{"name": "attempt", "mode": "WF", "actions": ["AttemptFails", "AttemptPasses"]}]`。

prefix:
```text
(empty)
```
cycle:
```text
{"attempt_parity": 0, "passed": false} --AttemptFails--> {"attempt_parity": 1, "passed": false}
{"attempt_parity": 1, "passed": false} --AttemptFails--> {"attempt_parity": 0, "passed": false}
```
A productive option exists, and attempts run fairly, but outcome choice can always fail. Scheduling fairness is not an assumption of favorable external outcomes.

