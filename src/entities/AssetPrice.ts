import { Address, BigInt } from "@graphprotocol/graph-ts"

import { Asset, AssetPrice } from "../../generated/schema"

export function createAssetPrice(
    assetAddress: string,
    timestamp: BigInt
): AssetPrice {
    let assetPrice = new AssetPrice(`${assetAddress}-${timestamp}`)

    assetPrice.createdAtTimestamp = timestamp

    return assetPrice
}
