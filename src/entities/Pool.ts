import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

import { Future, FutureVaultFactory, Pool } from "../../generated/schema"
import { UNIT_BI, ZERO_BI } from "../constants"
import { AssetType } from "../utils"
import { createAPRInTimeForPool } from "./APRInTime"
import { getAsset } from "./Asset"
import { getAssetAmount } from "./AssetAmount"
import {
    getPoolAdminFee,
    getPoolFee,
    getPoolFutureAdminFee,
    getPoolLPToken,
    getPoolPriceScale,
} from "./CurvePool"
import { getERC20TotalSupply } from "./ERC20"

class PoolDetails {
    poolAddress: Address
    ibtAddress: Address
    ptAddress: Address
    ptFactoryAddress: Address
    timestamp: BigInt
    transactionHash: Bytes
}

export function createPool(params: PoolDetails): Pool {
    let pool = new Pool(params.poolAddress.toHex())

    let ibtAssetAmount = getAssetAmount(
        params.transactionHash,
        params.ibtAddress,
        ZERO_BI,
        AssetType.IBT,
        params.timestamp
    )

    let ptAssetAmount = getAssetAmount(
        params.transactionHash,
        params.ptAddress,
        ZERO_BI,
        AssetType.PT,
        params.timestamp
    )

    pool.address = params.poolAddress
    pool.createdAtTimestamp = params.timestamp

    pool.feeRate = getPoolFee(params.poolAddress)
    pool.totalFees = ZERO_BI
    pool.adminFeeRate = getPoolAdminFee(params.poolAddress)
    pool.totalAdminFees = ZERO_BI
    pool.futureAdminFeeRate = getPoolFutureAdminFee(params.poolAddress)
    pool.futureAdminFeeDeadline = ZERO_BI
    pool.totalClaimedAdminFees = ZERO_BI

    pool.assets = [ibtAssetAmount.id, ptAssetAmount.id]

    pool.transactionCount = 0

    // Asset - Future relation
    let lpToken = getAsset(
        getPoolLPToken(params.poolAddress).toHex(),
        params.timestamp,
        AssetType.LP
    )

    let future = Future.load(params.ptAddress.toHex())
    if (future) {
        pool.futureVault = future.address.toHex()
        lpToken.futureVault = future.address.toHex()
    }
    lpToken.save()

    pool.liquidityToken = lpToken.id

    const lpTotalSupply = getERC20TotalSupply(
        Address.fromBytes(lpToken.address)
    )
    pool.totalLPSupply = lpTotalSupply

    pool.totalLPSupply = UNIT_BI

    let futureVaultFactory = FutureVaultFactory.load(
        params.ptFactoryAddress.toHex()
    )
    if (futureVaultFactory) {
        if (futureVaultFactory.poolFactory) {
            pool.factory = futureVaultFactory.poolFactory
        }
        pool.futureVaultFactory = futureVaultFactory.id
    }

    let spotPrice = getPoolPriceScale(params.poolAddress)
    if (pool.futureVault) {
        let poolAPR = createAPRInTimeForPool(
            params.poolAddress,
            params.timestamp
        )

        poolAPR.save()
    }

    pool.spotPrice = spotPrice
    pool.save()

    return pool
}
