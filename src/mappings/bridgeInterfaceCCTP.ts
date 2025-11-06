import { BridgeInitiated } from "../../generated/BridgeInterfaceCCTP/BridgeInterfaceCCTP"
import { MetavaultBridgeInitiated } from "../../generated/schema"

export function handleBridgeInitiated(event: BridgeInitiated): void {
    const metavaultBridgeInitiated = new MetavaultBridgeInitiated(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    metavaultBridgeInitiated.safe = event.params.safe
    metavaultBridgeInitiated.tokenIn = event.params.tokenIn
    metavaultBridgeInitiated.amount = event.params.amount
    metavaultBridgeInitiated.dstChainId = event.params.dstChainId.toI32()
    metavaultBridgeInitiated.dstSafe = event.params.dstSafe
    metavaultBridgeInitiated.bridge = event.params.bridge
    metavaultBridgeInitiated.tokenOut = event.params.tokenOut
    metavaultBridgeInitiated.metavault = event.params.safe.toHex()
    metavaultBridgeInitiated.timestamp = event.block.timestamp
    metavaultBridgeInitiated.blockNumber = event.block.number
    metavaultBridgeInitiated.transactionHash = event.transaction.hash
    metavaultBridgeInitiated.logIndex = event.logIndex
    metavaultBridgeInitiated.save()
}
