import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { toPrecision } from "../../utils/toPrecision"
import { SECOND_POOL_ADDRESS_MOCK } from "./CurvePoolFactory"
import { ETH_ADDRESS_MOCK } from "./ERC20"
import { PRINCIPAL_TOKEN_ADDRESS_MOCK } from "./LPVault"

export const POOL_FACTORY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000555550000000000000"
)

export const FIRST_POOL_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000555550000000000000"
)

export const POOL_IBT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000022"
)

// Same as FIRST_FUTURE_VAULT_ADDRESS_MOCK
export const POOL_PT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000001"
)

export const POOL_LP_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000002222222"
)

export const POOL_ADD_LIQUIDITY_TRANSACTION_HASH = Address.fromString(
    "0x1400000000000000000000000000000000000000"
)

export const POOL_REMOVE_LIQUIDITY_TRANSACTION_HASH = Address.fromString(
    "0x1500000000000000000000000000000000000000"
)

export const POOL_EXCHANGE_TRANSACTION_HASH = Address.fromString(
    "0x1600000000000000000000000000000000000000"
)

export const POOL_SECOND_EXCHANGE_TRANSACTION_HASH = Address.fromString(
    "0x1600000000000000000000000000000000000002"
)

export const POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH = Address.fromString(
    "0x1700000000000000000000000000000000000000"
)

export const POOL_FEE_MOCK = toPrecision(BigInt.fromI32(8), 0, 6)
export const POOL_ADMIN_FEE_MOCK = toPrecision(BigInt.fromI32(5), 1, 10)
export const POOL_FUTURE_ADMIN_FEE_MOCK = toPrecision(BigInt.fromI32(3), 1, 10)

export const POOL_PRICE_SCALE_MOCK = toPrecision(BigInt.fromI32(2), 1, 10)

const createLPTokenCallMack = (addressMock: Address): void => {
    createMockedFunction(addressMock, "token", "token():(address)").returns([
        ethereum.Value.fromAddress(POOL_LP_ADDRESS_MOCK),
    ])
}

const createFeeCallMock = (addressMock: Address): void => {
    createMockedFunction(addressMock, "fee", "fee():(uint256)").returns([
        ethereum.Value.fromSignedBigInt(POOL_FEE_MOCK),
    ])
}

const createAdminFeeCallMock = (addressMock: Address): void => {
    createMockedFunction(
        addressMock,
        "admin_fee",
        "admin_fee():(uint256)"
    ).returns([ethereum.Value.fromSignedBigInt(POOL_ADMIN_FEE_MOCK)])
}

const createFutureAdminFeeCallMock = (addressMock: Address): void => {
    createMockedFunction(
        addressMock,
        "future_admin_fee",
        "future_admin_fee():(uint256)"
    ).returns([ethereum.Value.fromSignedBigInt(POOL_FUTURE_ADMIN_FEE_MOCK)])
}

const createFutureAdminFeeChangeDeadlineCallMock = (
    addressMock: Address
): void => {
    createMockedFunction(
        addressMock,
        "admin_actions_deadline",
        "admin_actions_deadline():(uint256)"
    ).returns([ethereum.Value.fromSignedBigInt(BigInt.fromI32(5))])
}

const createPriceScaleCallMock = (addressMock: Address): void => {
    createMockedFunction(
        addressMock,
        "price_scale",
        "price_scale():(uint256)"
    ).returns([ethereum.Value.fromSignedBigInt(POOL_PRICE_SCALE_MOCK)])
}

const createCoinsCallMock = (addressMock: Address): void => {
    createMockedFunction(addressMock, "coins", "coins(uint256):(address)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))])
        .returns([
            ethereum.Value.fromAddress(Address.fromString(ETH_ADDRESS_MOCK)),
        ])
    createMockedFunction(addressMock, "coins", "coins(uint256):(address)")
        .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))])
        .returns([ethereum.Value.fromAddress(POOL_PT_ADDRESS_MOCK)])
}

const createGetDyCallMock = (addressMock: Address): void => {
    createMockedFunction(
        addressMock,
        "get_dy",
        "get_dy(uint256,uint256,uint256):(uint256)"
    )
        .withArgs([
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)),
            ethereum.Value.fromUnsignedBigInt(
                BigInt.fromString("100000000000000000")
            ),
        ])
        .returns([
            ethereum.Value.fromSignedBigInt(
                BigInt.fromString("900000000000000000")
            ),
        ])
}

const createNegativeGetDyCallMock = (addressMock: Address): void => {
    createMockedFunction(
        addressMock,
        "get_dy",
        "get_dy(uint256,uint256,uint256):(uint256)"
    )
        .withArgs([
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1)),
            ethereum.Value.fromUnsignedBigInt(
                BigInt.fromString("100000000000000000")
            ),
        ])
        .returns([
            ethereum.Value.fromSignedBigInt(
                BigInt.fromString("7000000000000000")
            ),
        ])
}

export function mockCurvePoolFunctions(): void {
    ;[FIRST_POOL_ADDRESS_MOCK, SECOND_POOL_ADDRESS_MOCK].forEach(
        (addressMock) => {
            createLPTokenCallMack(addressMock)
            createFeeCallMock(addressMock)
            createAdminFeeCallMock(addressMock)
            createFutureAdminFeeCallMock(addressMock)
            createFutureAdminFeeChangeDeadlineCallMock(addressMock)
            createPriceScaleCallMock(addressMock)
            createCoinsCallMock(addressMock)
        }
    )
    // Positive APR
    createGetDyCallMock(FIRST_POOL_ADDRESS_MOCK)
    // To test negative APR
    createNegativeGetDyCallMock(SECOND_POOL_ADDRESS_MOCK)
}
