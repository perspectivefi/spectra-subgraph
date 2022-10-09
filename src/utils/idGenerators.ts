// FYTTokenDetails
export const generateFYTInfoId = (tokenAddress: string): string =>
    `${tokenAddress}-FYT`

// LiquidityTokenDetails
export const generateLPInfoId = (tokenAddress: string): string =>
    `${tokenAddress}-LP`

// AssetAmount
export const generateAssetAmountId = (
    transactionAddress: string,
    assetAddress: string
): string => `${transactionAddress}-${assetAddress}`

// AssetPrice
export const generateAssetPriceId = (
    tokenAddress: string,
    timestamp: string
): string => `${tokenAddress}-${timestamp}`

// UserAsset
export const generateUserAssetId = (
    userAddress: string,
    assetAddress: string
): string => `${userAddress}-${assetAddress}`

// Fees
export const generateFeeClaimId = (
    collectorAddress: string,
    timestamp: string
): string => `${collectorAddress}-${timestamp}`
