import { Address, BigInt } from "@graphprotocol/graph-ts"

import { FeedRegistryInterface } from "../../generated/ChainlinkAggregatorDataSource/FeedRegistryInterface"
import { Asset } from "../../generated/schema"
import { FEED_REGISTRY, USD_DENOMINATION } from "../constants"
import { createChainlinkAggregatorProxy } from "./ChainlinkAggregatorProxy"
import { getERC20Decimals, getERC20Name, getERC20Symbol } from "./ERC20"

export function getAsset(address: string, timestamp: BigInt): Asset {
    let asset = Asset.load(address)
    if (asset) {
        return asset
    }

    asset = createAsset(address, timestamp)

    return asset
}

export function createAsset(address: string, timestamp: BigInt): Asset {
    let asset = new Asset(address)
    asset.address = address
    asset.createdAtTimestamp = timestamp
    asset.name = getERC20Name(Address.fromString(address))
    asset.symbol = getERC20Symbol(Address.fromString(address))
    asset.decimals = getERC20Decimals(Address.fromString(address))

    asset.save()

    let fr = FeedRegistryInterface.bind(Address.fromString(FEED_REGISTRY))

    let aggregatorCall = fr.try_getFeed(
        Address.fromString(address),
        Address.fromString(USD_DENOMINATION)
    )

    if (!aggregatorCall.reverted) {
        let proxy = createChainlinkAggregatorProxy(
            aggregatorCall.value.toHex(),
            address,
            timestamp
        )

        asset.chainlinkPriceFeed = proxy.aggregator

        asset.save()
    }

    return asset
}
