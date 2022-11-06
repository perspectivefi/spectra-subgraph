import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts"

import { Future, FutureDayData } from "../../generated/schema"
import { DAYS_PER_YEAR_BD, ZERO_BD, ZERO_BI } from "../constants"
import { generateFutureDayDataId } from "../utils"
import { getDayIdFromTimestamp, getPastDayId } from "../utils/dayId"
import { getIBTRate } from "./ERC4626"

/**
 * Update the daily data for a future. This function is called every time a
 * Future Deposit or Withdrawal occurs, and each time an Exchange event occurs.
 * @param event A future deposit or withdrawal event, an exchange event (AddLiquidity, RemoveLiquidity, or TokenExchange)
 * @param futureAddress The address of the future
 * @returns The updated FutureDayData entity. This returned entity can still be updated
 * in event specific handlers to update the correpsonding data
 */
export function updateFutureDayData(
    event: ethereum.Event,
    futureAddress: Address
): FutureDayData {
    let dayId = getDayIdFromTimestamp(event.block.timestamp)
    const futureDayDataId = generateFutureDayDataId(
        futureAddress.toHex(),
        dayId.toString()
    )
    let futureDayData = FutureDayData.load(futureDayDataId)
    if (futureDayData === null) {
        futureDayData = createFutureDayData(futureAddress, dayId)
    }
    let future = Future.load(futureAddress.toHex())
    let ibt = future!.ibtAsset
    const currentRate = getIBTRate(Address.fromString(ibt))

    let currentIBTRate = futureDayData.ibtRate
    let dailyUpdates = futureDayData.dailyUpdates.plus(BigInt.fromI32(1))
    // Compute the ibt rate new average
    futureDayData.ibtRate = currentIBTRate.plus(
        currentRate.minus(currentIBTRate).div(dailyUpdates)
    )
    futureDayData.dailyUpdates = dailyUpdates

    futureDayData.realizedAPR7D = getAPR(futureAddress, currentRate, dayId, 7)
    futureDayData.realizedAPR30D = getAPR(futureAddress, currentRate, dayId, 30)
    futureDayData.realizedAPR90D = getAPR(futureAddress, currentRate, dayId, 90)
    futureDayData.save()
    return futureDayData
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
    const previousFutureDayData = getPreviousFutureDayData(
        futureAddress,
        nowDayId,
        window
    )
    if (previousFutureDayData === null) {
        return ZERO_BD
    }
    const previousRate = previousFutureDayData.ibtRate
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
 * Get the previous FutureDayData entity for a given future
 * @param futureAddress The address of the future
 * @param nowDayId The current day id
 * @param days The number of days to go back
 * @returns The previous FutureDayData entity
 */
export function getPreviousFutureDayData(
    futureAddress: Address,
    nowDayId: i32,
    days: i32
): FutureDayData | null {
    const previousDayId = getPastDayId(nowDayId, days)
    const previousFutureDayDataId = generateFutureDayDataId(
        futureAddress.toHex(),
        previousDayId.toString()
    )
    let previousFutureDayData = FutureDayData.load(previousFutureDayDataId)
    return previousFutureDayData
}

/**
 * Create a new FutureDayData entity for a given future and set the initial values
 * @param address The address of the future
 * @param dayId The day id
 * @returns The newly created FutureDayData entity
 */
export function createFutureDayData(
    address: Address,
    dayId: i32
): FutureDayData {
    const futureDayDataId = generateFutureDayDataId(
        address.toHex(),
        dayId.toString()
    )
    let futureDayData = new FutureDayData(futureDayDataId)
    futureDayData.future = address.toHex()
    futureDayData.date = dayId as i32
    futureDayData.dailyDeposits = ZERO_BI
    futureDayData.dailyWithdrawals = ZERO_BI
    futureDayData.dailySwaps = ZERO_BI
    futureDayData.dailyAddLiquidity = ZERO_BI
    futureDayData.dailyRemoveLiquidity = ZERO_BI
    futureDayData.dailyUpdates = ZERO_BI
    futureDayData.ibtRate = ZERO_BI
    futureDayData.realizedAPR7D = ZERO_BD
    futureDayData.realizedAPR30D = ZERO_BD
    futureDayData.realizedAPR90D = ZERO_BD
    futureDayData.save()
    return futureDayData
}
