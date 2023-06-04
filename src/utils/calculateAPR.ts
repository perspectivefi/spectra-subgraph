import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { LPVault } from "../../generated/schema"
import { SECONDS_PER_YEAR, UNIT_BI, ZERO_BI } from "../constants"
import { createAPRInTimeForPool } from "../entities/APRInTime"
import { getIBTtoPTRate } from "../entities/CurvePool"
import { getERC20Decimals } from "../entities/ERC20"
import { getSharesRate } from "../entities/ERC4626"
import {
    getExpirationTimestamp,
    getIBT,
    getIBTRate,
    getIBTUnit,
} from "../entities/FutureVault"
import { bigDecimalToBigInt } from "./bigDecimalToBigInt"

export function updatePoolAPR(
    poolAddress: Address,
    principalToken: Address,
    currentTimestamp: BigInt
): void {
    let poolAPR = createAPRInTimeForPool(poolAddress, currentTimestamp)

    let ibtAddress = getIBT(principalToken)

    let ibtDecimals = getERC20Decimals(ibtAddress)
    let smallInput = BigInt.fromI32(10).pow((ibtDecimals as u8) - 1) // small input to ensure correct rate for small amount

    const ibtToPT = getIBTtoPTRate(poolAddress, smallInput)
    const principalTokenExpiration = getExpirationTimestamp(principalToken)
    const ibtRate = getIBTRate(principalToken)

    const spotPrice = ibtToPT.toBigDecimal().div(smallInput.toBigDecimal()) // Remove input

    const ibtUnit = getIBTUnit(principalToken)

    // Form rate to BigNumber value for calculations with better precision
    const spotPriceBigInt = bigDecimalToBigInt(
        spotPrice.times(ibtUnit.toBigDecimal())
    )
    poolAPR.spotPrice = spotPriceBigInt
    poolAPR.ibtRate = ibtRate
    poolAPR.ibtSharesRate = getSharesRate(
        ibtAddress,
        getIBTUnit(principalToken)
    )

    if (principalTokenExpiration.gt(currentTimestamp) && ibtRate.gt(ZERO_BI)) {
        const underlyingToPTRate = spotPrice
            .times(ibtUnit.toBigDecimal())
            .div(ibtRate.toBigDecimal()) // Reflect IBT/Underlying rate

        const underlyingToPTRateBigInt = bigDecimalToBigInt(
            underlyingToPTRate.times(ibtUnit.toBigDecimal())
        )
        poolAPR.underlyingToPT = underlyingToPTRateBigInt

        let apr = underlyingToPTRateBigInt
            .minus(UNIT_BI)
            .div(principalTokenExpiration.minus(currentTimestamp)) // Get rate per second
            .times(SECONDS_PER_YEAR) // Convert to rate per year
            .times(BigInt.fromString("100")) // Convert to percentage

        poolAPR.apr = apr
    } else {
        poolAPR.apr = ZERO_BI
        poolAPR.underlyingToPT = ZERO_BI
    }

    poolAPR.save()
}

const LP_VAULT_APR_MOCK: BigInt[] = [
    BigInt.fromString("3"),
    BigInt.fromString("6"),
]

export function calculateLpVaultAPR(lpVaultAddress: Address): BigInt {
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

    return ZERO_BI
}
