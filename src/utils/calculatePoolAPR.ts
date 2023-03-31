import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"

import { SECONDS_PER_YEAR_BD, ZERO_BD, ZERO_BI } from "../constants"
import {
    getExpirationTimestamp,
    getIBTRate,
    getIBTUnit,
} from "../entities/FutureVault"

export function calculatePoolAPR(
    spotPrice: BigInt,
    poolFee: BigInt,
    adminFee: BigInt,
    principalToken: Address,
    currentTimestamp: BigInt
): BigDecimal {
    if (spotPrice.equals(ZERO_BI)) {
        return ZERO_BD
    }

    const principalTokenExpiration = getExpirationTimestamp(principalToken)
    const ibtRate = getIBTRate(principalToken)

    if (principalTokenExpiration.gt(currentTimestamp) && ibtRate.gt(ZERO_BI)) {
        const ibtUnit = getIBTUnit(principalToken)

        const absoluteUnderlyingPrice = ibtUnit
            .times(ibtUnit) // To cover negative IBT/Underlying rate
            .div(ibtRate) // Reflect IBT/Underlying rate
            .times(spotPrice)
            .times(ibtUnit.minus(poolFee).minus(adminFee)) // Remove fees
            .toBigDecimal()
            .div(ibtUnit.pow(2).toBigDecimal())
            .minus(ibtUnit.toBigDecimal()) // To have absolute difference, not a rate
            .div(ibtUnit.toBigDecimal())

        return absoluteUnderlyingPrice
            .div(
                BigDecimal.fromString(
                    principalTokenExpiration.minus(currentTimestamp).toString()
                )
            ) // Get rate per second
            .times(SECONDS_PER_YEAR_BD) // Convert to rate per year
            .times(BigDecimal.fromString("100")) // Convert to percentage
    } else {
        return ZERO_BD
    }
}
