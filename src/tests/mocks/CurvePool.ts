import { Address, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

export const POOL_FACTORY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000555550000000000000"
)

export const FIRST_POOL_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000555550000000000000"
)

export const POOL_IBT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000022"
)

export const POOL_PT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000002222"
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

export const POOL_REMOVE_LIQUIDITY_ONE_TRANSACTION_HASH = Address.fromString(
    "0x1700000000000000000000000000000000000000"
)

export const POOL_FEE_MOCK = 555
export const POOL_ADMIN_FEE_MOCK = 55

const createLPTokenCallMack = (addressMock: Address): void => {
    createMockedFunction(addressMock, "token", "token():(address)").returns([
        ethereum.Value.fromAddress(POOL_LP_ADDRESS_MOCK),
    ])
}

const createFeeCallMock = (addressMock: Address): void => {
    createMockedFunction(addressMock, "fee", "fee():(uint256)").returns([
        ethereum.Value.fromI32(POOL_FEE_MOCK),
    ])
}

const createAdminFeeCallMock = (addressMock: Address): void => {
    createMockedFunction(
        addressMock,
        "admin_fee",
        "admin_fee():(uint256)"
    ).returns([ethereum.Value.fromI32(POOL_ADMIN_FEE_MOCK)])
}

export function mockCurvePoolFunctions(): void {
    ;[FIRST_POOL_ADDRESS_MOCK].forEach((addressMock) => {
        createLPTokenCallMack(addressMock)
        createFeeCallMock(addressMock)
        createAdminFeeCallMock(addressMock)
    })
}
