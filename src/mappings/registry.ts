import { Bytes } from "@graphprotocol/graph-ts"

import { RegistryUpdate } from "../../generated/APWineProtocol/Registry"
import { RegisteredContract } from "../../generated/schema"

export function handleRegistryUpdate(event: RegistryUpdate): void {
    let contractName = event.params._contractName
    let contract = RegisteredContract.load(contractName)

    let addressesHistory: Bytes[] = []

    if (!contract) {
        contract = new RegisteredContract(contractName)
    } else if (contract.addressesHistory.length > 0) {
        addressesHistory = contract.addressesHistory
    }

    addressesHistory.push(event.params._old)

    contract.addressesHistory = addressesHistory
    contract.address = event.params._new
    contract.save()
}
