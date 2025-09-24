class AssetType {
    UNDERLYING: string = "UNDERLYING"
    IBT: string = "IBT"
    PT: string = "PT"
    YT: string = "YT"
    FYT: string = "FYT"
    LP: string = "LP"
    MV_SHARES: string = "MV_SHARES"
    MV_REQUEST_DEPOSIT: string = "MV_REQUEST_DEPOSIT"
    MV_REQUEST_REDEEM: string = "MV_REQUEST_REDEEM"
    YIELD: string = "YIELD"
    CLAIMED_YIELD: string = "CLAIMED_YIELD"
    WRAPPER: string = "WRAPPER"
    UNKNOWN: string = "UNKNOWN"
}

const assetType = new AssetType()
export default assetType
