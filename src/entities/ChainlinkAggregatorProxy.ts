import { BigInt } from "@graphprotocol/graph-ts"

import { ChainlinkAggregatorProxy } from "../../generated/schema"
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
        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        timestamp
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
    let asset = getAsset(assetAddress, timestamp)
    proxy.asset = asset.id

    proxy.save()

    return proxy
}
