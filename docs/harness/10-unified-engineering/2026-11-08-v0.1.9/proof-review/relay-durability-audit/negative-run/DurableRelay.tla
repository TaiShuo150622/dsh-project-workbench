--------------------------- MODULE DurableRelay ---------------------------
EXTENDS Naturals

(***************************************************************************
One immutable worker-to-lead relay ID; the workbench outbox already exists.
The target has one active owned writer. A process crash preserves only the
abstract durable receipts/flags and discards unflushed live events. This is
NOT a disk/power-failure or implementation model. Two delivery invocations,
one failure, and one process crash are explored. No fairness is assumed.

Mode="memory-hit" acknowledges a duplicate seen only in live memory.
Mode="durable-hit" requires a successful durability barrier for that case.
A global flush may fail after the target was saved because another writer
failed. Thus a generic error is not evidence that the target lacks the ID.
***************************************************************************)

CONSTANT Mode
ASSUME Mode \in {"memory-hit", "durable-hit"}
VARIABLES live, durable, sent, error, phase, calls, failures, crashes
vars == <<live, durable, sent, error, phase, calls, failures, crashes>>
Phases == {"idle", "check", "append", "flush", "returned"}

Init == /\ live = FALSE
        /\ durable = FALSE
        /\ sent = FALSE
        /\ error = FALSE
        /\ phase = "idle"
        /\ calls = 0
        /\ failures = 0
        /\ crashes = 0

Start == /\ phase = "idle" /\ ~sent /\ ~error /\ calls < 2
         /\ calls' = calls + 1 /\ phase' = "check"
         /\ UNCHANGED <<live, durable, sent, error, failures, crashes>>

Check == /\ phase = "check"
         /\ phase' = IF ~live THEN "append"
                      ELSE IF Mode = "memory-hit" \/ durable
                           THEN "returned" ELSE "flush"
         /\ UNCHANGED <<live, durable, sent, error, calls, failures, crashes>>

Append == /\ phase = "append"
          /\ live' = TRUE /\ phase' = "flush"
          /\ UNCHANGED <<durable, sent, error, calls, failures, crashes>>

FlushSuccess == /\ phase = "flush"
                /\ durable' = TRUE /\ phase' = "returned"
                /\ UNCHANGED <<live, sent, error, calls, failures, crashes>>

TargetWriteFailure == /\ phase = "flush" /\ failures < 1 /\ ~durable
                      /\ error' = TRUE /\ failures' = failures + 1
                      /\ phase' = "idle"
                      /\ UNCHANGED <<live, durable, sent, calls, crashes>>

OtherWriterFailure == /\ phase = "flush" /\ failures < 1
                      /\ durable' = TRUE /\ error' = TRUE
                      /\ failures' = failures + 1 /\ phase' = "idle"
                      /\ UNCHANGED <<live, sent, calls, crashes>>

MarkSent == /\ phase = "returned"
            /\ sent' = TRUE /\ phase' = "idle"
            /\ UNCHANGED <<live, durable, error, calls, failures, crashes>>

MarkerWriteFailure == /\ phase = "returned" /\ failures < 1
                      /\ error' = TRUE /\ failures' = failures + 1
                      /\ phase' = "idle"
                      /\ UNCHANGED <<live, durable, sent, calls, crashes>>

RetryDelivery == /\ phase = "idle" /\ error
                 /\ error' = FALSE
                 /\ UNCHANGED <<live, durable, sent, phase, calls, failures, crashes>>

LaterDrain == /\ live /\ ~durable
              /\ durable' = TRUE
              /\ UNCHANGED <<live, sent, error, phase, calls, failures, crashes>>

Crash == /\ crashes < 1
         /\ crashes' = crashes + 1
         /\ live' = durable /\ phase' = "idle"
         /\ UNCHANGED <<durable, sent, error, calls, failures>>

Next == Start \/ Check \/ Append \/ FlushSuccess \/ TargetWriteFailure
        \/ OtherWriterFailure \/ MarkSent \/ MarkerWriteFailure
        \/ RetryDelivery \/ LaterDrain \/ Crash
Spec == Init /\ [][Next]_vars

TypeOK == /\ live \in BOOLEAN /\ durable \in BOOLEAN
          /\ sent \in BOOLEAN /\ error \in BOOLEAN
          /\ phase \in Phases /\ calls \in 0..2
          /\ failures \in 0..1 /\ crashes \in 0..1
          /\ (durable => live)

NoLostSent == sent => live \/ durable
SentImpliesDurable == sent => durable
ErrorProvesAbsence == error => ~durable
=============================================================================
