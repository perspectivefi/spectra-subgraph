import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts"

import {
    PTLocked as PTLockedEvent,
    PTUnlocked as PTUnlockedEvent,
} from "../../generated/PTBridge/PTBridge"
import { BridgedPt, PtBridgeOperation } from "../../generated/schema"
import { getChainId } from "../utils/ChainId"

function bridgedPtId(chainId: i32, pt: Address): string {
    return chainId.toString() + "-" + pt.toHexString()
}

function operationId(txHash: Bytes, logIndex: BigInt): Bytes {
    return txHash.concatI32(logIndex.toI32())
}

export function handlePTLocked(event: PTLockedEvent): void {
    let chainId = getChainId(dataSource.network())

    // BridgedPt: write-once, first occurrence wins.
    let id = bridgedPtId(chainId, event.params.pt)
    let existing = BridgedPt.load(id)
    if (existing == null) {
        let row = new BridgedPt(id)
        row.chainId = chainId
        row.pt = event.params.pt
        row.firstBridgedAt = event.block.timestamp
        row.firstBridgedTx = event.transaction.hash
        row.save()
    }

    // Always record the operation.
    let op = new PtBridgeOperation(
        operationId(event.transaction.hash, event.logIndex)
    )
    op.kind = "LOCKED"
    op.chainId = chainId
    op.pt = event.params.pt
    op.sender = event.params.sender
    op.amount = event.params.amount
    op.stellarRecipient = event.params.stellarRecipient
    op.blockNumber = event.block.number
    op.timestamp = event.block.timestamp
    op.txHash = event.transaction.hash
    op.save()
}

export function handlePTUnlocked(event: PTUnlockedEvent): void {
    let chainId = getChainId(dataSource.network())

    let op = new PtBridgeOperation(
        operationId(event.transaction.hash, event.logIndex)
    )
    op.kind = "UNLOCKED"
    op.chainId = chainId
    op.pt = event.params.pt
    op.sender = null
    op.amount = event.params.amount
    op.stellarRecipient = null
    op.blockNumber = event.block.number
    op.timestamp = event.block.timestamp
    op.txHash = event.transaction.hash
    op.save()
}
