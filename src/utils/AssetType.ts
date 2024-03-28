class AssetType {
    UNDERLYING: string = "UNDERLYING"
    IBT: string = "IBT"
    PT: string = "PT"
    YT: string = "YT"
    FYT: string = "FYT"
    LP: string = "LP"
    LP_VAULT_SHARES: string = "LP_VAULT_SHARES"
    YIELD: string = "YIELD"
    CLAIMED_YIELD: string = "CLAIMED_YIELD"
    UNKNOWN: string = "UNKNOWN"
}

const assetType = new AssetType()
export default assetType
