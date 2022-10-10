import { Address, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

export const FIRST_FUTURE_VAULT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000001"
)
export const SECOND_FUTURE_VAULT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000002"
)

export function mockFutureVaultFunctions(): void {
    ;[
        FIRST_FUTURE_VAULT_ADDRESS_MOCK,
        SECOND_FUTURE_VAULT_ADDRESS_MOCK,
    ].forEach((addressMock) => {
        createMockedFunction(
            addressMock,
            "EXPIRY",
            "EXPIRY():(uint256)"
        ).returns([ethereum.Value.fromI32(1)])
    })
}
