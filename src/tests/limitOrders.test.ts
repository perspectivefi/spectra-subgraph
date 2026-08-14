import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
    assert,
    beforeEach,
    clearStore,
    describe,
    test,
} from "matchstick-as/assembly"

import {
    handleOrderFilled,
    handleOrderCanceled,
    handleOrderPreSigned,
    handleLimitOrderFeeUpdated,
    handleNonceIncreased,
    handleNonceManagerNonceIncreased,
} from "../mappings/limitOrders"
import {
    createOrderFilledEvent,
    createOrderCanceledEvent,
    createOrderPreSignedEvent,
    createLimitOrderFeeUpdatedEvent,
    createNonceIncreasedEvent,
    DEFAULT_TIMESTAMP,
    DEFAULT_BLOCK,
} from "./events/LimitOrders"

const ORDER_STATUS = "OnChainOrderStatus"
const USER_NONCE = "UserNonce"
const LIMIT_ORDER_FEE = "LimitOrderFee"
const FEE_ID = "limit-order-fee"

const ORDER_HASH = Bytes.fromHexString(
    "0x1111111111111111111111111111111111111111111111111111111111111111"
)
const ORDER_ID = ORDER_HASH.toHexString()
const MAKER = Address.fromString("0x2222222222222222222222222222222222222222")

describe("Limit Orders - handlers", () => {
    beforeEach(() => {
        clearStore()
    })

    describe("handleOrderFilled", () => {
        test("creates OnChainOrderStatus with defaults and records the fill", () => {
            handleOrderFilled(
                createOrderFilledEvent(ORDER_HASH, BigInt.fromI32(500))
            )

            assert.fieldEquals(
                ORDER_STATUS,
                ORDER_ID,
                "orderHash",
                ORDER_HASH.toHexString()
            )
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "totalFilled", "500")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "cancelled", "false")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "isPreSigned", "false")
            assert.fieldEquals(
                ORDER_STATUS,
                ORDER_ID,
                "updatedAt",
                DEFAULT_TIMESTAMP.toString()
            )
            assert.fieldEquals(
                ORDER_STATUS,
                ORDER_ID,
                "updatedAtBlock",
                DEFAULT_BLOCK.toString()
            )
        })

        test("accumulates totalFilled across multiple fills", () => {
            handleOrderFilled(
                createOrderFilledEvent(ORDER_HASH, BigInt.fromI32(500))
            )
            handleOrderFilled(
                createOrderFilledEvent(ORDER_HASH, BigInt.fromI32(300))
            )

            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "totalFilled", "800")
            assert.entityCount(ORDER_STATUS, 1)
        })

        test("tracks updatedAt and updatedAtBlock as later events arrive", () => {
            const firstFill = createOrderFilledEvent(
                ORDER_HASH,
                BigInt.fromI32(500)
            )
            firstFill.block.timestamp = BigInt.fromI32(100)
            firstFill.block.number = BigInt.fromI32(10)
            handleOrderFilled(firstFill)

            const secondFill = createOrderFilledEvent(
                ORDER_HASH,
                BigInt.fromI32(300)
            )
            secondFill.block.timestamp = BigInt.fromI32(200)
            secondFill.block.number = BigInt.fromI32(20)
            handleOrderFilled(secondFill)

            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "updatedAt", "200")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "updatedAtBlock", "20")

            const cancel = createOrderCanceledEvent(MAKER, ORDER_HASH)
            cancel.block.timestamp = BigInt.fromI32(250)
            cancel.block.number = BigInt.fromI32(25)
            handleOrderCanceled(cancel)

            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "updatedAt", "250")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "updatedAtBlock", "25")
        })
    })

    describe("handleOrderCanceled", () => {
        test("marks a fresh order cancelled with zero fill and not pre-signed", () => {
            handleOrderCanceled(createOrderCanceledEvent(MAKER, ORDER_HASH))

            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "cancelled", "true")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "totalFilled", "0")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "isPreSigned", "false")
        })

        test("preserves accumulated fills when cancelling an existing order", () => {
            handleOrderFilled(
                createOrderFilledEvent(ORDER_HASH, BigInt.fromI32(100))
            )
            handleOrderCanceled(createOrderCanceledEvent(MAKER, ORDER_HASH))

            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "cancelled", "true")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "totalFilled", "100")
        })
    })

    describe("handleOrderPreSigned", () => {
        test("creates a pre-signed order with zero fill before any fill", () => {
            handleOrderPreSigned(createOrderPreSignedEvent(ORDER_HASH, MAKER))

            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "isPreSigned", "true")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "totalFilled", "0")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "cancelled", "false")
            assert.fieldEquals(
                ORDER_STATUS,
                ORDER_ID,
                "orderHash",
                ORDER_HASH.toHexString()
            )
        })

        test("pre-sign then fill: stays pre-signed and accumulates the fill", () => {
            handleOrderPreSigned(createOrderPreSignedEvent(ORDER_HASH, MAKER))
            handleOrderFilled(
                createOrderFilledEvent(ORDER_HASH, BigInt.fromI32(250))
            )

            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "isPreSigned", "true")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "totalFilled", "250")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "cancelled", "false")
        })

        test("fill then pre-sign: preserves fills and flips isPreSigned", () => {
            handleOrderFilled(
                createOrderFilledEvent(ORDER_HASH, BigInt.fromI32(700))
            )
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "isPreSigned", "false")

            handleOrderPreSigned(createOrderPreSignedEvent(ORDER_HASH, MAKER))

            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "isPreSigned", "true")
            assert.fieldEquals(ORDER_STATUS, ORDER_ID, "totalFilled", "700")
            assert.entityCount(ORDER_STATUS, 1)
        })
    })

    describe("handleLimitOrderFeeUpdated", () => {
        test("creates the fee singleton with newFee and zero previous", () => {
            handleLimitOrderFeeUpdated(
                createLimitOrderFeeUpdatedEvent(
                    BigInt.fromString("10000000000000000") // 1% in WAD
                )
            )

            assert.fieldEquals(LIMIT_ORDER_FEE, FEE_ID, "previousFee", "0")
            assert.fieldEquals(
                LIMIT_ORDER_FEE,
                FEE_ID,
                "currentFee",
                "10000000000000000"
            )
            assert.entityCount(LIMIT_ORDER_FEE, 1)
        })

        test("derives previousFee from the stored value on subsequent updates", () => {
            handleLimitOrderFeeUpdated(
                createLimitOrderFeeUpdatedEvent(
                    BigInt.fromString("10000000000000000")
                )
            )
            handleLimitOrderFeeUpdated(
                createLimitOrderFeeUpdatedEvent(
                    BigInt.fromString("20000000000000000")
                )
            )

            assert.fieldEquals(
                LIMIT_ORDER_FEE,
                FEE_ID,
                "previousFee",
                "10000000000000000"
            )
            assert.fieldEquals(
                LIMIT_ORDER_FEE,
                FEE_ID,
                "currentFee",
                "20000000000000000"
            )
            assert.entityCount(LIMIT_ORDER_FEE, 1)
        })
    })

    describe("nonce handlers", () => {
        test("handleNonceIncreased tracks the latest nonce per user", () => {
            handleNonceIncreased(
                createNonceIncreasedEvent(
                    MAKER,
                    BigInt.fromI32(5),
                    BigInt.fromI32(6)
                )
            )

            const id = "nonce-" + MAKER.toHexString()
            assert.fieldEquals(USER_NONCE, id, "user", MAKER.toHexString())
            assert.fieldEquals(USER_NONCE, id, "latestNonce", "6")

            handleNonceIncreased(
                createNonceIncreasedEvent(
                    MAKER,
                    BigInt.fromI32(6),
                    BigInt.fromI32(9)
                )
            )
            assert.fieldEquals(USER_NONCE, id, "latestNonce", "9")
            assert.fieldEquals(
                USER_NONCE,
                id,
                "updatedAt",
                DEFAULT_TIMESTAMP.toString()
            )
            assert.fieldEquals(
                USER_NONCE,
                id,
                "updatedAtBlock",
                DEFAULT_BLOCK.toString()
            )
            assert.entityCount(USER_NONCE, 1)
        })

        test("handleNonceManagerNonceIncreased updates the same UserNonce entity", () => {
            handleNonceManagerNonceIncreased(
                createNonceIncreasedEvent(
                    MAKER,
                    BigInt.fromI32(0),
                    BigInt.fromI32(1)
                )
            )

            const id = "nonce-" + MAKER.toHexString()
            assert.fieldEquals(USER_NONCE, id, "latestNonce", "1")
            assert.entityCount(USER_NONCE, 1)
        })

        test("both nonce handlers update the same entity in place", () => {
            handleNonceIncreased(
                createNonceIncreasedEvent(
                    MAKER,
                    BigInt.fromI32(0),
                    BigInt.fromI32(5)
                )
            )

            const id = "nonce-" + MAKER.toHexString()
            assert.fieldEquals(USER_NONCE, id, "latestNonce", "5")
            assert.entityCount(USER_NONCE, 1)

            // NonceManager handler must resolve to the same UserNonce id
            handleNonceManagerNonceIncreased(
                createNonceIncreasedEvent(
                    MAKER,
                    BigInt.fromI32(5),
                    BigInt.fromI32(8)
                )
            )

            assert.fieldEquals(USER_NONCE, id, "latestNonce", "8")
            assert.entityCount(USER_NONCE, 1)
        })
    })
})
