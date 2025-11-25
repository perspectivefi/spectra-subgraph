import { ethereum, BigInt } from "@graphprotocol/graph-ts"

import { Block } from "../../generated/schema"

const INTERVAL = 600 // save one block per 10 minutes

export function handleBlock(block: ethereum.Block): void {
    let lastBlock = Block.load("last")
    if (!lastBlock) {
        lastBlock = new Block("last")
        lastBlock.number = BigInt.fromI32(0)
        lastBlock.timestamp = BigInt.fromI32(0)
    }
    const needsIndexing = block.timestamp
        .div(BigInt.fromI32(INTERVAL))
        .gt(lastBlock.timestamp.div(BigInt.fromI32(INTERVAL)))
    if (needsIndexing) {
        // only save the block if no other block has been saved in the last 10 minutes
        let id = block.hash.toHex()
        let blockEntity = new Block(id)
        blockEntity.number = block.number
        blockEntity.timestamp = block.timestamp
        blockEntity.save()
        lastBlock.timestamp = block.timestamp
        lastBlock.save()
    }
}
