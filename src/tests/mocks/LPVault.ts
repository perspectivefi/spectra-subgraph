import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as"

export const LP_VAULT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000557791"
)

export const IMPLEMENTATION_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000567791"
)

export const PRINCIPAL_TOKEN_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000577791"
)

export const LP_VAULT_ASSET_ADDRESS_MOCK = Address.fromString(
    "0x8700000000000000000000000000000000577791"
)

export const DEPOSIT_TRANSACTION_HASH = Bytes.fromHexString(
    "0x2220000000000000000000000000000000000017"
)

export const WITHDRAW_TRANSACTION_HASH = Bytes.fromHexString(
    "0x2222000000000000000000000000000000000017"
)

export function mockLPVaultFunctions(): void {
    createMockedFunction(
        LP_VAULT_ADDRESS_MOCK,
        "asset",
        "asset():(address)"
    ).returns([ethereum.Value.fromAddress(LP_VAULT_ASSET_ADDRESS_MOCK)])

    createMockedFunction(
        LP_VAULT_ADDRESS_MOCK,
        "name",
        "name():(string)"
    ).returns([ethereum.Value.fromString("LP Vault Name")])

    createMockedFunction(
        LP_VAULT_ADDRESS_MOCK,
        "symbol",
        "symbol():(string)"
    ).returns([ethereum.Value.fromString("LP Vault Symbol")])

    createMockedFunction(
        LP_VAULT_ADDRESS_MOCK,
        "totalAssets",
        "totalAssets():(uint256)"
    ).returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(111))])
}
