# C10 可打印反例与范围见证

事件数不是物理时间。完整 state 与历史账目见 audit-results.json。

## 原五配置的反例

### conservative-same

720 状态 / 1989 边。

未发现检查性质的失败。


### conservative-cross

1008 状态 / 2760 边。

- immutable_origin_budget_limit：8 步；这是不可重归属成本中心的额外解释，不是原模型不变量。
  OfferBoundPacket → AcceptCustody → OldEffectConsumes → OldEffectConsumes → ReserveDestinationDurably → CommitTransferWithDestinationClaim → ReleaseObsoleteSourceClaim → AdmitAndSpendFreshA

### ack-releases

1260 状态 / 3555 边。

- active_liability_covered：2 步。
  OfferBoundPacket → AcceptCustody
- actual_cost_limits：5 步。
  OfferBoundPacket → AcceptCustody → AdmitAndSpendFreshA → AdmitAndSpendFreshA → OldEffectConsumes
- immutable_origin_budget_limit：5 步；这是不可重归属成本中心的额外解释，不是原模型不变量。
  OfferBoundPacket → AcceptCustody → AdmitAndSpendFreshA → AdmitAndSpendFreshA → OldEffectConsumes
- ledger_limits：7 步。
  OfferBoundPacket → OldEffectConsumes → ObserveAuthoritativeTerminal → AcceptCustody → AdmitAndSpendFreshA → AdmitAndSpendFreshA → SettleOnce
- world_exposure_limits：3 步。
  OfferBoundPacket → AcceptCustody → AdmitAndSpendFreshA

### release-first

1260 状态 / 3600 边。

- active_liability_covered：3 步。
  OfferBoundPacket → AcceptCustody → ReleaseSourceBeforeDestination
- actual_cost_limits：6 步。
  OfferBoundPacket → AcceptCustody → OldEffectConsumes → OldEffectConsumes → ReleaseSourceBeforeDestination → AdmitAndSpendFreshA
- immutable_origin_budget_limit：6 步；这是不可重归属成本中心的额外解释，不是原模型不变量。
  OfferBoundPacket → AcceptCustody → OldEffectConsumes → OldEffectConsumes → ReleaseSourceBeforeDestination → AdmitAndSpendFreshA
- world_exposure_limits：4 步。
  OfferBoundPacket → AcceptCustody → ReleaseSourceBeforeDestination → AdmitAndSpendFreshA

### ack-is-capability

828 状态 / 2268 边。

- authorized_resolution：3 步。
  OfferBoundPacket → AcceptResolve → ObserveAuthoritativeTerminal

## 删除持久占位前提的扩展

### expire-prepared

1692 状态 / 4869 边；不并入原 5076 / 14172。

- active_liability_covered：5 步。
  OfferBoundPacket → AcceptCustody → ReserveDestinationDurably → ExpireDestinationClaim_prepared → CommitTransferWithDestinationClaim
- world_exposure_limits：6 步。
  OfferBoundPacket → AcceptCustody → ReserveDestinationDurably → ExpireDestinationClaim_prepared → AdmitAndSpendFreshB → CommitTransferWithDestinationClaim
- actual_cost_limits：8 步。
  OfferBoundPacket → AcceptCustody → OldEffectConsumes → OldEffectConsumes → ReserveDestinationDurably → ExpireDestinationClaim_prepared → AdmitAndSpendFreshB → CommitTransferWithDestinationClaim

### expire-committed

1584 状态 / 4473 边；不并入原 5076 / 14172。

- active_liability_covered：5 步。
  OfferBoundPacket → AcceptCustody → ReserveDestinationDurably → CommitTransferWithDestinationClaim → ExpireDestinationClaim_committed
- world_exposure_limits：6 步。
  OfferBoundPacket → AcceptCustody → ReserveDestinationDurably → CommitTransferWithDestinationClaim → ExpireDestinationClaim_committed → AdmitAndSpendFreshB
- actual_cost_limits：8 步。
  OfferBoundPacket → AcceptCustody → OldEffectConsumes → OldEffectConsumes → ReserveDestinationDurably → CommitTransferWithDestinationClaim → ExpireDestinationClaim_committed → AdmitAndSpendFreshB

## 范围与正向见证

### cross_commit_without_receiver_resolve_grant

4 步：OfferBoundPacket → AcceptCustody → ReserveDestinationDurably → CommitTransferWithDestinationClaim

末态 owner=receiver, acceptance=custody, resolveGrant=False, α=B, phase=committed, claims=(2,2), U=(0,0), hidden=0, effect=unknown。

### settlement_by_custody_owner_without_resolve_grant

5 步：OldEffectConsumes → ObserveAuthoritativeTerminal → OfferBoundPacket → AcceptCustody → SettleOnce

末态 owner=receiver, acceptance=custody, resolveGrant=False, α=A, phase=none, claims=(0,0), U=(1,0), hidden=1, effect=settled。

### revocation_after_terminal_does_not_disable_settlement

7 步：OfferBoundPacket → GrantResolve → AcceptResolve → OldEffectConsumes → ObserveAuthoritativeTerminal → RevokeResolveGrant → SettleOnce

末态 owner=receiver, acceptance=resolve, resolveGrant=False, α=A, phase=none, claims=(0,0), U=(1,0), hidden=1, effect=settled。

### hidden_growth_during_crash_preserves_full_hold

9 步：OfferBoundPacket → AcceptCustody → ReserveDestinationDurably → ControllerCrash → OldEffectConsumes → OldEffectConsumes → RecoverDurableState → CommitTransferWithDestinationClaim → ReleaseObsoleteSourceClaim

末态 owner=receiver, acceptance=custody, resolveGrant=False, α=B, phase=done, claims=(0,2), U=(0,0), hidden=2, effect=unknown。

### destination_reserve_ignores_unmodeled_closing_cost

3 步：OfferBoundPacket → AcceptCustody → ReserveDestinationDurably

末态 owner=receiver, acceptance=custody, resolveGrant=False, α=A, phase=prepared, claims=(2,2), U=(0,0), hidden=0, effect=unknown。

最后一条另假设目标 B 的独立收尾预留为 1：初态总负担 1≤2，准备后 0+2+1=3>2。R12 没有这一字段，其原不变量仍通过；这是未表示的组合条件。
