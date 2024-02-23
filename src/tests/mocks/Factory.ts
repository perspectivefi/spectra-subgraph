import { Address, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly"

import { ETH_ADDRESS_MOCK } from "./ERC20"
import {
    NEW_ADDRESS_MOCK,
    OLD_ADDRESS_MOCK,
    THIRD_EVENT_ADDRESS_MOCK,
} from "./Registry"

export const FACTORY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000091"
)

export const CURVE_OLD_FACTORY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000555550000000000002"
)

export const CURVE_FACTORY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000555550000000000000"
)

export const POOL_IBT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000022"
)

// Same as FIRST_FUTURE_VAULT_ADDRESS_MOCK
export const POOL_PT_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000001"
)

export const POOL_DEPLOY_TRANSACTION_HASH = Address.fromString(
    "0x0000000000000000000000000000000001112222"
)
export const OLD_LP_VAULT_REGISTRY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000007791"
)
export const NEW_LP_VAULT_REGISTRY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000007792"
)

// let tupleArray: Array<ethereum.Value> = [
//     ethereum.Value.fromAddress(FIRST_POOL_ADDRESS_MOCK),
//     ethereum.Value.fromString("Test"),
// ]
// let tuple = changetype<ethereum.Tuple>(tupleArray)
// let tupleValue = ethereum.Value.fromTuple(tuple)

export function mockFactoryFunctions(): void {
    ;[
        FACTORY_ADDRESS_MOCK,
        Address.fromString(ETH_ADDRESS_MOCK),
        OLD_ADDRESS_MOCK,
        NEW_ADDRESS_MOCK,
        Address.fromString(THIRD_EVENT_ADDRESS_MOCK),
    ].forEach((addressMock) => {
        createMockedFunction(
            addressMock,
            "getCurveFactory",
            "getCurveFactory():(address)"
        ).returns([ethereum.Value.fromAddress(CURVE_FACTORY_ADDRESS_MOCK)])
    })
}
