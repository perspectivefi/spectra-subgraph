import { Address, BigInt } from "@graphprotocol/graph-ts"

import { Asset } from "../../generated/schema"
import { getERC20Decimals, getERC20Name, getERC20Symbol } from "./ERC20"
import { getNetwork } from "./Network"

export function getAsset(
    address: string,
    timestamp: BigInt,
    type: string
): Asset {
    let asset = Asset.load(address)
    if (asset) {
        return asset
    }

    asset = createAsset(address, timestamp, type)

    return asset as Asset
}

export function createUnderlyingAsset(
    address: string,
    timestamp: BigInt,
    type: string
): Asset {
    let asset = createAsset(address, timestamp, type)

    // TODO: price implementation (no needed at this moment)
    // let fr = FeedRegistryInterface.bind(Address.fromString(FEED_REGISTRY))

    // let aggregatorCall = fr.try_getFeed(
    //     Address.fromString(address),
    //     Address.fromString(USD_DENOMINATION)
    // )

    // if (!aggregatorCall.reverted) {
    //     let proxy = createChainlinkAggregatorProxy(
    //         aggregatorCall.value.toHex(),
    //         address,
    //         timestamp
    //     )
    //
    //     asset.chainlinkPriceFeed = proxy.aggregator
    //
    //     asset.save()
    // }

    asset.save()
    return asset
}

function createAsset(address: string, timestamp: BigInt, type: string): Asset {
    let asset = new Asset(address)
    asset.chainId = getNetwork().chainId
    asset.address = Address.fromString(address)
    asset.createdAtTimestamp = timestamp
    asset.type = type

    asset.name = getERC20Name(Address.fromString(address))
    asset.symbol = getERC20Symbol(Address.fromString(address))
    asset.decimals = getERC20Decimals(Address.fromString(address))

    asset.save()
    return asset
}
