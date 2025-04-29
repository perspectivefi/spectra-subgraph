import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts"

import { PoolType } from "."
import { SECONDS_PER_YEAR, ZERO_BI } from "../constants"
import { createAPYInTimeForPool } from "../entities/APYInTime"
import { getPoolLastPrices, getPoolSwapPreview } from "../entities/CurvePool"
import {
    getIBTRate,
    getPTRate,
    getExpirationTimestamp,
} from "../entities/FutureVault"

export function updatePoolAPY(
    poolAddress: Address,
    poolType: string,
    principalToken: Address,
    currentTimestamp: BigInt,
    blockNumber: BigInt
): void {
    let poolAPY = createAPYInTimeForPool(
        poolAddress,
        currentTimestamp,
        blockNumber
    )

    const curveUnit = BigInt.fromI32(10).pow(18)
    const rayUnit = BigInt.fromI32(10).pow(27)

    const expirationTimestamp = getExpirationTimestamp(principalToken)
    const timeLeft = expirationTimestamp.minus(currentTimestamp)
    const spotPrice = getPoolLastPrices(poolAddress, poolType)

    poolAPY.ibtToPt = getPoolSwapPreview(
        poolAddress,
        poolType,
        BigInt.fromI32(0),
        BigInt.fromI32(1)
    )
    poolAPY.ptToIbt = getPoolSwapPreview(
        poolAddress,
        poolType,
        BigInt.fromI32(1),
        BigInt.fromI32(0)
    )

    poolAPY.spotPrice = spotPrice
    const ibtRate = getIBTRate(principalToken)
    const ptRate = getPTRate(principalToken)
    poolAPY.ptRate = ptRate
    poolAPY.ibtRate = ibtRate

    if (spotPrice.gt(ZERO_BI) && timeLeft.gt(ZERO_BI) && ibtRate.gt(ZERO_BI)) {
        const baseAPY = ptRate
            .times(curveUnit)
            .times(rayUnit)
            .div(spotPrice.times(ibtRate))
        const expAPY = SECONDS_PER_YEAR.div(
            BigDecimal.fromString(timeLeft.toString())
        )
        poolAPY.baseAPY = BigDecimal.fromString(baseAPY.toString()).div(
            BigDecimal.fromString(rayUnit.toString())
        )
        poolAPY.exponentAPY = expAPY
    }

    poolAPY.save()
}
