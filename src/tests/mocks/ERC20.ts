import { Address, ethereum, log } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { IBT_ADDRESS_MOCK } from "./FutureVault"

export const ETH_ADDRESS_MOCK = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
const ETH_NAME = ethereum.Value.fromString("Ethereum")
const ETH_SYMBOL = ethereum.Value.fromString("ETH")
const ETH_DECIMALS = ethereum.Value.fromI32(18)

export function mockERC20Functions(): void {
    ;[Address.fromString(ETH_ADDRESS_MOCK), IBT_ADDRESS_MOCK].forEach(
        (addressMock) => {
            createMockedFunction(
                addressMock,
                "name",
                "name():(string)"
            ).returns([ETH_NAME])
            createMockedFunction(
                addressMock,
                "symbol",
                "symbol():(string)"
            ).returns([ETH_SYMBOL])
            createMockedFunction(
                addressMock,
                "decimals",
                "decimals():(uint8)"
            ).returns([ETH_DECIMALS])
        }
    )
}
