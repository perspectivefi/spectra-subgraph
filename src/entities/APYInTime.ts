import { Address, BigInt } from "@graphprotocol/graph-ts"

import { APYInTime } from "../../generated/schema"
import { UNIT_BI, ZERO_BD, ZERO_BI } from "../constants"

export function createAPYInTimeForPool(
    poolAddress: Address,
    timestamp: BigInt,
    blockNumber: BigInt
): APYInTime {
    let apyInTime = new APYInTime(
        `${poolAddress.toHex()}-${timestamp.toString()}`
    )

    apyInTime.createdAtTimestamp = timestamp
    apyInTime.block = blockNumber
    apyInTime.pool = poolAddress.toHex()

    apyInTime.spotPrice = UNIT_BI
    apyInTime.ptRate = ZERO_BI
    apyInTime.ibtRate = ZERO_BI
    apyInTime.baseAPY = ZERO_BD
    apyInTime.exponentAPY = ZERO_BD

    apyInTime.save()

    return apyInTime
}

export function createAPYInTimeForLPVault(
    lpVaultAddress: Address,
    timestamp: BigInt
): APYInTime {
    let apyInTime = new APYInTime(
        `${lpVaultAddress.toHex()}-${timestamp.toString()}`
    )

    apyInTime.createdAtTimestamp = timestamp
    apyInTime.lpVault = lpVaultAddress.toHex()

    apyInTime.spotPrice = UNIT_BI
    apyInTime.ptRate = ZERO_BI
    apyInTime.ibtRate = ZERO_BI
    apyInTime.baseAPY = ZERO_BD
    apyInTime.exponentAPY = ZERO_BD
    apyInTime.save()

    return apyInTime
}
