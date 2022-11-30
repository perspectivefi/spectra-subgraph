import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { toPrecision } from "../../utils/toPrecision"
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

export const POOL_FEE_MOCK = toPrecision(BigInt.fromI32(8), 2, 8)
export const POOL_ADMIN_FEE_MOCK = toPrecision(BigInt.fromI32(40), 0, 8)

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
