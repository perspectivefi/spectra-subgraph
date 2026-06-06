import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as/assembly"

import {
    OrderFilled,
    OrderCanceled,
    OrderPreSigned,
    LimitOrderFeeChange,
    NonceIncreased,
} from "../../../generated/LimitOrderEngine/LimitOrderEngine"

// Deterministic block context so handlers write predictable updatedAt / updatedAtBlock
export const LIMIT_ORDER_ENGINE_ADDRESS_MOCK = Address.fromString(
    "0x1234567890123456789012345678901234567890"
)
export const DEFAULT_TIMESTAMP = BigInt.fromI32(1700000000)
export const DEFAULT_BLOCK = BigInt.fromI32(12345)

function withBlock<T extends ethereum.Event>(event: T): T {
    event.address = LIMIT_ORDER_ENGINE_ADDRESS_MOCK
    event.block.timestamp = DEFAULT_TIMESTAMP
    event.block.number = DEFAULT_BLOCK
    return event
}

// OrderFilled(bytes32 orderHash, uint256 actualMaking) — both non-indexed
export function createOrderFilledEvent(
    orderHash: Bytes,
    actualMaking: BigInt
): OrderFilled {
    let event = withBlock(changetype<OrderFilled>(newMockEvent()))

    let orderHashParam = new ethereum.EventParam(
        "orderHash",
        ethereum.Value.fromFixedBytes(orderHash)
    )
    let actualMakingParam = new ethereum.EventParam(
        "actualMaking",
        ethereum.Value.fromUnsignedBigInt(actualMaking)
    )

    event.parameters = [orderHashParam, actualMakingParam]
    return event
}

// OrderCanceled(address maker, bytes32 orderHash) — both non-indexed
export function createOrderCanceledEvent(
    maker: Address,
    orderHash: Bytes
): OrderCanceled {
    let event = withBlock(changetype<OrderCanceled>(newMockEvent()))

    let makerParam = new ethereum.EventParam(
        "maker",
        ethereum.Value.fromAddress(maker)
    )
    let orderHashParam = new ethereum.EventParam(
        "orderHash",
        ethereum.Value.fromFixedBytes(orderHash)
    )

    event.parameters = [makerParam, orderHashParam]
    return event
}

// OrderPreSigned(bytes32 indexed orderHash, address indexed maker)
// indexed params are still placed in declaration order in the params array
export function createOrderPreSignedEvent(
    orderHash: Bytes,
    maker: Address
): OrderPreSigned {
    let event = withBlock(changetype<OrderPreSigned>(newMockEvent()))

    let orderHashParam = new ethereum.EventParam(
        "orderHash",
        ethereum.Value.fromFixedBytes(orderHash)
    )
    let makerParam = new ethereum.EventParam(
        "maker",
        ethereum.Value.fromAddress(maker)
    )

    event.parameters = [orderHashParam, makerParam]
    return event
}

// LimitOrderFeeChange(uint256 previousLimitOrderFee, uint256 newLimitOrderFee)
export function createLimitOrderFeeChangeEvent(
    previousFee: BigInt,
    newFee: BigInt
): LimitOrderFeeChange {
    let event = withBlock(changetype<LimitOrderFeeChange>(newMockEvent()))

    let previousParam = new ethereum.EventParam(
        "previousLimitOrderFee",
        ethereum.Value.fromUnsignedBigInt(previousFee)
    )
    let newParam = new ethereum.EventParam(
        "newLimitOrderFee",
        ethereum.Value.fromUnsignedBigInt(newFee)
    )

    event.parameters = [previousParam, newParam]
    return event
}

// NonceIncreased(address indexed maker, uint256 oldNonce, uint256 newNonce)
export function createNonceIncreasedEvent(
    maker: Address,
    oldNonce: BigInt,
    newNonce: BigInt
): NonceIncreased {
    let event = withBlock(changetype<NonceIncreased>(newMockEvent()))

    let makerParam = new ethereum.EventParam(
        "maker",
        ethereum.Value.fromAddress(maker)
    )
    let oldNonceParam = new ethereum.EventParam(
        "oldNonce",
        ethereum.Value.fromUnsignedBigInt(oldNonce)
    )
    let newNonceParam = new ethereum.EventParam(
        "newNonce",
        ethereum.Value.fromUnsignedBigInt(newNonce)
    )

    event.parameters = [makerParam, oldNonceParam, newNonceParam]
    return event
}
