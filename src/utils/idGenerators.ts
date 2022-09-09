// FYTTokenDetails
export const generateFYTInfoId = (tokenAddress: string) => `${tokenAddress}-FYT`

// LiquidityTokenDetails
export const generateLPInfoId = (tokenAddress: string) => `${tokenAddress}-LP`

// AssetAmount
export const generateAssetAmountId = (tokenAddress: string, owner: string) =>
    `${tokenAddress}-${owner}`

// AssetPrice
export const generateAssetPriceId = (tokenAddress: string, timestamp: string) =>
    `${tokenAddress}-${timestamp}`
