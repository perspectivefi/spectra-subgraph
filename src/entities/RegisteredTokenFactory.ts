import { Address, BigInt } from "@graphprotocol/graph-ts"

import { RegisteredTokenFactory } from "../../generated/schema"

export function createRegisteredTokenFactory(
    address: Address,
    name: string,
    timestamp: BigInt
): RegisteredTokenFactory {
    let newContract = new RegisteredTokenFactory(address.toHex())
    newContract.name = name
    newContract.address = address
    newContract.createdAtTimestamp = timestamp

    return newContract
}
