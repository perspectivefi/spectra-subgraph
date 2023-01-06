import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { POOL_FACTORY_ADDRESS_MOCK } from "./CurvePoolFactory"
import { ETH_ADDRESS_MOCK } from "./ERC20"

export const FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK = Address.fromString(
    "0x0000000000000000000000000000000000000091"
)

export function mockFutureVaultFactoryFunctions(): void {
    ;[
        FIRST_FUTURE_VAULT_FACTORY_ADDRESS_MOCK,
        Address.fromString(ETH_ADDRESS_MOCK),
    ].forEach((addressMock) => {
        createMockedFunction(
            addressMock,
            "curveFactory",
            "curveFactory():(address)"
        ).returns([ethereum.Value.fromAddress(POOL_FACTORY_ADDRESS_MOCK)])
    })
}
