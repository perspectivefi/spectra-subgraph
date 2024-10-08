import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

import { Future, Factory, Pool } from "../../generated/schema"
import { ZERO_BI } from "../constants"
import { AssetType } from "../utils"
import { createAPYInTimeForPool } from "./APYInTime"
import { getAsset } from "./Asset"
import { getAssetAmount } from "./AssetAmount"
import {
    getPoolAdminFee,
    getPoolFee,
    getPoolFutureAdminFee,
    getPoolLastPrices,
} from "./CurvePool"
import { getCurveFactory } from "./Factory"

class PoolDetails {
    poolAddress: Address
    ibtAddress: Address
    ptAddress: Address
    factoryAddress: Address
    lpAddress: Address
    timestamp: BigInt
    blockNumber: BigInt
    logIndex: BigInt
    transactionHash: Bytes
}

export function createPool(params: PoolDetails): Pool {
    let pool = new Pool(params.poolAddress.toHex())

    let ibtAssetAmount = getAssetAmount(
        params.transactionHash,
        params.ibtAddress,
        ZERO_BI,
        AssetType.IBT,
        params.logIndex.toString(),
        params.timestamp
    )

    pool.ibtAsset = ibtAssetAmount.id
    ibtAssetAmount.save()

    let ptAssetAmount = getAssetAmount(
        params.transactionHash,
        params.ptAddress,
        ZERO_BI,
        AssetType.PT,
        params.logIndex.toString(),
        params.timestamp
    )

    pool.ptAsset = ptAssetAmount.id
    ptAssetAmount.save()

    pool.address = params.poolAddress
    pool.createdAtTimestamp = params.timestamp

    pool.feeRate = getPoolFee(params.poolAddress)
    pool.totalFees = ZERO_BI
    pool.adminFeeRate = getPoolAdminFee(params.poolAddress)
    pool.totalAdminFees = ZERO_BI
    pool.futureAdminFeeRate = getPoolFutureAdminFee(params.poolAddress)
    pool.futureAdminFeeDeadline = ZERO_BI
    pool.totalClaimedAdminFees = ZERO_BI

    pool.transactionCount = 0

    // Asset - Future relation
    let lpToken = getAsset(
        params.lpAddress.toHex(),
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

    pool.lpTotalSupply = ZERO_BI

    let factory = Factory.load(params.factoryAddress.toHex())
    if (factory) {
        if (factory.curveFactory) {
            pool.factory = factory.curveFactory!.toHex()
        }
        pool.factory = factory.id

        // Curve factory
        if (factory.curveFactory) {
            let poolFactory = getCurveFactory(params.factoryAddress)

            pool.factory = poolFactory.toHex()
        }
    }

    let spotPrice = getPoolLastPrices(params.poolAddress)
    if (pool.futureVault) {
        let poolAPY = createAPYInTimeForPool(
            params.poolAddress,
            params.timestamp,
            params.blockNumber
        )

        poolAPY.save()
    }

    pool.spotPrice = spotPrice

    pool.save()

    return pool
}
