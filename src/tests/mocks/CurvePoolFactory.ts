import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { FIRST_USER_MOCK } from "./FutureVault"

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

export const POOL_DEPLOY_TRANSACTION_HASH = Address.fromString(
    "0x0000000000000000000000000000000001112222"
)

export const POOL_FEE_MOCK = BigInt.fromString("8").times(
    BigInt.fromString("10").pow(6 as u8)
)
export const POOL_ADMIN_FEE_MOCK = BigInt.fromString("40").times(
    BigInt.fromString("10").pow(8 as u8)
)

const createFeeReceiverCallMack = (addressMock: Address): void => {
    createMockedFunction(
        addressMock,
        "fee_receiver",
        "fee_receiver():(address)"
    ).returns([ethereum.Value.fromAddress(FIRST_USER_MOCK)])
}

const createAdminCallMock = (addressMock: Address): void => {
    createMockedFunction(addressMock, "admin", "admin():(address)").returns([
        ethereum.Value.fromAddress(FIRST_USER_MOCK),
    ])
}

export function mockMetaPoolFactoryFunctions(): void {
    ;[POOL_FACTORY_ADDRESS_MOCK].forEach((addressMock) => {
        createFeeReceiverCallMack(addressMock)
        createAdminCallMock(addressMock)
    })
}
