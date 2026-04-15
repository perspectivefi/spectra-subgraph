class AssetType {
    UNDERLYING: string = "UNDERLYING"
    IBT: string = "IBT"
    PT: string = "PT"
    YT: string = "YT"
    FYT: string = "FYT"
    LP: string = "LP"
    YIELD: string = "YIELD"
    CLAIMED_YIELD: string = "CLAIMED_YIELD"
    WRAPPER: string = "WRAPPER"
    UNKNOWN: string = "UNKNOWN"
}

const assetType = new AssetType()
export default assetType
