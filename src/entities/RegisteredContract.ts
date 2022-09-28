import { Address, BigInt } from "@graphprotocol/graph-ts"

import { RegisteredContract } from "../../generated/schema"

export function createRegisteredContract(
    address: Address,
    name: string,
    timestamp: BigInt
): RegisteredContract {
    let newContract = new RegisteredContract(address.toHex())
    newContract.name = name
    newContract.address = address
    newContract.createdAtTimestamp = timestamp

    return newContract
}
