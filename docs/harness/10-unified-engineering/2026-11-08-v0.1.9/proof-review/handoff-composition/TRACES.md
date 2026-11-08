# R12 有限模型反例摘录

长度按图中事件数计；数字为假设。完整状态见 results.json。

## conservative-same

720 states / 1989 edges

未发现指定直接不变量违例。


## conservative-cross

1008 states / 2760 edges

未发现指定直接不变量违例。


## ack-releases

1260 states / 3555 edges

- active_liability_covered: 2 步；OfferBoundPacket → AcceptCustody
- world_exposure_limits: 3 步；OfferBoundPacket → AcceptCustody → AdmitAndSpendFreshA
- actual_cost_limits: 5 步；OldEffectConsumes → OldEffectConsumes → OfferBoundPacket → AcceptCustody → AdmitAndSpendFreshA
- ledger_limits: 7 步；OldEffectConsumes → OldEffectConsumes → OfferBoundPacket → ObserveAuthoritativeTerminal → AcceptCustody → AdmitAndSpendFreshA → SettleOnce

## release-first

1260 states / 3600 edges

- active_liability_covered: 3 步；OfferBoundPacket → AcceptCustody → ReleaseSourceBeforeDestination
- world_exposure_limits: 4 步；OfferBoundPacket → AcceptCustody → ReleaseSourceBeforeDestination → AdmitAndSpendFreshA
- actual_cost_limits: 6 步；OldEffectConsumes → OldEffectConsumes → OfferBoundPacket → AcceptCustody → ReleaseSourceBeforeDestination → AdmitAndSpendFreshA

## ack-is-capability

828 states / 2268 edges

- authorized_resolution: 3 步；OfferBoundPacket → AcceptResolve → ObserveAuthoritativeTerminal

