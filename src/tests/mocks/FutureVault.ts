import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { ETH_ADDRESS_MOCK } from "./ERC20"

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

export function mockFutureVaultFunctions(): void {
    ;[
        FIRST_FUTURE_VAULT_ADDRESS_MOCK,
        SECOND_FUTURE_VAULT_ADDRESS_MOCK,
        Address.fromString(ETH_ADDRESS_MOCK),
    ].forEach((addressMock) => {
        createMockedFunction(
            addressMock,
            "EXPIRY",
            "EXPIRY():(uint256)"
        ).returns([ethereum.Value.fromI32(1)])

        createMockedFunction(
            addressMock,
            "MAX_PROTOCOL_FEE",
            "MAX_PROTOCOL_FEE():(uint256)"
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

        createMockedFunction(addressMock, "asset", "asset():(address)").returns(
            [ethereum.Value.fromAddress(IBT_ADDRESS_MOCK)]
        )

        createMockedFunction(addressMock, "yt", "yt():(address)").returns([
            ethereum.Value.fromAddress(YT_ADDRESS_MOCK),
        ])

        createMockedFunction(
            addressMock,
            "totalAssets",
            "totalAssets():(uint256)"
        ).returns([ethereum.Value.fromI32(100)])
    })
}
