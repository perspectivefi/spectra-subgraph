import { Address, BigInt } from "@graphprotocol/graph-ts"

import { LPVaultFactory } from "../../generated/schema"

export function createLPVaultFactory(
    address: Address,
    timestamp: BigInt
): LPVaultFactory {
    let newFactory = new LPVaultFactory(address.toHex())
    newFactory.address = address
    newFactory.createdAtTimestamp = timestamp

    return newFactory
}
