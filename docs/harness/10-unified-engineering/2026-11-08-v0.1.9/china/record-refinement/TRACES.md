# R-04 实际运行的短轨迹

输入为冻结 7264be1 的源码副本；只有同步内存调用。`COUNTEREXAMPLE_REPRODUCED` 否定每项所引的更强映射，不表示发现了对 S1 已声明范围的违约。没有运行真实适配器 C01–C16。

## RF01 · An attempt created under v1 can reserve and dispatch the v2 scope

- 类别：`refinement_gap`
- 检查的说法：Every S1 attempt is bound to its creation specVersion and a successor retires its write authority.
- 实际结果：`COUNTEREXAMPLE_REPRODUCED`

1. create v1 and begin A1

```json
{
  "taskId": "task:1",
  "specVersion": 1,
  "attempt": {
    "id": "attempt:2",
    "host": "dsh",
    "sessionId": "session-a",
    "actorId": "session-a"
  }
}
```

2. revise to v2 and begin A2

```json
{
  "specVersion": 2,
  "newAttempt": "attempt:4"
}
```

3. A1 uses current revision to reserve and dispatch

```json
{
  "id": "action:5",
  "taskId": "task:1",
  "attemptId": "attempt:2",
  "actorId": "session-a",
  "spec": {
    "kind": "pull_request_merge",
    "repositoryId": "repo-1",
    "pullRequestId": "pr-1",
    "targetRef": "refs/heads/pilot",
    "sourceSha": "4444444444444444444444444444444444444444",
    "mergeMethod": "merge"
  },
  "specVersion": 2,
  "authorizationRevision": 2,
  "status": "sent"
}
```

## RF02 · A command routed to another history can mutate its colliding local task ID

- 类别：`refinement_gap`
- 检查的说法：Every S1 command independently rejects a different history incarnation.
- 实际结果：`COUNTEREXAMPLE_REPRODUCED`

1. independent histories collide on local ID and revision

```json
{
  "oldStream": "project:old",
  "freshStream": "project:fresh",
  "taskId": "task:1",
  "oldSource": "old-assignment",
  "freshSource": "fresh-assignment",
  "command": {
    "type": "cancel",
    "payload": {
      "reason": "cancel the old assignment only"
    },
    "actor": {
      "kind": "user",
      "id": "owner"
    },
    "requestId": "request:2",
    "taskId": "task:1",
    "expectedRevision": 1
  }
}
```

2. route the unmodified old command into the fresh kernel

```json
{
  "receipt": {
    "streamId": "project:fresh",
    "cursor": 2,
    "requestId": "request:2",
    "taskId": "task:1",
    "revision": 2
  },
  "freshStatus": "cancelled",
  "oldStatus": "open"
}
```

3. control: cross-history acceptance token

```json
{
  "rejected": "ACCEPTANCE_CONFLICT"
}
```

## RF03 · A repeated same-result observation does not become an alternative support witness

- 类别：`refinement_gap`
- 检查的说法：S1 completion withdrawal implements general OR-support preservation.
- 实际结果：`COUNTEREXAMPLE_REPRODUCED`

1. accept two same-result observations

```json
{
  "completionCount": 1,
  "retainedWitness": "observer:first",
  "journalObservationRefs": [
    "observer:first",
    "observer:independent-second"
  ]
}
```

2. withdraw the one current completion

```json
{
  "supported": false,
  "status": "disputed",
  "completionCount": 1,
  "secondObservationRemainsInJournal": true
}
```

## RF04 · New-action precheck is not the dispatch guard for an existing reservation

- 类别：`refinement_gap`
- 检查的说法：checkAction is the same admissibility predicate as dispatchAction for a reserved action.
- 实际结果：`COUNTEREXAMPLE_REPRODUCED`

1. query checkAction after own reservation

```json
{
  "actionId": "action:3",
  "decision": {
    "decision": "wait",
    "reason": "action-unresolved",
    "actionId": "action:3"
  }
}
```

2. dispatch the same reservation

```json
{
  "status": "sent"
}
```

## RF05 · The first historical merge observation initializes availability without a separate readback

- 类别：`refinement_gap`
- 检查的说法：S1 current-result alone establishes independently observed Usable_L(t,q,n).
- 实际结果：`COUNTEREXAMPLE_REPRODUCED`

1. supply only the documented ordinary-merge observation

```json
{
  "evidenceFields": [
    "provider",
    "repositoryId",
    "pullRequestId",
    "targetRef",
    "sourceSha",
    "mergeMethod",
    "merged",
    "mergeSha",
    "parents",
    "observationRef"
  ],
  "result": {
    "id": "result:81f0b8b61f8d5549b9e5cc53c34de7a8583673b3f0adbb52818717938d41310a",
    "fingerprint": "81f0b8b61f8d5549b9e5cc53c34de7a8583673b3f0adbb52818717938d41310a",
    "mergeSha": "3333333333333333333333333333333333333333",
    "available": true,
    "availabilityRevision": 1
  },
  "currentResult": true,
  "separateAvailabilityReadSubmitted": false
}
```

2. control: later known invalidation survives a repeated merge observation

```json
{
  "historicalCompletion": true,
  "currentResult": false
}
```

## RF06 · A post-assignment completion conflict rolls back the draft action mutation

- 类别：`scoped_control`
- 检查的说法：A rejected synchronous command publishes no state, event or request receipt.
- 实际结果：`SCOPED_BEHAVIOR_CONFIRMED`

1. sent action exists while a different completion has been accepted

```json
{
  "action": {
    "id": "action:3",
    "taskId": "task:1",
    "attemptId": "attempt:2",
    "actorId": "session-a",
    "spec": {
      "kind": "pull_request_merge",
      "repositoryId": "repo-1",
      "pullRequestId": "pr-1",
      "targetRef": "refs/heads/pilot",
      "sourceSha": "1111111111111111111111111111111111111111",
      "mergeMethod": "merge"
    },
    "specVersion": 1,
    "authorizationRevision": 1,
    "status": "sent"
  },
  "completion": "completion:5"
}
```

2. resolveAction assigns succeeded in the draft, then complete rejects; repeat stays rejected

```json
{
  "error": "COMPLETION_CONFLICT",
  "currentActionStatus": "sent",
  "cursorUnchanged": true,
  "journalUnchanged": true
}
```

## RF07 · C01 must use explicit successor mode for a completed S1 task

- 类别：`scoped_control`
- 检查的说法：The supported C01 variant rejects in-place completed-task mutation and does not inherit acceptance.
- 实际结果：`SCOPED_BEHAVIOR_CONFIRMED`

1. reject in-place mutation and create a related new assignment

```json
{
  "rejected": "INVALID_TRANSITION",
  "oldTaskId": "task:1",
  "newTaskId": "task:4",
  "oldAccepted": true,
  "newAccepted": false,
  "newSpecVersion": 1
}
```

## RF08 · Cancellation and late evidence retain separate task and action outcomes

- 类别：`scoped_control`
- 检查的说法：Cancellation of a sent action does not assert not_applied; late trusted success stays attributed to the old action.
- 实际结果：`SCOPED_BEHAVIOR_CONFIRMED`

1. cancel after dispatch

```json
{
  "taskStatus": "cancelled",
  "actionStatus": "sent"
}
```

2. record uncertainty and create successor assignment

```json
{
  "successorDecision": {
    "decision": "wait",
    "reason": "action-unresolved",
    "actionId": "action:3"
  }
}
```

3. accept a trusted synthetic late result

```json
{
  "oldTaskStatus": "cancelled",
  "oldActionStatus": "succeeded",
  "successorDecision": {
    "decision": "verify",
    "reason": "prior-result",
    "actionId": "action:3"
  }
}
```

