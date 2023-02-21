import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as"

import { POOL_LP_ADDRESS_MOCK } from "./CurvePool"
import { POOL_IBT_ADDRESS_MOCK, POOL_PT_ADDRESS_MOCK } from "./CurvePoolFactory"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    YT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
} from "./FutureVault"
import { LP_VAULT_ADDRESS_MOCK, LP_VAULT_ASSET_ADDRESS_MOCK } from "./LPVault"
import { OLD_LP_VAULT_FACTORY_ADDRESS_MOCK } from "./LPVaultFactory"
import { RECEIVER_USER_MOCK } from "./Transaction"

export const ETH_ADDRESS_MOCK = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
const ETH_NAME = ethereum.Value.fromString("Ethereum")
const ETH_SYMBOL = ethereum.Value.fromString("ETH")
const ETH_DECIMALS = ethereum.Value.fromI32(18)

export const STANDARD_DECIMALS_MOCK = 18 as u8

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
        OLD_LP_VAULT_FACTORY_ADDRESS_MOCK,
        LP_VAULT_ADDRESS_MOCK,
        LP_VAULT_ASSET_ADDRESS_MOCK,
    ].forEach((addressMock) => {
        createNameCallMock(addressMock)
        createSymbolCallMock(addressMock)
        createDecimalsCallMock(addressMock)
    })
}

const createBalanceOfCallMock = (
    tokenMock: Address,
    returnVault: BigInt
): void => {
    createMockedFunction(tokenMock, "balanceOf", "balanceOf(address):(uint256)")
        .withArgs([ethereum.Value.fromAddress(FIRST_USER_MOCK)])
        .returns([ethereum.Value.fromUnsignedBigInt(returnVault)])

    createMockedFunction(tokenMock, "balanceOf", "balanceOf(address):(uint256)")
        .withArgs([ethereum.Value.fromAddress(RECEIVER_USER_MOCK)])
        .returns([ethereum.Value.fromSignedBigInt(returnVault)])
}

export const FIRST_FUTURE_VAULT_PT_BALANCE_MOCK = BigInt.fromString("100")
export const SECOND_FUTURE_VAULT_PT_BALANCE_MOCK = BigInt.fromString("200")
export const IBT_BALANCE_MOCK = BigInt.fromString("300")
export const YT_BALANCE_MOCK = BigInt.fromString("400")
export const POOL_IBT_BALANCE_MOCK = BigInt.fromString("500")
export const POOL_PT_BALANCE_MOCK = BigInt.fromString("600")
export const POOL_LP_BALANCE_MOCK = BigInt.fromString("700")

export function mockERC20Balances(): void {
    createBalanceOfCallMock(
        FIRST_FUTURE_VAULT_ADDRESS_MOCK,
        FIRST_FUTURE_VAULT_PT_BALANCE_MOCK
    )
    createBalanceOfCallMock(
        SECOND_FUTURE_VAULT_ADDRESS_MOCK,
        SECOND_FUTURE_VAULT_PT_BALANCE_MOCK
    )
    createBalanceOfCallMock(IBT_ADDRESS_MOCK, IBT_BALANCE_MOCK)
    createBalanceOfCallMock(YT_ADDRESS_MOCK, YT_BALANCE_MOCK)
    createBalanceOfCallMock(POOL_IBT_ADDRESS_MOCK, POOL_IBT_BALANCE_MOCK)
    createBalanceOfCallMock(POOL_PT_ADDRESS_MOCK, POOL_PT_BALANCE_MOCK)
    createBalanceOfCallMock(POOL_LP_ADDRESS_MOCK, POOL_LP_BALANCE_MOCK)
}
