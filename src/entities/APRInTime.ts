import { Address, BigInt } from "@graphprotocol/graph-ts"

import { APRInTime } from "../../generated/schema"
import { UNIT_BI, ZERO_BI } from "../constants"

export function createAPRInTimeForPool(
    poolAddress: Address,
    timestamp: BigInt
): APRInTime {
    let aprInTime = new APRInTime(
        `${poolAddress.toHex()}-${timestamp.toString()}`
    )

    aprInTime.createdAtTimestamp = timestamp
    aprInTime.pool = poolAddress.toHex()

    aprInTime.spotPrice = UNIT_BI
    aprInTime.ibtRate = UNIT_BI
    aprInTime.ibtSharesRate = UNIT_BI
    aprInTime.underlyingToPT = UNIT_BI
    aprInTime.apr = ZERO_BI

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

    aprInTime.spotPrice = UNIT_BI
    aprInTime.ibtRate = UNIT_BI
    aprInTime.ibtSharesRate = UNIT_BI
    aprInTime.underlyingToPT = UNIT_BI
    aprInTime.apr = ZERO_BI

    aprInTime.save()

    return aprInTime
}
