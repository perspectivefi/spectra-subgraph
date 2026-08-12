import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeEach,
    clearStore,
    describe,
    newMockEvent,
    test,
} from "matchstick-as/assembly"

import {
    NonceIncreased,
    OrderCanceled,
    OrderFilled,
} from "../../generated/LimitOrderEngine/LimitOrderEngine"
import {
    handleNonceIncreased,
    handleOrderCanceled,
    handleOrderFilled,
} from "../mappings/limitOrders"

const MAKER = Address.fromString("0x1234567890123456789012345678901234567890")
const ORDER_HASH = Bytes.fromHexString(
    "0x1111111111111111111111111111111111111111111111111111111111111111"
)

function orderFilled(amount: BigInt, timestamp: i32, blockNumber: i32): void {
    const event = changetype<OrderFilled>(newMockEvent())
    event.block.timestamp = BigInt.fromI32(timestamp)
    event.block.number = BigInt.fromI32(blockNumber)
    event.parameters = [
        new ethereum.EventParam(
            "orderHash",
            ethereum.Value.fromFixedBytes(ORDER_HASH)
        ),
        new ethereum.EventParam(
            "actualMaking",
            ethereum.Value.fromUnsignedBigInt(amount)
        ),
    ]
    handleOrderFilled(event)
}

function orderCanceled(timestamp: i32, blockNumber: i32): void {
    const event = changetype<OrderCanceled>(newMockEvent())
    event.block.timestamp = BigInt.fromI32(timestamp)
    event.block.number = BigInt.fromI32(blockNumber)
    event.parameters = [
        new ethereum.EventParam("maker", ethereum.Value.fromAddress(MAKER)),
        new ethereum.EventParam(
            "orderHash",
            ethereum.Value.fromFixedBytes(ORDER_HASH)
        ),
    ]
    handleOrderCanceled(event)
}

function nonceIncreased(
    oldNonce: i32,
    newNonce: i32,
    timestamp: i32,
    blockNumber: i32
): void {
    const event = changetype<NonceIncreased>(newMockEvent())
    event.block.timestamp = BigInt.fromI32(timestamp)
    event.block.number = BigInt.fromI32(blockNumber)
    event.parameters = [
        new ethereum.EventParam("maker", ethereum.Value.fromAddress(MAKER)),
        new ethereum.EventParam(
            "oldNonce",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(oldNonce))
        ),
        new ethereum.EventParam(
            "newNonce",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(newNonce))
        ),
    ]
    handleNonceIncreased(event)
}

describe("Limit order lifecycle", () => {
    beforeEach(() => {
        clearStore()
    })

    test("accumulates successive fills through the production handler", () => {
        orderFilled(BigInt.fromI32(500), 100, 10)
        orderFilled(BigInt.fromI32(300), 200, 20)

        const id = ORDER_HASH.toHexString()
        assert.entityCount("OnChainOrderStatus", 1)
        assert.fieldEquals("OnChainOrderStatus", id, "totalFilled", "800")
        assert.fieldEquals("OnChainOrderStatus", id, "cancelled", "false")
        assert.fieldEquals("OnChainOrderStatus", id, "updatedAt", "200")
        assert.fieldEquals("OnChainOrderStatus", id, "updatedAtBlock", "20")
    })

    test("preserves fills when an order is cancelled", () => {
        orderFilled(BigInt.fromI32(500), 100, 10)
        orderCanceled(250, 25)

        const id = ORDER_HASH.toHexString()
        assert.fieldEquals("OnChainOrderStatus", id, "totalFilled", "500")
        assert.fieldEquals("OnChainOrderStatus", id, "cancelled", "true")
        assert.fieldEquals("OnChainOrderStatus", id, "updatedAt", "250")
        assert.fieldEquals("OnChainOrderStatus", id, "updatedAtBlock", "25")
    })

    test("records cancellation before any fill", () => {
        orderCanceled(300, 30)

        const id = ORDER_HASH.toHexString()
        assert.fieldEquals("OnChainOrderStatus", id, "totalFilled", "0")
        assert.fieldEquals("OnChainOrderStatus", id, "cancelled", "true")
    })

    test("tracks the latest nonce and its chain position", () => {
        nonceIncreased(5, 6, 400, 40)
        nonceIncreased(6, 9, 500, 50)

        const id = "nonce-" + MAKER.toHexString()
        assert.entityCount("UserNonce", 1)
        assert.fieldEquals("UserNonce", id, "user", MAKER.toHexString())
        assert.fieldEquals("UserNonce", id, "latestNonce", "9")
        assert.fieldEquals("UserNonce", id, "updatedAt", "500")
        assert.fieldEquals("UserNonce", id, "updatedAtBlock", "50")
    })
})
