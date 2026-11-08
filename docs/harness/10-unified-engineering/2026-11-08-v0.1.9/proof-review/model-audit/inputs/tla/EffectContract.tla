-------------------------- MODULE EffectContract ---------------------------
EXTENDS Naturals, FiniteSets

(*
  One logical business action, immutable parameters, up to MaxSends messages,
  and two epochs. This is a target-side effect model, not the Record kernel.
  Advancing targetEpoch means the target has installed the newer fence.
  No fairness or eventual-delivery assumption is made.
*)
CONSTANTS MaxSends, TargetDedupe, TargetFence, StableBusinessKey

VARIABLES targetEpoch, sent, messages, seenKeys, effects, cancelled, confirmed

vars == <<targetEpoch, sent, messages, seenKeys, effects,
          cancelled, confirmed>>

MessageIds == 1..MaxSends
KeyFor(i) == IF StableBusinessKey THEN 0 ELSE i

Init ==
  /\ targetEpoch = 1
  /\ sent = 0
  /\ messages = [i \in {} |-> i]
  /\ seenKeys = {}
  /\ effects = {}
  /\ cancelled = FALSE
  /\ confirmed = FALSE

Send ==
  /\ ~cancelled
  /\ ~confirmed
  /\ sent < MaxSends
  /\ LET i == sent + 1 IN
       messages' = [j \in 1..i |->
         IF j = i
         THEN [epoch |-> targetEpoch, key |-> KeyFor(i),
               status |-> "pending"]
         ELSE messages[j]]
  /\ sent' = sent + 1
  /\ UNCHANGED <<targetEpoch, seenKeys, effects, cancelled, confirmed>>

InstallNewEpoch ==
  /\ targetEpoch = 1
  /\ targetEpoch' = 2
  /\ UNCHANGED <<sent, messages, seenKeys, effects, cancelled, confirmed>>

Cancel ==
  /\ ~cancelled
  /\ cancelled' = TRUE
  /\ UNCHANGED <<targetEpoch, sent, messages, seenKeys, effects, confirmed>>

Deliver(i) ==
  /\ i \in DOMAIN messages
  /\ messages[i].status = "pending"
  /\ IF TargetFence /\ messages[i].epoch < targetEpoch
     THEN
       /\ messages' = [messages EXCEPT ![i].status = "rejected"]
       /\ UNCHANGED <<seenKeys, effects>>
     ELSE IF TargetDedupe /\ messages[i].key \in seenKeys
     THEN
       /\ messages' = [messages EXCEPT ![i].status = "deduplicated"]
       /\ UNCHANGED <<seenKeys, effects>>
     ELSE
       /\ messages' = [messages EXCEPT ![i].status = "applied"]
       /\ seenKeys' = seenKeys \cup {messages[i].key}
       /\ effects' = effects \cup {
            [message |-> i, sentEpoch |-> messages[i].epoch,
             commitEpoch |-> targetEpoch, afterCancel |-> cancelled]}
  /\ UNCHANGED <<targetEpoch, sent, cancelled, confirmed>>

ObserveSuccess(i) ==
  /\ i \in DOMAIN messages
  /\ messages[i].status \in {"applied", "deduplicated"}
  /\ ~confirmed
  /\ confirmed' = TRUE
  /\ UNCHANGED <<targetEpoch, sent, messages, seenKeys, effects, cancelled>>

Next ==
  \/ Send
  \/ InstallNewEpoch
  \/ Cancel
  \/ \E i \in DOMAIN messages : Deliver(i)
  \/ \E i \in DOMAIN messages : ObserveSuccess(i)

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ targetEpoch \in 1..2
  /\ sent \in 0..MaxSends
  /\ DOMAIN messages = 1..sent
  /\ \A i \in DOMAIN messages :
       /\ messages[i].epoch \in 1..2
       /\ messages[i].key \in 0..MaxSends
       /\ messages[i].status \in
            {"pending", "applied", "deduplicated", "rejected"}
  /\ seenKeys \subseteq 0..MaxSends
  /\ cancelled \in BOOLEAN
  /\ confirmed \in BOOLEAN
  /\ \A e \in effects :
       /\ e.message \in MessageIds
       /\ e.sentEpoch \in 1..2
       /\ e.commitEpoch \in 1..2
       /\ e.afterCancel \in BOOLEAN

NoDuplicateEffect == Cardinality(effects) <= 1
NoStaleCommit == \A e \in effects : e.sentEpoch = e.commitEpoch

(* These are intentionally false claims, used only in counterexample configs. *)
NoCommitAfterLocalCancel == \A e \in effects : ~e.afterCancel
WorldEffectAlwaysKnown == effects # {} => confirmed

=============================================================================
