import { Address, BigInt } from "@graphprotocol/graph-ts"

import { APRInTime } from "../../generated/schema"
import { ZERO_BI } from "../constants"

export function createAPRInTime(
    poolAddress: Address,
    timestamp: BigInt
): APRInTime {
    let aprInTime = new APRInTime(
        `${poolAddress.toHex()}-${timestamp.toString()}`
    )

    aprInTime.createdAtTimestamp = timestamp
    aprInTime.pool = poolAddress.toHex()
    aprInTime.value = ZERO_BI

    aprInTime.save()

    return aprInTime
}
