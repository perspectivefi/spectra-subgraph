import { Bytes } from "@graphprotocol/graph-ts"

// FYTTokenDetails
export const generateFYTInfoId = (tokenAddress: string): string =>
    `${tokenAddress}-FYT`

// LiquidityTokenDetails
export const generateLPInfoId = (tokenAddress: string): string =>
    `${tokenAddress}-LP`

// AssetAmount
export const generateAssetAmountId = (
    transactionHash: string,
    assetAddress: string
): string => `${transactionHash}-${assetAddress}`

// AssetPrice
export const generateAssetPriceId = (
    tokenAddress: string,
    timestamp: string
): string => `${timestamp}-${tokenAddress}`

// AccountAsset
export const generateAccountAssetId = (
    accountAddress: string,
    assetAddress: string
): string => `${accountAddress}-${assetAddress}`

// Fees
export const generateFeeClaimId = (
    collectorAddress: string,
    timestamp: string
): string => `${timestamp}-${collectorAddress}`

// Transfer
export const generateTransferId = (
    transactionHash: string,
    timestamp: string
): string => `${timestamp}-${transactionHash}`

// FutureDailyStats
export const generateFutureDailyStatsId = (
    futureAddress: string,
    dayId: string
): string => `${futureAddress}-${dayId}`

export const generateTransactionId = (
    transactionHash: Bytes,
    eventIterator: string
): string => `${transactionHash.toHex()}-${eventIterator}`

// export const generateYieldId = (
//     principalToken: string,
//     account: string
// ): string => `${principalToken}-${account}`

export const generateYieldAssetId = (principalToken: string): string =>
    `${principalToken}-yield`
