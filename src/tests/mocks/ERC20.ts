import { Address, ethereum, log } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { POOL_LP_ADDRESS_MOCK } from "./CurvePool"
import { POOL_IBT_ADDRESS_MOCK, POOL_PT_ADDRESS_MOCK } from "./CurvePoolFactory"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    YT_ADDRESS_MOCK,
} from "./FutureVault"

export const ETH_ADDRESS_MOCK = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
const ETH_NAME = ethereum.Value.fromString("Ethereum")
const ETH_SYMBOL = ethereum.Value.fromString("ETH")
const ETH_DECIMALS = ethereum.Value.fromI32(18)

const createNameCallMock = (addressMock: Address): void => {
    createMockedFunction(addressMock, "name", "name():(string)").returns([
        ETH_NAME,
    ])
}

const createSymbolCallMock = (addressMock: Address): void => {
    createMockedFunction(addressMock, "symbol", "symbol():(string)").returns([
        ETH_SYMBOL,
    ])
}

const createDecimalsCallMock = (addressMock: Address): void => {
    createMockedFunction(addressMock, "decimals", "decimals():(uint8)").returns(
        [ETH_DECIMALS]
    )
}

export function mockERC20Functions(): void {
    ;[
        Address.fromString(ETH_ADDRESS_MOCK),
        FIRST_FUTURE_VAULT_ADDRESS_MOCK,
        SECOND_FUTURE_VAULT_ADDRESS_MOCK,
        IBT_ADDRESS_MOCK,
        YT_ADDRESS_MOCK,
        POOL_IBT_ADDRESS_MOCK,
        POOL_PT_ADDRESS_MOCK,
        POOL_LP_ADDRESS_MOCK,
    ].forEach((addressMock) => {
        createNameCallMock(addressMock)
        createSymbolCallMock(addressMock)
        createDecimalsCallMock(addressMock)
    })
}
