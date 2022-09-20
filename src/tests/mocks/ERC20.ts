import { Address, ethereum, log } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

export const ETH_ADDRESS_MOCK = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
const ETH_NAME = ethereum.Value.fromString("Ethereum")
const ETH_SYMBOL = ethereum.Value.fromString("ETH")
const ETH_DECIMALS = ethereum.Value.fromI32(18)

export function mockERC20Functions(): void {
    createMockedFunction(
        Address.fromString(ETH_ADDRESS_MOCK),
        "name",
        "name():(string)"
    ).returns([ETH_NAME])
    createMockedFunction(
        Address.fromString(ETH_ADDRESS_MOCK),
        "symbol",
        "symbol():(string)"
    ).returns([ETH_SYMBOL])
    createMockedFunction(
        Address.fromString(ETH_ADDRESS_MOCK),
        "decimals",
        "decimals():(uint8)"
    ).returns([ETH_DECIMALS])
}
