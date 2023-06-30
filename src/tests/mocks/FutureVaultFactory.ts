import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as"

import { FIRST_POOL_ADDRESS_MOCK } from "./CurvePool"
import { POOL_FACTORY_ADDRESS_MOCK } from "./CurvePoolFactory"
import { ETH_ADDRESS_MOCK } from "./ERC20"
import { PRINCIPAL_TOKEN_ADDRESS_MOCK } from "./LPVault"
import {
    NEW_ADDRESS_MOCK,
    OLD_ADDRESS_MOCK,
    THIRD_EVENT_ADDRESS_MOCK,
} from "./Registry"

export const FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000091"
)

let tupleArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(FIRST_POOL_ADDRESS_MOCK),
    ethereum.Value.fromString("Test"),
]
let tuple = changetype<ethereum.Tuple>(tupleArray)
let tupleValue = ethereum.Value.fromTuple(tuple)

export function mockFutureVaultFactoryFunctions(): void {
    ;[
        FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK,
        Address.fromString(ETH_ADDRESS_MOCK),
        OLD_ADDRESS_MOCK,
        NEW_ADDRESS_MOCK,
        Address.fromString(THIRD_EVENT_ADDRESS_MOCK),
    ].forEach((addressMock) => {
        createMockedFunction(
            addressMock,
            "getPool",
            "getPool(address,uint256):((address,string))"
        )
            .withArgs([
                ethereum.Value.fromAddress(PRINCIPAL_TOKEN_ADDRESS_MOCK),
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0)),
            ])
            .returns([tupleValue])

        createMockedFunction(
            addressMock,
            "getPool",
            "getPool(address,uint256):((address,string))"
        )
            .withArgs([
                ethereum.Value.fromAddress(PRINCIPAL_TOKEN_ADDRESS_MOCK),
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(2)),
            ])
            .returns([tupleValue])

        createMockedFunction(
            addressMock,
            "getCurveFactoryAddress",
            "getCurveFactoryAddress():(address)"
        ).returns([ethereum.Value.fromAddress(POOL_FACTORY_ADDRESS_MOCK)])
    })
}
