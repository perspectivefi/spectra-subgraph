import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as"

import {
    PTLocked,
    PTUnlocked,
} from "../../../generated/PTBridge/PTBridge"
import { handlePTLocked, handlePTUnlocked } from "../../mappings/ptBridge"
import {
    PT_A_MOCK,
    PT_B_MOCK,
    SENDER_MOCK,
    STELLAR_RECIPIENT_MOCK,
    LOCKED_TX_HASH_MOCK,
    UNLOCKED_TX_HASH_MOCK,
    UNLOCK_RECIPIENT_MOCK,
    STELLAR_TX_HASH_MOCK,
    LOCK_AMOUNT_MOCK,
    UNLOCK_AMOUNT_MOCK,
    BLOCK_NUMBER_MOCK,
    TIMESTAMP_MOCK,
} from "../mocks/PTBridge"

function buildPTLockedEvent(
    pt: Address,
    sender: Address,
    amount: BigInt,
    stellarRecipient: string,
    txHash: Bytes,
    logIndex: i32
): PTLocked {
    let event = changetype<PTLocked>(newMockEvent())
    event.transaction.hash = txHash
    event.logIndex = BigInt.fromI32(logIndex)
    event.block.number = BLOCK_NUMBER_MOCK
    event.block.timestamp = TIMESTAMP_MOCK
    event.parameters = [
        new ethereum.EventParam(
            "nonce",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
        ),
        new ethereum.EventParam("pt", ethereum.Value.fromAddress(pt)),
        new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender)),
        new ethereum.EventParam(
            "amount",
            ethereum.Value.fromUnsignedBigInt(amount)
        ),
        new ethereum.EventParam(
            "stellarRecipient",
            ethereum.Value.fromString(stellarRecipient)
        ),
        new ethereum.EventParam(
            "sourceChainId",
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(8453))
        ),
    ]
    return event
}

function buildPTUnlockedEvent(
    pt: Address,
    recipient: Address,
    amount: BigInt,
    stellarTxHash: Bytes,
    txHash: Bytes,
    logIndex: i32
): PTUnlocked {
    let event = changetype<PTUnlocked>(newMockEvent())
    event.transaction.hash = txHash
    event.logIndex = BigInt.fromI32(logIndex)
    event.block.number = BLOCK_NUMBER_MOCK
    event.block.timestamp = TIMESTAMP_MOCK
    event.parameters = [
        new ethereum.EventParam(
            "stellarTxHash",
            ethereum.Value.fromFixedBytes(stellarTxHash)
        ),
        new ethereum.EventParam("pt", ethereum.Value.fromAddress(pt)),
        new ethereum.EventParam(
            "recipient",
            ethereum.Value.fromAddress(recipient)
        ),
        new ethereum.EventParam(
            "amount",
            ethereum.Value.fromUnsignedBigInt(amount)
        ),
    ]
    return event
}

/** Lock PT_A from SENDER_MOCK to STELLAR_RECIPIENT_MOCK (txHash = LOCKED_TX_HASH_MOCK, logIndex 0). */
export function emitPTLockedA(): void {
    handlePTLocked(
        buildPTLockedEvent(
            PT_A_MOCK,
            SENDER_MOCK,
            LOCK_AMOUNT_MOCK,
            STELLAR_RECIPIENT_MOCK,
            LOCKED_TX_HASH_MOCK,
            0
        )
    )
}

/** Lock PT_A again (different tx + logIndex) to verify BridgedPt is write-once. */
export function emitPTLockedAAgain(): void {
    let secondTx = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
    )
    handlePTLocked(
        buildPTLockedEvent(
            PT_A_MOCK,
            SENDER_MOCK,
            LOCK_AMOUNT_MOCK,
            STELLAR_RECIPIENT_MOCK,
            secondTx,
            0
        )
    )
}

/** Lock PT_B from SENDER_MOCK to STELLAR_RECIPIENT_MOCK. */
export function emitPTLockedB(): void {
    let tx = Bytes.fromHexString(
        "0x3333333333333333333333333333333333333333333333333333333333333333"
    )
    handlePTLocked(
        buildPTLockedEvent(
            PT_B_MOCK,
            SENDER_MOCK,
            LOCK_AMOUNT_MOCK,
            STELLAR_RECIPIENT_MOCK,
            tx,
            0
        )
    )
}

/** Unlock PT_A back to UNLOCK_RECIPIENT_MOCK. */
export function emitPTUnlockedA(): void {
    handlePTUnlocked(
        buildPTUnlockedEvent(
            PT_A_MOCK,
            UNLOCK_RECIPIENT_MOCK,
            UNLOCK_AMOUNT_MOCK,
            STELLAR_TX_HASH_MOCK,
            UNLOCKED_TX_HASH_MOCK,
            0
        )
    )
}
