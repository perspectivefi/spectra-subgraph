import { AnswerUpdated } from "../../generated/ChainlinkAggregatorDataSource/ChainlinkAggregatorProxyContract"
import { Asset } from "../../generated/schema"
import { createAssetPrice } from "../entities/AssetPrice"
import { getChainlinkAggregatorProxy } from "../entities/ChainlinkAggregatorProxy"
import { bigIntToBigDecimal } from "../utils/bigIntToBigDecimal"

// We should fetch aggregator address for all the missing tokens on pool creation using FeedRegistryInterface
// Then we should just use that aggregator if its asset exist already
// That is how price fetching will work dynamically for permissionless purpose (for the tokens supported by chainlink)

export function handleAnswerUpdated(event: AnswerUpdated): void {
    let proxy = getChainlinkAggregatorProxy(
        event.address.toHex(),
        event.block.timestamp
    )

    // only for the assets existing in APWine protocol and has been included in a pool
    let asset = Asset.load(proxy.asset)

    if (asset) {
        let assetPrice = createAssetPrice(asset.id, event.block.timestamp)

        assetPrice.value = bigIntToBigDecimal(
            event.params.current,
            asset.decimals
        )
        assetPrice.source = "CHAINLINK"
        assetPrice.asset = asset.id
        assetPrice.save()

        asset.price = assetPrice.id
        asset.save()
    }
}
