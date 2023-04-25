import { Address, BigInt } from "@graphprotocol/graph-ts"

import { APRInTime } from "../../generated/schema"
import { ZERO_BD, ZERO_BI } from "../constants"

export function createAPRInTimeForPool(
    poolAddress: Address,
    timestamp: BigInt
): APRInTime {
    let aprInTime = new APRInTime(
        `${poolAddress.toHex()}-${timestamp.toString()}`
    )

    aprInTime.createdAtTimestamp = timestamp
    aprInTime.pool = poolAddress.toHex()

    aprInTime.spotPrice = ZERO_BD
    aprInTime.ibtRate = ZERO_BI
    aprInTime.underlyingToPT = ZERO_BD
    aprInTime.apr = ZERO_BD

    aprInTime.save()

    return aprInTime
}

export function createAPRInTimeForLPVault(
    lpVaultAddress: Address,
    timestamp: BigInt
): APRInTime {
    let aprInTime = new APRInTime(
        `${lpVaultAddress.toHex()}-${timestamp.toString()}`
    )

    aprInTime.createdAtTimestamp = timestamp
    aprInTime.lpVault = lpVaultAddress.toHex()

    aprInTime.spotPrice = ZERO_BD
    aprInTime.ibtRate = ZERO_BI
    aprInTime.underlyingToPT = ZERO_BD
    aprInTime.apr = ZERO_BD

    aprInTime.save()

    return aprInTime
}
