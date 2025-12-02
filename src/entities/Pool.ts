import { Address, BigInt, Bytes, log } from "@graphprotocol/graph-ts"

import { Future, Factory, Pool } from "../../generated/schema"
import { CurvePoolSNG } from "../../generated/templates/CurvePool/CurvePoolSNG"
import { CURVE_UNIT, ZERO_BI } from "../constants"
import { AssetType, PoolType } from "../utils"
import { getAsset } from "./Asset"
import { getAssetAmount } from "./AssetAmount"
import {
    getPoolAdminFee,
    getPoolFee,
    getPoolFutureAdminFee,
    getPoolLastPrices,
} from "./CurvePool"
import { getCurveFactory } from "./Factory"
import { getPoolAdminBalances } from "./FeeClaim"

const FEES_PRECISION = 10
const FEES_UNIT = BigInt.fromI32(10).pow(FEES_PRECISION as u8)

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
    type: string
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
    pool.totalFeeRatio = ZERO_BI
    pool.adminFeeRate = getPoolAdminFee(params.poolAddress)
    pool.totalAdminFees = ZERO_BI
    pool.futureAdminFeeRate = getPoolFutureAdminFee(params.poolAddress)
    pool.futureAdminFeeDeadline = ZERO_BI
    pool.totalClaimedAdminFees = ZERO_BI
    pool.initialVirtualPrice = ZERO_BI

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

    pool.ibtAdminBalance = ZERO_BI
    pool.ptAdminBalance = ZERO_BI

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

    let spotPrice = getPoolLastPrices(params.poolAddress, params.type)

    pool.spotPrice = spotPrice

    pool.type = params.type

    pool.save()

    return pool
}

export function getPoolLiquidityInUnderlying(
    ibtAmount: BigInt,
    ptAmount: BigInt,
    spotPrice: BigInt,
    ibtRate: BigInt,
    ibtDecimals: number
): BigInt {
    const ptInIbt = ptAmount.times(CURVE_UNIT).div(spotPrice)
    const liquidityInUnderlying = ibtAmount
        .plus(ptInIbt)
        .times(ibtRate)
        .div(BigInt.fromString("10").pow(ibtDecimals as u8))
        .div(BigInt.fromI32(2))
    return liquidityInUnderlying
}

export function getPoolDynamicFee(pool: Pool, i: BigInt, j: BigInt): BigInt {
    let dynamicFeeCall = CurvePoolSNG.bind(
        Address.fromBytes(pool.address)
    ).try_dynamic_fee(i, j)
    if (!dynamicFeeCall.reverted) {
        return dynamicFeeCall.value
    }
    log.warning(
        "getPoolFee: dynamic_fee call reverted for pool {}, i {}, j {}",
        [pool.address.toHex(), i.toString(), j.toString()]
    )
    return ZERO_BI
}

export function updatePoolAdminBalances(pool: Pool): BigInt[] {
    let ibtAdminFee = ZERO_BI
    let ptAdminFee = ZERO_BI
    if (pool.type == "CURVE_SNG") {
        let adminBalances = getPoolAdminBalances(
            Address.fromBytes(pool.address),
            pool.type
        )
        if (adminBalances[0] < pool.ibtAdminBalance) {
            ibtAdminFee = adminBalances[0]
        } else {
            ibtAdminFee = adminBalances[0].minus(pool.ibtAdminBalance)
        }
        if (adminBalances[1] < pool.ptAdminBalance) {
            ptAdminFee = adminBalances[1]
        } else {
            ptAdminFee = adminBalances[1].minus(pool.ptAdminBalance)
        }
        pool.ibtAdminBalance = adminBalances[0]
        pool.ptAdminBalance = adminBalances[1]
    }
    return [ibtAdminFee, ptAdminFee]
}

export function getLpFeeUnderlying(
    pool: Pool,
    valueUnderlying: BigInt,
    ibtAdminFee: BigInt,
    ptAdminFee: BigInt,
    ibtRate: BigInt,
    ibtDecimals: number
): BigInt {
    if (pool.type == PoolType.CURVE) {
        return valueUnderlying.times(pool.feeRate).div(FEES_UNIT)
    } else if (pool.type == PoolType.CURVE_SNG) {
        let ptAdminFeeInIbt = ptAdminFee.times(pool.spotPrice).div(CURVE_UNIT)
        let adminFeeUnderlying = ibtAdminFee
            .plus(ptAdminFeeInIbt)
            .times(ibtRate)
            .div(BigInt.fromString("10").pow(ibtDecimals as u8))
        let lpFeeUnderlying = adminFeeUnderlying
            .times(FEES_UNIT)
            .div(pool.adminFeeRate)
        return lpFeeUnderlying
    } else {
        return ZERO_BI
    }
}
