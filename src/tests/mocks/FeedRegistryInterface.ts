import { Address, ethereum } from "@graphprotocol/graph-ts"
import { createMockedFunction } from "matchstick-as/assembly/index"

import { FEED_REGISTRY, USD_DENOMINATION } from "../../constants"
import { ETH_ADDRESS_MOCK } from "./ERC20"

const ETH_AGGREGATOR_ADDRESS = Address.fromString(
    "0x37bc7498f4ff12c19678ee8fe19d713b87f6a9e6"
)

export function mockFeedRegistryInterfaceFunctions(): void {
    createMockedFunction(
        Address.fromString(FEED_REGISTRY),
        "getFeed",
        "getFeed(address,address):(address)"
    )
        .withArgs([
            ethereum.Value.fromAddress(Address.fromString(ETH_ADDRESS_MOCK)),
            ethereum.Value.fromAddress(Address.fromString(USD_DENOMINATION)),
        ])
        .returns([ethereum.Value.fromAddress(ETH_AGGREGATOR_ADDRESS)])
}
