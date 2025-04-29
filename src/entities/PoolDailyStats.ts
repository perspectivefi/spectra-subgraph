import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"

import { PoolStats } from "../../generated/schema"
import { UNIT_BI, ZERO_BI } from "../constants"
import { generatePoolStatsId } from "../utils/idGenerators"

export enum PoolActionType {
    BUY_PT,
    SELL_PT,
    ADD_LIQUIDITY,
    REMOVE_LIQUIDITY,
}

/**
 * Update the stat data for a pool. This function is called every time a
 * Pool Deposit or Withdrawal occurs, and each time an Exchange event occurs.
 * @param event A pool deposit or withdrawal event, an exchange event (AddLiquidity, RemoveLiquidity, or TokenExchange)
 * @param poolAddress The address of the pool
 * @param span the span in seconds
 * @param type the action type
 * @param valueUnderlying the value of the action in underlying
 * @returns The updated PoolStats entity. This returned entity can still be updated
 * in event specific handlers to update the corresponding data
 */
export function updatePoolStats(
    event: ethereum.Event,
    poolAddress: Address,
    span: i32,
    type: PoolActionType,
    valueUnderlying: BigInt
): PoolStats {
    let statId = event.block.timestamp.toI32() / span
    const poolStatsId = generatePoolStatsId(
        poolAddress.toHex(),
        span.toString(),
        statId.toString()
    )
    let poolStats = PoolStats.load(poolStatsId)
    if (poolStats === null) {
        poolStats = createPoolDailyStats(poolAddress, span, statId)
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
    poolStats.save()
    return poolStats
}
/**
 * Create a new PoolStats entity for a given pool and set the initial values
 * @param address The address of the pool
 * @param dayId The day id
 * @returns The newly created PoolStats entity
 */
export function createPoolDailyStats(
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
    poolStats.save()
    return poolStats
}
