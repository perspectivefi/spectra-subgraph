import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"

import { LPVault } from "../../generated/schema"
import { SECONDS_PER_YEAR, ZERO_BD } from "../constants"
import { createAPRInTimeForPool } from "../entities/APRInTime"
import { getPoolPriceScale } from "../entities/CurvePool"
import {
    getIBTRate,
    getPTRate,
    getExpirationTimestamp,
} from "../entities/FutureVault"

export function updatePoolAPR(
    poolAddress: Address,
    principalToken: Address,
    currentTimestamp: BigInt,
    blockNumber: BigInt
): void {
    let poolAPR = createAPRInTimeForPool(
        poolAddress,
        currentTimestamp,
        blockNumber
    )

    const curveUnit = BigInt.fromI32(10).pow(18)
    const rayUnit = BigInt.fromI32(10).pow(27)

    const expirationTimestamp = getExpirationTimestamp(principalToken)
    const timeLeft = expirationTimestamp.minus(currentTimestamp)
    const spotPrice = getPoolPriceScale(poolAddress)

    poolAPR.spotPrice = spotPrice
    const ibtRate = getIBTRate(principalToken)
    const ptRate = getPTRate(principalToken)
    poolAPR.ptRate = ptRate
    poolAPR.ibtRate = ibtRate

    const baseAPY = ptRate
        .times(curveUnit)
        .times(rayUnit)
        .div(spotPrice.times(ibtRate))
    const expAPY = SECONDS_PER_YEAR.div(
        BigDecimal.fromString(timeLeft.toString())
    )
    poolAPR.baseAPY = baseAPY
    poolAPR.exponentAPY = expAPY
    poolAPR.save()
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
        } else if (
            lpVault.underlying == "0x8494a4761a5d969d3f80f7110fbaa29e4072cdcd"
        ) {
            return LP_VAULT_APR_MOCK[1]
        }
    }

    return ZERO_BD
}
