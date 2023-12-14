import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as"

import { toPrecision } from "../../utils/toPrecision"
import { POOL_LP_ADDRESS_MOCK } from "./CurvePool"
import {
    POOL_IBT_ADDRESS_MOCK,
    POOL_PT_ADDRESS_MOCK,
    OLD_LP_VAULT_REGISTRY_ADDRESS_MOCK,
} from "./Factory"
import {
    FIRST_FUTURE_VAULT_ADDRESS_MOCK,
    SECOND_FUTURE_VAULT_ADDRESS_MOCK,
    IBT_ADDRESS_MOCK,
    YT_ADDRESS_MOCK,
    FIRST_USER_MOCK,
    FEE_COLLECTOR_ADDRESS_MOCK,
} from "./FutureVault"
import { LP_VAULT_ADDRESS_MOCK, LP_VAULT_ASSET_ADDRESS_MOCK } from "./LPVault"
import { RECEIVER_USER_MOCK } from "./Transaction"

export const ETH_ADDRESS_MOCK = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
const ETH_NAME = ethereum.Value.fromString("Ethereum")
const ETH_SYMBOL = ethereum.Value.fromString("ETH")
const ETH_DECIMALS = ethereum.Value.fromI32(18)
export const LP_TOTAL_SUPPLY = toPrecision(BigInt.fromI32(500), 1, 18)

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

const createTotalSupplyCallMock = (addressMock: Address): void => {
    createMockedFunction(
        addressMock,
        "totalSupply",
        "totalSupply():(uint256)"
    ).returns([ethereum.Value.fromUnsignedBigInt(LP_TOTAL_SUPPLY)])
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
        OLD_LP_VAULT_REGISTRY_ADDRESS_MOCK,
        LP_VAULT_ADDRESS_MOCK,
        LP_VAULT_ASSET_ADDRESS_MOCK,
    ].forEach((addressMock) => {
        createNameCallMock(addressMock)
        createSymbolCallMock(addressMock)
        createDecimalsCallMock(addressMock)
        createTotalSupplyCallMock(addressMock)
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

    createMockedFunction(tokenMock, "balanceOf", "balanceOf(address):(uint256)")
        .withArgs([ethereum.Value.fromAddress(FEE_COLLECTOR_ADDRESS_MOCK)])
        .returns([ethereum.Value.fromSignedBigInt(returnVault)])
}

export const FIRST_FUTURE_VAULT_PT_BALANCE_MOCK = BigInt.fromString("100")
export const SECOND_FUTURE_VAULT_PT_BALANCE_MOCK = BigInt.fromString("200")
export const UNDERLYING_BALANCE_MOCK = BigInt.fromString("1100")
export const IBT_BALANCE_MOCK = BigInt.fromString("300")
export const YT_BALANCE_MOCK = BigInt.fromString("400")
export const POOL_IBT_BALANCE_MOCK = BigInt.fromString("500")
export const POOL_PT_BALANCE_MOCK = BigInt.fromString("600")
export const POOL_LP_BALANCE_MOCK = BigInt.fromString("700")
export const LP_VAULT_UNDERLYING_BALANCE_MOCK = BigInt.fromString("800")
export const LP_VAULT_SHARES_BALANCE_MOCK = BigInt.fromString("900")

export function mockERC20Balances(): void {
    createBalanceOfCallMock(
        Address.fromString(ETH_ADDRESS_MOCK),
        UNDERLYING_BALANCE_MOCK
    )
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
    createBalanceOfCallMock(
        LP_VAULT_ASSET_ADDRESS_MOCK,
        LP_VAULT_UNDERLYING_BALANCE_MOCK
    )
    createBalanceOfCallMock(LP_VAULT_ADDRESS_MOCK, LP_VAULT_SHARES_BALANCE_MOCK)
}
