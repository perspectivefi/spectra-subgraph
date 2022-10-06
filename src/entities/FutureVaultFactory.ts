import { Address, BigInt } from "@graphprotocol/graph-ts"

import { FutureVaultFactory } from "../../generated/schema"

export function createFutureVaultFactory(
    address: Address,
    name: string,
    timestamp: BigInt
): FutureVaultFactory {
    let newContract = new FutureVaultFactory(address.toHex())
    newContract.name = name
    newContract.address = address
    newContract.createdAtTimestamp = timestamp

    return newContract
}
