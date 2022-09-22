// FYTTokenDetails
export const generateFYTInfoId = (tokenAddress: string): string =>
    `${tokenAddress}-FYT`

// LiquidityTokenDetails
export const generateLPInfoId = (tokenAddress: string): string =>
    `${tokenAddress}-LP`

// AssetAmount
export const generateAssetAmountId = (
    tokenAddress: string,
    owner: string
): string => `${tokenAddress}-${owner}`

// AssetPrice
export const generateAssetPriceId = (
    tokenAddress: string,
    timestamp: string
): string => `${tokenAddress}-${timestamp}`
