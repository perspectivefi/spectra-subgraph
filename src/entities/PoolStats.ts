import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts"

import { Pool, PoolStats } from "../../generated/schema"
import { UNIT_BI, ZERO_BI, SECONDS_PER_YEAR, ZERO_BD } from "../constants"
import { getPoolLastPrices, getPoolSwapPreview } from "../entities/CurvePool"
import {
    getIBTRate,
    getPTRate,
    getExpirationTimestamp,
} from "../entities/FutureVault"
import { generatePoolStatsId } from "../utils/idGenerators"

export enum PoolActionType {
    BUY_PT,
    SELL_PT,
    ADD_LIQUIDITY,
    REMOVE_LIQUIDITY,
}

export function updatePoolStatsDetails(
    pool: Pool,
    poolStats: PoolStats,
    timestamp: BigInt
): void {
    const curveUnit = BigInt.fromI32(10).pow(18)
    const rayUnit = BigInt.fromI32(10).pow(27)

    const principalToken = Address.fromString(pool.futureVault!)
    const expirationTimestamp = getExpirationTimestamp(principalToken)
    const timeLeft = expirationTimestamp.minus(timestamp)
    const spotPrice = getPoolLastPrices(
        Address.fromBytes(pool.address),
        pool.type
    )

    poolStats.ibtToPt = getPoolSwapPreview(
        Address.fromBytes(pool.address),
        pool.type,
        BigInt.fromI32(0),
        BigInt.fromI32(1)
    )
    poolStats.ptToIbt = getPoolSwapPreview(
        Address.fromBytes(pool.address),
        pool.type,
        BigInt.fromI32(1),
        BigInt.fromI32(0)
    )

    poolStats.spotPrice = spotPrice
    const ibtRate = getIBTRate(principalToken)
    const ptRate = getPTRate(principalToken)
    poolStats.ptRate = ptRate
    poolStats.ibtRate = ibtRate

    if (spotPrice.gt(ZERO_BI) && timeLeft.gt(ZERO_BI) && ibtRate.gt(ZERO_BI)) {
        const baseAPY = ptRate
            .times(curveUnit)
            .times(rayUnit)
            .div(spotPrice.times(ibtRate))
        const expAPY = SECONDS_PER_YEAR.div(
            BigDecimal.fromString(timeLeft.toString())
        )
        poolStats.baseAPY = BigDecimal.fromString(baseAPY.toString()).div(
            BigDecimal.fromString(rayUnit.toString())
        )
        poolStats.exponentAPY = expAPY
    }

    poolStats.save()
}

/**
 * Update the stat data for a pool. This function is called every time a
 * Pool Deposit or Withdrawal occurs, and each time an Exchange event occurs.
 * @param event A pool deposit or withdrawal event, an exchange event (AddLiquidity, RemoveLiquidity, or TokenExchange)
 * @param poolAddress The address of the pool
 * @param span the span in seconds
 * @param type the action type
 * @param valueUnderlying the value of the action in underlying
 * @param feeUnderlying the fee value in underlying
 * @param feeRatio the fee ratio related to the pool liquidity
 * @returns The updated PoolStats entity. This returned entity can still be updated
 * in event specific handlers to update the corresponding data
 */
export function updatePoolStats(
    event: ethereum.Event,
    pool: Pool,
    span: i32,
    type: PoolActionType,
    valueUnderlying: BigInt,
    feeUnderlying: BigInt,
    feeRatio: BigInt
): PoolStats {
    let statId = event.block.timestamp.toI32() / span
    const poolStatsId = generatePoolStatsId(
        pool.address.toHex(),
        span.toString(),
        statId.toString()
    )
    let poolStats = PoolStats.load(poolStatsId)
    if (poolStats === null) {
        poolStats = createPoolStats(
            Address.fromBytes(pool.address),
            span,
            statId
        )
        poolStats.createdAtTimestamp = event.block.timestamp
    }
    switch (type) {
        case PoolActionType.BUY_PT:
            {
                poolStats.buys = poolStats.buys.plus(UNIT_BI)
                poolStats.buyVolume = poolStats.buyVolume.plus(valueUnderlying)
            }
            break
        case PoolActionType.SELL_PT:
            {
                poolStats.sells = poolStats.sells.plus(UNIT_BI)
                poolStats.sellVolume =
                    poolStats.sellVolume.plus(valueUnderlying)
            }
            break
        case PoolActionType.ADD_LIQUIDITY:
            {
                poolStats.deposits = poolStats.deposits.plus(UNIT_BI)
                poolStats.depositVolume =
                    poolStats.depositVolume.plus(valueUnderlying)
            }
            break
        case PoolActionType.REMOVE_LIQUIDITY:
            {
                poolStats.withdrawals = poolStats.withdrawals.plus(UNIT_BI)
                poolStats.withdrawVolume =
                    poolStats.withdrawVolume.plus(valueUnderlying)
            }
            break
    }
    // we update the fee stats regardless of the action type
    poolStats.feeUnderlying = poolStats.feeUnderlying.plus(feeUnderlying)
    poolStats.feeRatio = poolStats.feeRatio.plus(feeRatio)
    // we also update the APY & other data points
    if (pool.futureVault) {
        updatePoolStatsDetails(pool, poolStats, event.block.timestamp)
    }
    poolStats.lastUpdatedAtTimestamp = event.block.timestamp
    poolStats.lastUpdatedAtBlock = event.block.number
    // save stats
    poolStats.save()
    return poolStats
}
/**
 * Create a new PoolStats entity for a given pool and set the initial values
 * @param address The address of the pool
 * @param dayId The day id
 * @returns The newly created PoolStats entity
 */
export function createPoolStats(
    address: Address,
    span: i32,
    statId: i32
): PoolStats {
    const poolStatsId = generatePoolStatsId(
        address.toHex(),
        span.toString(),
        statId.toString()
    )
    let poolStats = new PoolStats(poolStatsId)
    poolStats.pool = address.toHex()
    poolStats.span = span
    poolStats.timestamp = statId * span
    poolStats.buys = ZERO_BI
    poolStats.sells = ZERO_BI
    poolStats.deposits = ZERO_BI
    poolStats.withdrawals = ZERO_BI
    poolStats.buyVolume = ZERO_BI
    poolStats.sellVolume = ZERO_BI
    poolStats.depositVolume = ZERO_BI
    poolStats.withdrawVolume = ZERO_BI
    poolStats.feeUnderlying = ZERO_BI
    poolStats.feeRatio = ZERO_BI
    poolStats.createdAtTimestamp = ZERO_BI
    poolStats.lastUpdatedAtTimestamp = ZERO_BI
    poolStats.lastUpdatedAtBlock = ZERO_BI

    poolStats.spotPrice = UNIT_BI
    poolStats.ptRate = ZERO_BI
    poolStats.ibtRate = ZERO_BI
    poolStats.baseAPY = ZERO_BD
    poolStats.exponentAPY = ZERO_BD
    poolStats.ibtToPt = ZERO_BI
    poolStats.ptToIbt = ZERO_BI

    poolStats.save()
    return poolStats
}
