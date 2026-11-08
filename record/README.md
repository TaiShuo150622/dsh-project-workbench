# Record S1 task kernel

`kernel.mjs` is a deterministic, synchronous state model for one project stream. It has no file writes, network requests or DSH dependencies. S1 tests task semantics; it does **not** provide authentication, durable storage, cross-process locking, live GitHub verification or host tool interception.

## Trust boundary and identity

Construct `new RecordKernel({ streamId })` with a stable project **and history incarnation** identity. A new independent log needs a new stream ID. Commands are plain JSON, and receipts, snapshots and journals are defensive copies.

The caller is a trusted adapter. It authenticates `actor: {kind, id}` before invoking the kernel. The kernel enforces role restrictions but does not authenticate actor strings. An agent's text claiming to be a user/verifier is never an authenticated command. GitHub evidence supplied by a `verifier` is a synthetic trusted observation in S1; its correctness is the future adapter's responsibility.

The only task type is an ordinary PR merge, with exactly these spec fields:

```json
{
  "kind": "pull_request_merge",
  "repositoryId": "stable-repository-id",
  "pullRequestId": "stable-pull-request-id",
  "targetRef": "refs/heads/pilot",
  "sourceSha": "1111111111111111111111111111111111111111",
  "mergeMethod": "merge"
}
```

`repositoryId` is the target repository's stable identity; PR numbers alone and directory paths are not repository identities. The fixed source SHA binds the authorized batch. Revision changes require a new explicit scope source. A completed batch is not expanded in place. Cancellation ends an assignment; a new assignment has a new `sourceId` and `reissueOf`. Pausing and retries keep the task ID. Automatic fuzzy matching and task alias merging are deferred.

Creation and scope revisions register their source IDs across the stream. An old source cannot be reinterpreted as a different assignment or revised scope; exact request redelivery remains idempotent.

## Command envelope

`apply({type, requestId, actor, taskId, expectedRevision, payload})` publishes one successful command and its receipt atomically **within the synchronous model**. A thrown `RecordError` changes no state or journal. `requestId` identifies one exact command including actor and expected revision; identical retries return the original receipt, while reusing the ID for different content fails. The returned receipt is historical: read `task()` or `snapshot()` for current state.

Creation omits `taskId` and `expectedRevision`. Acceptance omits `expectedRevision` and instead supplies the result token. All other commands require the current task revision. A new request that repeats a source assignment can create an audit event but does not increment that task's revision. Reads and identical request redelivery create no event.

| Command | Role | Payload |
| --- | --- | --- |
| `createTask` | user | `sourceId`, `spec`, `requiresAcceptance`; optional `reissueOf`, `relatedTaskId` |
| `beginAttempt` | user/agent | `host` (`dsh`, `codex`, `claude-code`), `sessionId` |
| `report` | attempt owner | `attemptId`, `summary`; reporting cannot complete a task |
| `note` | user/agent | `text`; never changes completion or acceptance applicability |
| `pause` | user | `paused` boolean; aborts unsent reservations when pausing |
| `cancel` | user | `reason`; unsent reservations abort, sent/unknown actions remain unresolved |
| `authorize` | user | `sourceId`, `active`; a revoked permission aborts unsent reservations |
| `reviseTask` | user | new `spec`, `sourceId`; only open tasks with no unresolved action |
| `verifyCompletion` | verifier | `evidence`; only open/completed tasks; conflicting result requires explicit correction |
| `withdrawCompletion` | verifier | `completionId`, `reason`; marks the incorrect completion invalid and task disputed |
| `resolveDispute` | verifier | `conclusion: met/unmet`, `reference`; met also requires `evidence` |
| `markUnavailable` | verifier | `resultId`, `reference`; does not erase historical completion or acceptance |
| `acceptResult` | user | `token`; optional `reuseAcceptanceId` for explicit same-result confirmation |
| `reserveAction` | attempt owner | `attemptId`, `connected` boolean |
| `dispatchAction` | reservation owner | `actionId`, `connected` boolean; models the final admission check |
| `resolveAction` | verifier, or owner for unknown | `actionId`, `outcome`; see below |

## Completion and acceptance

Evidence contains exactly `provider: github`, the five matching scope fields (`repositoryId`, `pullRequestId`, `targetRef`, `sourceSha`, `mergeMethod`), `merged: true`, `mergeSha`, two `parents` (target parent then fixed source SHA), and `observationRef`. This is an ordinary merge rule only. Queued requests, mergeability, a model report, or a test merge commit do not establish completion.

A verified task exits execution even when acceptance is pending. `acceptanceToken(taskId)` binds the task definition, completion record, result, result availability revision, and acceptance revision. An unrelated note does not expire the token. A changed result, withdrawn completion or competing acceptance does. Retrying the same submitted request returns its receipt without accepting a new result.

Withdrawn completion keeps its acceptance history, but that acceptance no longer satisfies a current dependency. Correcting to the same result still requires an explicit acceptance; `reuseAcceptanceId` records which old judgment the same user consciously reused. A different result cannot reuse it. Tasks that do not require acceptance gain no new human gate.

`markUnavailable` models a later revert: historical completion stays true while current result/acceptance dependencies fail. A repeated historical merged observation cannot reset current availability. Restoration uses a related new task/result; S1 has no automatic restore operation.

Result availability is shared by fingerprint across assignments. A new task ID cannot reset a known unavailable result; a change increments the revisions of all tasks referencing that result, invalidating their dependent views and result tokens.

## Action model and read model

`checkAction(taskId, {connected, expectedRevision})` returns `allow`, `skip`, `wait`, or `verify`. The model conservatively serializes merge actions by stable repository ID plus target ref, **across task IDs**. An old successful action for the same batch returns `verify` until the new task has adopted the actual completion evidence. Real callers must also bind actual tool arguments and authorization to the modeled action before sending; S1 does not intercept tools.

Reservations progress `reserved → sent → succeeded / not_applied / unknown`. Unknown remains occupied, including after cancellation and reissue. Only a verifier's structured proof `{senderTerminated: true, notApplied: true, reference}` releases a negative result; querying “not found yet” is insufficient. These proof fields represent trusted simulation inputs, not proof that S1 fenced a real process. A successful action validates evidence and publishes completion in the same model transaction unless the task is cancelled/disputed. Resolve a disputed task explicitly.

Replacing an authorization revision aborts every old unsent reservation, including replacement by another active grant, so unusable reservations cannot strand authorized work. Withdrawing the completion evidence behind a successful action retains its history but marks the action unknown again: a judgment that the goal is unmet is not a sender termination proof. A fresh trusted terminal result must resolve the action before retrying the shared modification.

`dependency(taskId, kind)` supports `historical-completion`, `current-result`, `current-acceptance`. Snapshots carry a stream identity, cursor and content digest. `installSnapshot(current, incoming)` rejects cross-stream data and prevents a late old response from replacing newer state; equal-cursor contradictions fail. Digests detect accidental corruption, not forgery. `eventsSince(cursor)` returns one consistent event range and its upper cursor. `RecordKernel.replay(journal)` requires gap-free ordered events and matching receipts, retaining retry identities after round-trip JSON serialization.

## Validation and limits

Run `npm run test:record`, `npm run test:record:mutation`, or `npm run ci`. Tests use fixed evidence and synchronous controlled order, without actual GitHub writes or DSH processes. Full logs and a manifest are saved by CI; adversarial candidates use the same public contract and must not alter production code or weaken existing tests.

The journal is an in-memory command history, not a production storage format or secure audit log. Imported data must be bounded and authenticated by a future adapter. S1 deliberately does not install a plugin, alter existing workbench acceptance, migrate personal history, merge real PRs, or claim multi-host integration.
