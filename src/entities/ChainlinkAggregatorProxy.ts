import { BigInt } from "@graphprotocol/graph-ts"

import { ChainlinkAggregatorProxy } from "../../generated/schema"
import { ETH_ADDRESS_MOCK } from "../tests/mocks/ERC20"
import { getAsset } from "./Asset"

export function getChainlinkAggregatorProxy(
    id: string,
    timestamp: BigInt
): ChainlinkAggregatorProxy {
    let proxy = ChainlinkAggregatorProxy.load(id)
    if (proxy) {
        return proxy
    }

    let asset = getAsset(
        // Mocked ETH as we have no pool creation event = no asset entity creation flow
        ETH_ADDRESS_MOCK,
        timestamp,
        "UNDERLYING"
    )

    proxy = createChainlinkAggregatorProxy(id, asset.address, timestamp)

    return proxy
}

export function createChainlinkAggregatorProxy(
    id: string,
    assetAddress: string,
    timestamp: BigInt
): ChainlinkAggregatorProxy {
    let proxy = new ChainlinkAggregatorProxy(id)
    proxy.aggregator = id
    let asset = getAsset(assetAddress, timestamp, "UNDERLYING")
    proxy.asset = asset.id

    proxy.save()

    return proxy
}
