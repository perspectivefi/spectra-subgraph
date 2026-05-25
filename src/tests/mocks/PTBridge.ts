import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

export let PT_A_MOCK = Address.fromString(
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
)
export let PT_B_MOCK = Address.fromString(
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
)
export let SENDER_MOCK = Address.fromString(
    "0xcccccccccccccccccccccccccccccccccccccccc"
)
export let UNLOCK_RECIPIENT_MOCK = Address.fromString(
    "0xdddddddddddddddddddddddddddddddddddddddd"
)

export let STELLAR_RECIPIENT_MOCK =
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"

export let LOCKED_TX_HASH_MOCK = Bytes.fromHexString(
    "0x1111111111111111111111111111111111111111111111111111111111111111"
)
export let UNLOCKED_TX_HASH_MOCK = Bytes.fromHexString(
    "0x4444444444444444444444444444444444444444444444444444444444444444"
)
export let STELLAR_TX_HASH_MOCK = Bytes.fromHexString(
    "0x5555555555555555555555555555555555555555555555555555555555555555"
)

export let LOCK_AMOUNT_MOCK = BigInt.fromI64(1_000_000_000_000_000_000) // 1e18
export let UNLOCK_AMOUNT_MOCK = BigInt.fromI64(500_000_000_000_000_000) // 5e17

export let BLOCK_NUMBER_MOCK = BigInt.fromI32(46282984)
export let TIMESTAMP_MOCK = BigInt.fromI32(1716000000)
