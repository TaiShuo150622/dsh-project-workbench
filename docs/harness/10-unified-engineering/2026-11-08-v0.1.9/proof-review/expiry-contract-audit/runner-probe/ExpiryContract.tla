-------------------------- MODULE ExpiryContract --------------------------
EXTENDS Naturals, FiniteSets

(***************************************************************************
One immutable business intent, two transmission attempts, one target clock.
The key is retained until Deadline. Sends and optional target admission occur
strictly before Deadline; a message or an admitted request may arrive late.
The modes are "none", "admission", and "commit". Only commit mode rejects
expiry at the actual effect linearization point. No fairness is assumed.
***************************************************************************)

CONSTANTS Deadline, Mode
ASSUME /\ Deadline = 2
       /\ Mode \in {"none", "admission", "commit"}

Messages == 1..2
VARIABLES now, sent, received, finished, admitted, seen, effects
vars == <<now, sent, received, finished, admitted, seen, effects>>

Init == /\ now = 0
        /\ sent = {}
        /\ received = {}
        /\ finished = {}
        /\ admitted = {}
        /\ seen = FALSE
        /\ effects = {}

Send(m) == /\ now < Deadline
           /\ m \notin sent
           /\ sent' = sent \cup {m}
           /\ UNCHANGED <<now, received, finished, admitted, seen, effects>>

Receive(m) == /\ m \in sent \ received
              /\ received' = received \cup {m}
              /\ admitted' = IF Mode = "admission" /\ now >= Deadline
                              THEN admitted ELSE admitted \cup {m}
              /\ UNCHANGED <<now, sent, finished, seen, effects>>

Commit(m) ==
    /\ m \in received \ finished
    /\ finished' = finished \cup {m}
    /\ IF m \notin admitted \/ (Mode = "commit" /\ now >= Deadline)
          THEN UNCHANGED <<seen, effects>>
          ELSE /\ effects' = IF seen THEN effects ELSE effects \cup {m}
               /\ seen' = TRUE
    /\ UNCHANGED <<now, sent, received, admitted>>

Evict == /\ now >= Deadline
         /\ seen
         /\ seen' = FALSE
         /\ UNCHANGED <<now, sent, received, finished, admitted, effects>>

Tick == /\ now < Deadline
        /\ now' = now + 1
        /\ UNCHANGED <<sent, received, finished, admitted, seen, effects>>

Next == (\E m \in Messages : Send(m) \/ Receive(m) \/ Commit(m))
        \/ Evict \/ Tick
Spec == Init /\ [][Next]_vars

TypeOK == /\ now \in 0..Deadline
          /\ sent \subseteq Messages
          /\ received \subseteq sent
          /\ finished \subseteq received
          /\ admitted \subseteq received
          /\ seen \in BOOLEAN
          /\ effects \subseteq finished

NoDuplicate == Cardinality(effects) <= 1
=============================================================================
