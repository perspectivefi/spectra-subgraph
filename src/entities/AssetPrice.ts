import { BigInt } from "@graphprotocol/graph-ts"

import { AssetPrice } from "../../generated/schema"
import { generateAssetPriceId } from "../utils"

export function createAssetPrice(
    assetAddress: string,
    timestamp: BigInt
): AssetPrice {
    let assetPrice = new AssetPrice(
        generateAssetPriceId(assetAddress, timestamp.toString())
    )

    assetPrice.createdAtTimestamp = timestamp

    return assetPrice
}
