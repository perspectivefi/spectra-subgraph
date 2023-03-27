import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts"

import { DAYS_PER_YEAR_BD, ZERO_BD, ZERO_BI } from "../constants"
import { getExpirationTimestamp, getIBTUnit } from "../entities/FutureVault"
import { getDayIdFromTimestamp } from "./dayId"

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

    if (principalTokenExpiration.gt(currentTimestamp)) {
        const ibtUnit = getIBTUnit(principalToken)
        const absolutePrice = spotPrice
            .minus(poolFee)
            .minus(adminFee)
            .minus(ibtUnit)

        const daysInPeriod = BigDecimal.fromString(
            getDayIdFromTimestamp(
                principalTokenExpiration.minus(currentTimestamp)
            ).toString()
        )

        return absolutePrice
            .toBigDecimal()
            .div(ibtUnit.toBigDecimal())
            .div(daysInPeriod)
            .times(DAYS_PER_YEAR_BD)
            .times(BigDecimal.fromString("100"))
    } else {
        return ZERO_BD
    }
}
