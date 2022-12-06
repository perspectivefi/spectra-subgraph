import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts"

import { Future, FutureDailyStats } from "../../generated/schema"
import { DAYS_PER_YEAR_BD, ZERO_BD, ZERO_BI } from "../constants"
import { generateFutureDailyStatsId } from "../utils"
import { getDayIdFromTimestamp, getPastDayId } from "../utils/dayId"
import { getIBTRate } from "./ERC4626"

/**
 * Update the daily data for a future. This function is called every time a
 * Future Deposit or Withdrawal occurs, and each time an Exchange event occurs.
 * @param event A future deposit or withdrawal event, an exchange event (AddLiquidity, RemoveLiquidity, or TokenExchange)
 * @param futureAddress The address of the future
 * @returns The updated FutureDailyStats entity. This returned entity can still be updated
 * in event specific handlers to update the correpsonding data
 */
export function updateFutureDailyStats(
    event: ethereum.Event,
    futureAddress: Address
): FutureDailyStats {
    let dayId = getDayIdFromTimestamp(event.block.timestamp)
    const futureDailyStatsID = generateFutureDailyStatsId(
        futureAddress.toHex(),
        dayId.toString()
    )
    let futureDailyStats = FutureDailyStats.load(futureDailyStatsID)
    if (futureDailyStats === null) {
        futureDailyStats = createFutureDailyStats(futureAddress, dayId)
    }
    let future = Future.load(futureAddress.toHex())
    let ibt = future!.ibtAsset
    const currentRate = getIBTRate(Address.fromString(ibt))

    let currentIBTRate = futureDailyStats.ibtRate
    let dailyUpdates = futureDailyStats.dailyUpdates.plus(BigInt.fromI32(1))
    // Compute the ibt rate new average
    futureDailyStats.ibtRate = currentIBTRate.plus(
        currentRate.minus(currentIBTRate).div(dailyUpdates)
    )
    futureDailyStats.dailyUpdates = dailyUpdates

    futureDailyStats.realizedAPR7D = getAPR(futureAddress, currentRate, dayId, 7)
    futureDailyStats.realizedAPR30D = getAPR(futureAddress, currentRate, dayId, 30)
    futureDailyStats.realizedAPR90D = getAPR(futureAddress, currentRate, dayId, 90)
    futureDailyStats.save()
    return futureDailyStats
}
/**
 * Compute the realized APR for a future over a given period of time (in days)
 * @param futureAddress The address of the future
 * @param currentRate The current rate of the interest bearing token
 * @param nowDayId The current day id
 * @param window The number of days to calculate the APR over
 * @returns The APR for the given windows
 */
export function getAPR(
    futureAddress: Address,
    currentRate: BigInt,
    nowDayId: i32,
    window: i32
): BigDecimal {
    const previousFutureDailyStats = getPreviousFutureDailyStats(
        futureAddress,
        nowDayId,
        window
    )
    if (previousFutureDailyStats === null) {
        return ZERO_BD
    }
    const previousRate = previousFutureDailyStats.ibtRate
    if (previousRate.equals(ZERO_BI)) {
        return ZERO_BD
    }
    const windowBD = BigDecimal.fromString(window.toString())
    const yearBD = DAYS_PER_YEAR_BD
    const ratio = yearBD.div(windowBD)
    const apr = currentRate
        .minus(previousRate)
        .toBigDecimal()
        .div(previousRate.toBigDecimal())
        .times(ratio)
    return apr
}

/**
 * Get the previous FutureDailyStats entity for a given future
 * @param futureAddress The address of the future
 * @param nowDayId The current day id
 * @param days The number of days to go back
 * @returns The previous FutureDailyStats entity
 */
export function getPreviousFutureDailyStats(
    futureAddress: Address,
    nowDayId: i32,
    days: i32
): FutureDailyStats | null {
    const previousDayId = getPastDayId(nowDayId, days)
    const previousFutureDailyStatsId = generateFutureDailyStatsId(
        futureAddress.toHex(),
        previousDayId.toString()
    )
    let previousFutureDailyStats = FutureDailyStats.load(previousFutureDailyStatsId)
    return previousFutureDailyStats
}

/**
 * Create a new FutureDailyStats entity for a given future and set the initial values
 * @param address The address of the future
 * @param dayId The day id
 * @returns The newly created FutureDailyStats entity
 */
export function createFutureDailyStats(
    address: Address,
    dayId: i32
): FutureDailyStats {
    const futureDailyStatsId = generateFutureDailyStatsId(
        address.toHex(),
        dayId.toString()
    )
    let futureDailyStats = new FutureDailyStats(futureDailyStatsId)
    futureDailyStats.future = address.toHex()
    futureDailyStats.date = dayId as i32
    futureDailyStats.dailyDeposits = ZERO_BI
    futureDailyStats.dailyWithdrawals = ZERO_BI
    futureDailyStats.dailySwaps = ZERO_BI
    futureDailyStats.dailyAddLiquidity = ZERO_BI
    futureDailyStats.dailyRemoveLiquidity = ZERO_BI
    futureDailyStats.dailyUpdates = ZERO_BI
    futureDailyStats.ibtRate = ZERO_BI
    futureDailyStats.realizedAPR7D = ZERO_BD
    futureDailyStats.realizedAPR30D = ZERO_BD
    futureDailyStats.realizedAPR90D = ZERO_BD
    futureDailyStats.save()
    return futureDailyStats
}
