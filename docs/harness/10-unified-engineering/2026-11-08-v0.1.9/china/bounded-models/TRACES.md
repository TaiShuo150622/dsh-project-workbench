# 可重复最短反例轨迹

由 model_check.py 自动生成。动作、预算、验收与聚焦支持采用 BFS，轨迹在所列初态与抽象转移粒度下最短。

全公式域的两个支持反例按根事实最少添加前缀加一次撤回选择；2/3 步最短性的初态下界见 README。

18 > 10 是额外要求场景，经同一转移函数重放；没有声称它是所有超支的全局最短轨迹。

## action_model/correct/shortest_counterexamples/FALSE_CONJECTURE_active_count_at_most_one

长度：5 个转移。

```text
00 {"op": "initial"}
   {"cancel_requested": [false, false], "phase": ["idle", "idle"], "sender_stopped": [false, false]}
01 {"action": "A", "op": "reserve"}
   {"cancel_requested": [false, false], "phase": ["reserved", "idle"], "sender_stopped": [false, false]}
02 {"action": "A", "op": "send"}
   {"cancel_requested": [false, false], "phase": ["dispatched", "idle"], "sender_stopped": [false, false]}
03 {"action": "A", "op": "success"}
   {"cancel_requested": [false, false], "phase": ["success", "idle"], "sender_stopped": [false, false]}
04 {"action": "B", "op": "reserve"}
   {"cancel_requested": [false, false], "phase": ["success", "reserved"], "sender_stopped": [false, false]}
05 {"action": "A", "op": "withdraw_evidence"}
   {"cancel_requested": [false, false], "phase": ["unknown", "reserved"], "sender_stopped": [false, false]}
```

## action_model/omit_dispatch_recheck/shortest_counterexamples/FALSE_CONJECTURE_active_count_at_most_one

长度：5 个转移。

```text
00 {"op": "initial"}
   {"cancel_requested": [false, false], "phase": ["idle", "idle"], "sender_stopped": [false, false]}
01 {"action": "A", "op": "reserve"}
   {"cancel_requested": [false, false], "phase": ["reserved", "idle"], "sender_stopped": [false, false]}
02 {"action": "A", "op": "send"}
   {"cancel_requested": [false, false], "phase": ["dispatched", "idle"], "sender_stopped": [false, false]}
03 {"action": "A", "op": "success"}
   {"cancel_requested": [false, false], "phase": ["success", "idle"], "sender_stopped": [false, false]}
04 {"action": "B", "op": "reserve"}
   {"cancel_requested": [false, false], "phase": ["success", "reserved"], "sender_stopped": [false, false]}
05 {"action": "A", "op": "withdraw_evidence"}
   {"cancel_requested": [false, false], "phase": ["unknown", "reserved"], "sender_stopped": [false, false]}
```

## action_model/omit_dispatch_recheck/shortest_counterexamples/dispatch_has_no_unresolved_conflict

长度：6 个转移。

```text
00 {"op": "initial"}
   {"cancel_requested": [false, false], "phase": ["idle", "idle"], "sender_stopped": [false, false]}
01 {"action": "A", "op": "reserve"}
   {"cancel_requested": [false, false], "phase": ["reserved", "idle"], "sender_stopped": [false, false]}
02 {"action": "A", "op": "send"}
   {"cancel_requested": [false, false], "phase": ["dispatched", "idle"], "sender_stopped": [false, false]}
03 {"action": "A", "op": "success"}
   {"cancel_requested": [false, false], "phase": ["success", "idle"], "sender_stopped": [false, false]}
04 {"action": "B", "op": "reserve"}
   {"cancel_requested": [false, false], "phase": ["success", "reserved"], "sender_stopped": [false, false]}
05 {"action": "A", "op": "withdraw_evidence"}
   {"cancel_requested": [false, false], "phase": ["unknown", "reserved"], "sender_stopped": [false, false]}
06 {"action": "B", "op": "send"}
   {"cancel_requested": [false, false], "phase": ["unknown", "dispatched"], "sender_stopped": [false, false]}
```

## action_model/cancel_means_not_applied/shortest_counterexamples/cancel_request_is_not_effect_resolution

长度：3 个转移。

```text
00 {"op": "initial"}
   {"cancel_requested": [false, false], "phase": ["idle", "idle"], "sender_stopped": [false, false]}
01 {"action": "A", "op": "reserve"}
   {"cancel_requested": [false, false], "phase": ["reserved", "idle"], "sender_stopped": [false, false]}
02 {"action": "A", "op": "send"}
   {"cancel_requested": [false, false], "phase": ["dispatched", "idle"], "sender_stopped": [false, false]}
03 {"action": "A", "op": "cancel"}
   {"cancel_requested": [true, false], "phase": ["not_applied", "idle"], "sender_stopped": [false, false]}
```

## action_model/cancel_means_not_applied/shortest_counterexamples/FALSE_CONJECTURE_active_count_at_most_one

长度：5 个转移。

```text
00 {"op": "initial"}
   {"cancel_requested": [false, false], "phase": ["idle", "idle"], "sender_stopped": [false, false]}
01 {"action": "A", "op": "reserve"}
   {"cancel_requested": [false, false], "phase": ["reserved", "idle"], "sender_stopped": [false, false]}
02 {"action": "A", "op": "send"}
   {"cancel_requested": [false, false], "phase": ["dispatched", "idle"], "sender_stopped": [false, false]}
03 {"action": "A", "op": "cancel"}
   {"cancel_requested": [true, false], "phase": ["not_applied", "idle"], "sender_stopped": [false, false]}
04 {"action": "B", "op": "reserve"}
   {"cancel_requested": [true, false], "phase": ["not_applied", "reserved"], "sender_stopped": [false, false]}
05 {"action": "A", "op": "withdraw_evidence"}
   {"cancel_requested": [true, false], "phase": ["unknown", "reserved"], "sender_stopped": [false, false]}
```

## support_model/shortest_counterexamples/clear_all_descendants

长度：3 个转移。

支持公式：`{"y": "FALSE", "z": "a OR b"}`

```text
00 {"op": "initial"}
   {"bases": [false, false, false], "derived": [false, false]}
01 {"op": "add_root", "root": "a"}
   {"bases": [true, false, false], "derived": [false, true]}
02 {"op": "add_root", "root": "b"}
   {"bases": [true, true, false], "derived": [false, true]}
03 {"op": "withdraw_root", "root": "a"}
   {"bases": [false, true, false], "derived": [false, false], "oracle_lfp": [false, true]}
```

## support_model/shortest_counterexamples/stale_seed

长度：2 个转移。

支持公式：`{"y": "FALSE", "z": "a OR z"}`

```text
00 {"op": "initial"}
   {"bases": [false, false, false], "derived": [false, false]}
01 {"op": "add_root", "root": "a"}
   {"bases": [true, false, false], "derived": [false, true]}
02 {"op": "withdraw_root", "root": "a"}
   {"bases": [false, false, false], "derived": [false, true], "oracle_lfp": [false, false]}
```

## support_model/focused_bfs/cycle_stale_seed/shortest_counterexamples/supported_equals_least_fixed_point

长度：2 个转移。

支持公式：`{"y": "a OR z", "z": "y"}`

```text
00 {"op": "initial"}
   {"bases": [false, false, false], "derived": [false, false]}
01 {"op": "add_root", "root": "a"}
   {"bases": [true, false, false], "derived": [true, true]}
02 {"op": "withdraw_root", "root": "a"}
   {"bases": [false, false, false], "derived": [true, true]}
```

## support_model/focused_bfs/and_or_clear_descendants/shortest_counterexamples/supported_equals_least_fixed_point

长度：3 个转移。

支持公式：`{"y": "a AND b OR c", "z": "y"}`

```text
00 {"op": "initial"}
   {"bases": [false, false, false], "derived": [false, false]}
01 {"op": "add_root", "root": "a"}
   {"bases": [true, false, false], "derived": [false, false]}
02 {"op": "add_root", "root": "c"}
   {"bases": [true, false, true], "derived": [true, true]}
03 {"op": "withdraw_root", "root": "a"}
   {"bases": [false, false, true], "derived": [false, false]}
```

## budget_model/forget_unreported/shortest_counterexamples/reservation_covers_unsettled_liability

长度：3 个转移。

```text
00 {"op": "initial"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [0, 0], "phase": ["idle", "idle"], "reserved": [0, 0], "settled": 0}
01 {"action": "A", "amount": 1, "op": "reserve_cost"}
   {"closing_remaining": 1, "future_max": [1, 0], "hidden_spent": [0, 0], "phase": ["running", "idle"], "reserved": [1, 0], "settled": 0}
02 {"action": "A", "amount": 1, "op": "spend_unreported"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [1, 0], "phase": ["running", "idle"], "reserved": [1, 0], "settled": 0}
03 {"action": "A", "amount": 1, "op": "MUTANT_keep_only_future"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [1, 0], "phase": ["running", "idle"], "reserved": [0, 0], "settled": 0}
```

## budget_model/forget_unreported/shortest_counterexamples/physical_worst_case_within_budget

长度：4 个转移。

```text
00 {"op": "initial"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [0, 0], "phase": ["idle", "idle"], "reserved": [0, 0], "settled": 0}
01 {"action": "A", "amount": 1, "op": "reserve_cost"}
   {"closing_remaining": 1, "future_max": [1, 0], "hidden_spent": [0, 0], "phase": ["running", "idle"], "reserved": [1, 0], "settled": 0}
02 {"action": "A", "amount": 1, "op": "spend_unreported"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [1, 0], "phase": ["running", "idle"], "reserved": [1, 0], "settled": 0}
03 {"action": "A", "amount": 1, "op": "MUTANT_keep_only_future"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [1, 0], "phase": ["running", "idle"], "reserved": [0, 0], "settled": 0}
04 {"action": "B", "amount": 3, "op": "reserve_cost"}
   {"closing_remaining": 1, "future_max": [0, 3], "hidden_spent": [1, 0], "phase": ["running", "running"], "reserved": [0, 3], "settled": 0}
```

## budget_model/forget_unreported/shortest_counterexamples/ledger_total_with_closing_within_budget

长度：5 个转移。

```text
00 {"op": "initial"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [0, 0], "phase": ["idle", "idle"], "reserved": [0, 0], "settled": 0}
01 {"action": "A", "amount": 1, "op": "reserve_cost"}
   {"closing_remaining": 1, "future_max": [1, 0], "hidden_spent": [0, 0], "phase": ["running", "idle"], "reserved": [1, 0], "settled": 0}
02 {"action": "A", "amount": 1, "op": "spend_unreported"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [1, 0], "phase": ["running", "idle"], "reserved": [1, 0], "settled": 0}
03 {"action": "A", "amount": 1, "op": "MUTANT_keep_only_future"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [1, 0], "phase": ["running", "idle"], "reserved": [0, 0], "settled": 0}
04 {"action": "B", "amount": 3, "op": "reserve_cost"}
   {"closing_remaining": 1, "future_max": [0, 3], "hidden_spent": [1, 0], "phase": ["running", "running"], "reserved": [0, 3], "settled": 0}
05 {"action": "A", "amount": 1, "op": "settle_all_reported"}
   {"closing_remaining": 1, "future_max": [0, 3], "hidden_spent": [0, 0], "phase": ["done", "running"], "reserved": [0, 3], "settled": 1}
```

## budget_model/forget_unreported/shortest_counterexamples/final_settled_cost_within_budget

长度：8 个转移。

```text
00 {"op": "initial"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [0, 0], "phase": ["idle", "idle"], "reserved": [0, 0], "settled": 0}
01 {"action": "A", "amount": 1, "op": "reserve_cost"}
   {"closing_remaining": 1, "future_max": [1, 0], "hidden_spent": [0, 0], "phase": ["running", "idle"], "reserved": [1, 0], "settled": 0}
02 {"action": "A", "amount": 1, "op": "spend_unreported"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [1, 0], "phase": ["running", "idle"], "reserved": [1, 0], "settled": 0}
03 {"action": "A", "amount": 1, "op": "MUTANT_keep_only_future"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [1, 0], "phase": ["running", "idle"], "reserved": [0, 0], "settled": 0}
04 {"action": "B", "amount": 3, "op": "reserve_cost"}
   {"closing_remaining": 1, "future_max": [0, 3], "hidden_spent": [1, 0], "phase": ["running", "running"], "reserved": [0, 3], "settled": 0}
05 {"action": "A", "amount": 1, "op": "settle_all_reported"}
   {"closing_remaining": 1, "future_max": [0, 3], "hidden_spent": [0, 0], "phase": ["done", "running"], "reserved": [0, 3], "settled": 1}
06 {"action": "B", "amount": 3, "op": "spend_unreported"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [0, 3], "phase": ["done", "running"], "reserved": [0, 3], "settled": 1}
07 {"action": "B", "amount": 3, "op": "settle_all_reported"}
   {"closing_remaining": 1, "future_max": [0, 0], "hidden_spent": [0, 0], "phase": ["done", "done"], "reserved": [0, 0], "settled": 4}
08 {"amount": 1, "op": "consume_closing_reserve"}
   {"closing_remaining": 0, "future_max": [0, 0], "hidden_spent": [0, 0], "phase": ["done", "done"], "reserved": [0, 0], "settled": 5}
```

## budget_model/required_18_over_10

长度：8 个转移。

```text
00 {"op": "initial"}
   {"closing_remaining": 0, "future_max": [0, 0], "hidden_spent": [0, 0], "phase": ["idle", "idle"], "reserved": [0, 0], "settled": 0}
01 {"action": "A", "amount": 10, "op": "reserve_cost"}
   {"closing_remaining": 0, "future_max": [10, 0], "hidden_spent": [0, 0], "phase": ["running", "idle"], "reserved": [10, 0], "settled": 0}
02 {"action": "A", "amount": 8, "op": "spend_unreported"}
   {"closing_remaining": 0, "future_max": [2, 0], "hidden_spent": [8, 0], "phase": ["running", "idle"], "reserved": [10, 0], "settled": 0}
03 {"action": "A", "amount": 8, "op": "MUTANT_keep_only_future"}
   {"closing_remaining": 0, "future_max": [2, 0], "hidden_spent": [8, 0], "phase": ["running", "idle"], "reserved": [2, 0], "settled": 0}
04 {"action": "B", "amount": 8, "op": "reserve_cost"}
   {"closing_remaining": 0, "future_max": [2, 8], "hidden_spent": [8, 0], "phase": ["running", "running"], "reserved": [2, 8], "settled": 0}
05 {"action": "A", "amount": 2, "op": "spend_unreported"}
   {"closing_remaining": 0, "future_max": [0, 8], "hidden_spent": [10, 0], "phase": ["running", "running"], "reserved": [2, 8], "settled": 0}
06 {"action": "B", "amount": 8, "op": "spend_unreported"}
   {"closing_remaining": 0, "future_max": [0, 0], "hidden_spent": [10, 8], "phase": ["running", "running"], "reserved": [2, 8], "settled": 0}
07 {"action": "A", "amount": 10, "op": "settle_all_reported"}
   {"closing_remaining": 0, "future_max": [0, 0], "hidden_spent": [0, 8], "phase": ["done", "running"], "reserved": [0, 8], "settled": 10}
08 {"action": "B", "amount": 8, "op": "settle_all_reported"}
   {"closing_remaining": 0, "future_max": [0, 0], "hidden_spent": [0, 0], "phase": ["done", "done"], "reserved": [0, 0], "settled": 18}
```

## acceptance_model/shortest_counterexamples/omit_spec_version_matches_event_oracle

长度：2 个转移。

```text
00 {"op": "initial"}
   {"accepted_global_revision": -1, "applicability_D_valid": true, "binding": null, "current": [0, 0, 0, 0, 0, 0, 0, 0, 0], "decision_withdrawn": false, "event_oracle_valid": false, "note_revision": 0}
01 {"op": "accept_current_binding"}
   {"accepted_global_revision": 0, "applicability_D_valid": true, "binding": [0, 0, 0, 0, 0, 0, 0, 0, 0], "current": [0, 0, 0, 0, 0, 0, 0, 0, 0], "decision_withdrawn": false, "event_oracle_valid": true, "note_revision": 0}
02 {"field": "specVersion", "op": "update_binding_field"}
   {"accepted_global_revision": 0, "applicability_D_valid": true, "binding": [0, 0, 0, 0, 0, 0, 0, 0, 0], "current": [0, 0, 1, 0, 0, 0, 0, 0, 0], "decision_withdrawn": false, "event_oracle_valid": false, "note_revision": 0}
```

## acceptance_model/shortest_counterexamples/global_revision_matches_event_oracle

长度：2 个转移。

```text
00 {"op": "initial"}
   {"accepted_global_revision": -1, "applicability_D_valid": true, "binding": null, "current": [0, 0, 0, 0, 0, 0, 0, 0, 0], "decision_withdrawn": false, "event_oracle_valid": false, "note_revision": 0}
01 {"op": "accept_current_binding"}
   {"accepted_global_revision": 0, "applicability_D_valid": true, "binding": [0, 0, 0, 0, 0, 0, 0, 0, 0], "current": [0, 0, 0, 0, 0, 0, 0, 0, 0], "decision_withdrawn": false, "event_oracle_valid": true, "note_revision": 0}
02 {"op": "update_unrelated_note"}
   {"accepted_global_revision": 0, "applicability_D_valid": true, "binding": [0, 0, 0, 0, 0, 0, 0, 0, 0], "current": [0, 0, 0, 0, 0, 0, 0, 0, 0], "decision_withdrawn": false, "event_oracle_valid": true, "note_revision": 1}
```
