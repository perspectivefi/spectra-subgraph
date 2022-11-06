import { BigInt } from "@graphprotocol/graph-ts"

import { SECONDS_PER_DAY } from "../constants"

/**
 * Get the day ID for a timestamp.
 * @param timestamp Timestamp in seconds.
 * @returns The day ID
 */
export function getDayIdFromTimestamp(timestamp: BigInt): i32 {
    return timestamp.toI32() / SECONDS_PER_DAY
}

/**
 * Get a previous day ID for any number of days in the past
 * @param dayId The day ID
 * @param days The number of days to go back
 * @returns The past day ID
 */
export function getPastDayId(dayId: i32, days: i32): i32 {
    return dayId - days
}
