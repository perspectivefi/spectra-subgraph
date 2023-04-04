import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"

import { LPVault } from "../../generated/schema"
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
                principalTokenExpiration.minus(currentTimestamp).toBigDecimal()
            ) // Get rate per second
            .times(SECONDS_PER_YEAR_BD) // Convert to rate per year
            .times(BigDecimal.fromString("100")) // Convert to percentage
    } else {
        return ZERO_BD
    }
}

const LP_VAULT_APR_MOCK: BigDecimal[] = [
    BigDecimal.fromString("3"),
    BigDecimal.fromString("6"),
]

export function calculateLpVaultAPR(lpVaultAddress: Address): BigDecimal {
    let lpVault = LPVault.load(lpVaultAddress.toHex())

    if (lpVault) {
        log.warning(lpVault.underlying, [])
        if (
            lpVault.underlying == "0x792f2d31b2aadac705d57735855b299f84b999b9"
        ) {
            return LP_VAULT_APR_MOCK[0]
        } else {
            return LP_VAULT_APR_MOCK[1]
        }
    }

    return ZERO_BD
}
