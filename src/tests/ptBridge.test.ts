import { dataSourceMock } from "matchstick-as"
import {
    describe,
    test,
    clearStore,
    assert,
    beforeEach,
} from "matchstick-as/assembly"

import {
    emitPTLockedA,
    emitPTLockedAAgain,
    emitPTLockedB,
    emitPTUnlockedA,
} from "./events/PTBridge"
import {
    PT_A_MOCK,
    PT_B_MOCK,
    SENDER_MOCK,
    STELLAR_RECIPIENT_MOCK,
    LOCKED_TX_HASH_MOCK,
    UNLOCKED_TX_HASH_MOCK,
    LOCK_AMOUNT_MOCK,
    UNLOCK_AMOUNT_MOCK,
    TIMESTAMP_MOCK,
} from "./mocks/PTBridge"
import {
    BRIDGED_PT_ENTITY,
    PT_BRIDGE_OPERATION_ENTITY,
} from "./utils/entities"

let BASE_CHAIN_ID = "8453"

describe("handlePTLocked() - Base network", () => {
    beforeEach(() => {
        clearStore()
        // matchstick defaults to "mainnet"; force Base so chainId = 8453.
        dataSourceMock.setNetwork("base")
    })

    test("creates a BridgedPt for the first lock of a PT", () => {
        emitPTLockedA()

        assert.entityCount(BRIDGED_PT_ENTITY, 1)
        let id = BASE_CHAIN_ID + "-" + PT_A_MOCK.toHexString()
        assert.fieldEquals(BRIDGED_PT_ENTITY, id, "chainId", BASE_CHAIN_ID)
        assert.fieldEquals(
            BRIDGED_PT_ENTITY,
            id,
            "pt",
            PT_A_MOCK.toHexString()
        )
        assert.fieldEquals(
            BRIDGED_PT_ENTITY,
            id,
            "firstBridgedAt",
            TIMESTAMP_MOCK.toString()
        )
        assert.fieldEquals(
            BRIDGED_PT_ENTITY,
            id,
            "firstBridgedTx",
            LOCKED_TX_HASH_MOCK.toHexString()
        )
    })

    test("does not create a second BridgedPt when the same PT is locked again", () => {
        emitPTLockedA()
        emitPTLockedAAgain()

        // Still exactly one BridgedPt for PT_A. (immutable - first write wins.)
        assert.entityCount(BRIDGED_PT_ENTITY, 1)
        // And two operations.
        assert.entityCount(PT_BRIDGE_OPERATION_ENTITY, 2)
    })

    test("creates a separate BridgedPt for each distinct PT", () => {
        emitPTLockedA()
        emitPTLockedB()

        assert.entityCount(BRIDGED_PT_ENTITY, 2)
        assert.entityCount(PT_BRIDGE_OPERATION_ENTITY, 2)
    })

    test("creates a PtBridgeOperation with kind=LOCKED carrying full payload", () => {
        emitPTLockedA()

        assert.entityCount(PT_BRIDGE_OPERATION_ENTITY, 1)
        // Operation id is txHash.concatI32(logIndex).
        let opId = LOCKED_TX_HASH_MOCK.concatI32(0)
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "kind",
            "LOCKED"
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "chainId",
            BASE_CHAIN_ID
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "pt",
            PT_A_MOCK.toHexString()
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "sender",
            SENDER_MOCK.toHexString()
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "amount",
            LOCK_AMOUNT_MOCK.toString()
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "stellarRecipient",
            STELLAR_RECIPIENT_MOCK
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "txHash",
            LOCKED_TX_HASH_MOCK.toHexString()
        )
    })
})

describe("handlePTUnlocked() - Base network", () => {
    beforeEach(() => {
        clearStore()
        dataSourceMock.setNetwork("base")
    })

    test("creates a PtBridgeOperation with kind=UNLOCKED and no BridgedPt", () => {
        emitPTUnlockedA()

        // UNLOCKED should never create a BridgedPt row on its own.
        assert.entityCount(BRIDGED_PT_ENTITY, 0)
        assert.entityCount(PT_BRIDGE_OPERATION_ENTITY, 1)

        let opId = UNLOCKED_TX_HASH_MOCK.concatI32(0)
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "kind",
            "UNLOCKED"
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "chainId",
            BASE_CHAIN_ID
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "pt",
            PT_A_MOCK.toHexString()
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "amount",
            UNLOCK_AMOUNT_MOCK.toString()
        )
        assert.fieldEquals(
            PT_BRIDGE_OPERATION_ENTITY,
            opId.toHexString(),
            "txHash",
            UNLOCKED_TX_HASH_MOCK.toHexString()
        )
    })

    test("locking then unlocking yields one BridgedPt and two operations", () => {
        emitPTLockedA()
        emitPTUnlockedA()

        assert.entityCount(BRIDGED_PT_ENTITY, 1)
        assert.entityCount(PT_BRIDGE_OPERATION_ENTITY, 2)
    })
})
