import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"

import { LPVault } from "../../generated/schema"
import { SECONDS_PER_YEAR, UNIT_BI, ZERO_BD, ZERO_BI } from "../constants"
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
import { CURVE_PRECISION, RAYS_PRECISION, toPrecision } from "./toPrecision"

export function updatePoolAPR(
    poolAddress: Address,
    principalToken: Address,
    currentTimestamp: BigInt
): void {
    let poolAPR = createAPRInTimeForPool(poolAddress, currentTimestamp)

    let ibtAddress = getIBT(principalToken)

    let ibtDecimals = getERC20Decimals(ibtAddress)
    let smallInput = BigInt.fromI32(10).pow((ibtDecimals as u8) - 1) // small input to ensure correct rate for small amount

    const ibtToPT = toPrecision(
        getIBTtoPTRate(poolAddress, smallInput),
        CURVE_PRECISION,
        ibtDecimals
    )
    const principalTokenExpiration = getExpirationTimestamp(principalToken)
    const ibtRate = toPrecision(
        getIBTRate(principalToken),
        RAYS_PRECISION,
        ibtDecimals
    )

    const spotPrice = ibtToPT.toBigDecimal().div(smallInput.toBigDecimal()) // Remove input

    const ibtUnit = toPrecision(
        getIBTUnit(principalToken),
        RAYS_PRECISION,
        ibtDecimals
    )

    // Form rate to BigNumber value for calculations with better precision
    const spotPriceBigInt = bigDecimalToBigInt(
        spotPrice.times(ibtUnit.toBigDecimal())
    )
    const ibtSharesRate = getSharesRate(ibtAddress, ibtUnit)

    poolAPR.spotPrice = spotPriceBigInt
    poolAPR.ibtRate = ibtRate
    poolAPR.ibtSharesRate = ibtSharesRate

    if (
        principalTokenExpiration.gt(currentTimestamp) &&
        ibtRate.notEqual(ZERO_BI) &&
        ibtSharesRate.notEqual(ZERO_BI)
    ) {
        const underlyingToPTRate = ibtSharesRate // Reflect IBT/Underlying rate
            .times(spotPriceBigInt) // IBT/PT rate
            .div(ibtUnit)

        poolAPR.underlyingToPT = underlyingToPTRate

        const underlyingToPTRatePerSecond = principalTokenExpiration
            .minus(currentTimestamp)
            .toBigDecimal()

        let apr = ZERO_BD
        if (underlyingToPTRatePerSecond.gt(ZERO_BD)) {
            apr = underlyingToPTRate
                .minus(ibtUnit)
                .toBigDecimal()
                .div(underlyingToPTRatePerSecond) // Get rate per second
                .times(SECONDS_PER_YEAR) // Convert to rate per year
                .times(BigDecimal.fromString("100")) // to percentage
                .div(ibtRate.toBigDecimal())
        }

        poolAPR.apr = apr
    } else {
        poolAPR.apr = ZERO_BD
        poolAPR.underlyingToPT = UNIT_BI
    }

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
