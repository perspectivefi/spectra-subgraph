import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { getIBTtoPTRate, getPoolCoins } from "../entities/CurvePool";
import { getERC20Decimals } from "../entities/ERC20";
import { getExpirationTimestamp, getIBTRate, getIBTUnit } from "../entities/FutureVault";
import { SECONDS_PER_YEAR_BD, UNIT_BD, ZERO_BD, ZERO_BI } from "../constants";

export function calculatePoolProfit(
    poolAddress: Address,
    principalToken: Address,
    currentTimestamp: BigInt
): BigDecimal {
    let coins = getPoolCoins(poolAddress)
    let ibtAddress = coins[0]

    let ibtDecimals = getERC20Decimals(ibtAddress)
    let smallInput = BigInt.fromI32(10).pow((ibtDecimals as u8) - 1) // small input to ensure correct rate for small amount

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
