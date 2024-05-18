import { Address, BigInt } from "@graphprotocol/graph-ts"

import { APRInTime } from "../../generated/schema"
import { UNIT_BI, ZERO_BD, ZERO_BI } from "../constants"

export function createAPRInTimeForPool(
    poolAddress: Address,
    timestamp: BigInt,
    blockNumber: BigInt
): APRInTime {
    let aprInTime = new APRInTime(
        `${poolAddress.toHex()}-${timestamp.toString()}`
    )

    aprInTime.createdAtTimestamp = timestamp
    aprInTime.block = blockNumber
    aprInTime.pool = poolAddress.toHex()

    aprInTime.spotPrice = UNIT_BI
    aprInTime.ptRate = ZERO_BI
    aprInTime.ibtRate = ZERO_BI
    aprInTime.baseAPY = ZERO_BI
    aprInTime.exponentAPY = ZERO_BD

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
    aprInTime.ptRate = ZERO_BI
    aprInTime.ibtRate = ZERO_BI
    aprInTime.baseAPY = ZERO_BI
    aprInTime.exponentAPY = ZERO_BD
    aprInTime.save()

    return aprInTime
}
