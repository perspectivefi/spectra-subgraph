import { BridgeInitiated } from "../../generated/BridgeInterfaceCCTP/BridgeInterfaceCCTP"
import { ERC20 } from "../../generated/templates/ERC20/ERC20"
import { MetavaultBridgeInitiated } from "../../generated/schema"
import { log } from "@graphprotocol/graph-ts"

export function handleBridgeInitiated(event: BridgeInitiated): void {
    const metavaultBridgeInitiated = new MetavaultBridgeInitiated(
        event.transaction.hash.concatI32(event.logIndex.toI32())
    )
    const tokenIn = ERC20.bind(event.params.tokenIn)
    if (tokenIn === null) {
        log.warning("Token in was not found", [])
        return
    }
    metavaultBridgeInitiated.tokenInDecimals = tokenIn.try_decimals().value
    metavaultBridgeInitiated.tokenInSymbol = tokenIn.try_symbol().value
    metavaultBridgeInitiated.tokenInName = tokenIn.try_name().value
    metavaultBridgeInitiated.operator = event.transaction.from
    metavaultBridgeInitiated.safe = event.params.safe
    metavaultBridgeInitiated.tokenIn = event.params.tokenIn
    metavaultBridgeInitiated.amount = event.params.amount
    metavaultBridgeInitiated.dstChainId = event.params.dstChainId.toI32()
    metavaultBridgeInitiated.dstSafe = event.params.dstSafe
    metavaultBridgeInitiated.bridge = event.address
    metavaultBridgeInitiated.bridgeType = event.params.bridge
    metavaultBridgeInitiated.tokenOut = event.params.tokenOut
    metavaultBridgeInitiated.metavault = event.params.safe.toHex()
    metavaultBridgeInitiated.timestamp = event.block.timestamp
    metavaultBridgeInitiated.blockNumber = event.block.number
    metavaultBridgeInitiated.transactionHash = event.transaction.hash
    metavaultBridgeInitiated.logIndex = event.logIndex
    metavaultBridgeInitiated.save()
}
