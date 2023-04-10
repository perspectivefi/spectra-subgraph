import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { toPrecision } from "../../utils/toPrecision"
import { ETH_ADDRESS_MOCK, STANDARD_DECIMALS_MOCK } from "./ERC20"
import { FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK } from "./FutureVaultFactory"
import { PRINCIPAL_TOKEN_ADDRESS_MOCK } from "./LPVault"

export const FIRST_FUTURE_VAULT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000001"
)
export const SECOND_FUTURE_VAULT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000002"
)
export const IBT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000022"
)

export const YT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000333"
)

export const FEE_COLLECTOR_ADDRESS_MOCK = Address.fromString(
    "0x1110000000000000000000000000000000000000"
)

export const DEPOSIT_TRANSACTION_HASH = Bytes.fromHexString(
    "0x1110000000000000000000000000000000000017"
)

export const WITHDRAW_TRANSACTION_HASH = Bytes.fromHexString(
    "0x1111000000000000000000000000000000000017"
)

export const FIRST_USER_MOCK = Address.fromString(
    "0x1010000000000000000000000000000000000000"
)

export const FEE_MOCK = 150

const IBT_RATE_MOCK = toPrecision(BigInt.fromI32(2), 0, STANDARD_DECIMALS_MOCK)

export function mockFutureVaultFunctions(): void {
    ;[
        FIRST_FUTURE_VAULT_ADDRESS_MOCK,
        SECOND_FUTURE_VAULT_ADDRESS_MOCK,
        FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK,
        Address.fromString(ETH_ADDRESS_MOCK),
        PRINCIPAL_TOKEN_ADDRESS_MOCK,
    ].forEach((addressMock) => {
        createMockedFunction(
            addressMock,
            "maturity",
            "maturity():(uint256)"
        ).returns([ethereum.Value.fromI32(2)])

        createMockedFunction(
            addressMock,
            "getProtocolFee",
            "getProtocolFee():(uint256)"
        ).returns([ethereum.Value.fromI32(11)])

        createMockedFunction(addressMock, "name", "name():(string)").returns([
            ethereum.Value.fromString("Test name"),
        ])

        createMockedFunction(
            addressMock,
            "symbol",
            "symbol():(string)"
        ).returns([ethereum.Value.fromString("FUTURE")])

        createMockedFunction(
            addressMock,
            "underlying",
            "underlying():(address)"
        ).returns([
            ethereum.Value.fromAddress(Address.fromString(ETH_ADDRESS_MOCK)),
        ])

        createMockedFunction(
            addressMock,
            "getIBT",
            "getIBT():(address)"
        ).returns([ethereum.Value.fromAddress(IBT_ADDRESS_MOCK)])

        createMockedFunction(
            addressMock,
            "getIBTRate",
            "getIBTRate():(uint256)"
        ).returns([ethereum.Value.fromUnsignedBigInt(IBT_RATE_MOCK)])

        createMockedFunction(addressMock, "getYT", "getYT():(address)").returns(
            [ethereum.Value.fromAddress(YT_ADDRESS_MOCK)]
        )

        createMockedFunction(
            addressMock,
            "totalAssets",
            "totalAssets():(uint256)"
        ).returns([ethereum.Value.fromI32(100)])

        createMockedFunction(
            addressMock,
            "getUnclaimedFeesInIBT",
            "getUnclaimedFeesInIBT():(uint256)"
        ).returns([ethereum.Value.fromI32(FEE_MOCK)])

        createMockedFunction(
            addressMock,
            "getIBTUnit",
            "getIBTUnit():(uint256)"
        ).returns([
            ethereum.Value.fromUnsignedBigInt(
                toPrecision(BigInt.fromI32(10), 0, STANDARD_DECIMALS_MOCK)
            ),
        ])
    })
}
