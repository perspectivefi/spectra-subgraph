import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"

import { LPVault } from "../../generated/schema"
import { SECONDS_PER_YEAR_BD, UNIT_BD, ZERO_BD, ZERO_BI } from "../constants"
import { getPoolCoins, getIBTtoPTRate } from "../entities/CurvePool"
import { getERC20Decimals } from "../entities/ERC20"
import {
    getExpirationTimestamp,
    getIBTRate,
    getIBTUnit,
} from "../entities/FutureVault"

export function calculatePoolAPR(
    poolAddress: Address,
    principalToken: Address,
    currentTimestamp: BigInt
): BigDecimal {
    let coins = getPoolCoins(poolAddress)
    let ibtAddress = coins[0]

    let ibtDecimals = getERC20Decimals(ibtAddress)
    let smallInput = BigInt.fromI32(10).pow(
        Math.floor(ibtDecimals * (3 / 4)) as u8
    ) // small input to ensure correct rate for small amount

    const ibtToPT = getIBTtoPTRate(poolAddress, smallInput)
    const principalTokenExpiration = getExpirationTimestamp(principalToken)
    const ibtRate = getIBTRate(principalToken)

    if (principalTokenExpiration.gt(currentTimestamp) && ibtRate.gt(ZERO_BI)) {
        const ibtUnit = getIBTUnit(principalToken).toBigDecimal()

        let underlyingToPTRate = ibtToPT
            .toBigDecimal()
            .div(smallInput.toBigDecimal()) // Remove input
            .times(ibtUnit)
            .div(ibtRate.toBigDecimal()) // Reflect IBT/Underlying rate

        log.warning("ibtToPT: {}", [ibtToPT.toString()])
        log.warning("ibtRate: {}", [ibtRate.toString()])
        log.warning("underlyingToPTRate: {}", [underlyingToPTRate.toString()])

        return underlyingToPTRate
            .minus(UNIT_BD)
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
        } else if (
            lpVault.underlying == "0x8494a4761a5d969d3f80f7110fbaa29e4072cdcd"
        ) {
            return LP_VAULT_APR_MOCK[1]
        }
    }

    return ZERO_BD
}
