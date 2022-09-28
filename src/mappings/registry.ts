import { RegistryUpdate } from "../../generated/Registry/Registry"
import { RegisteredContract } from "../../generated/schema"
import { createRegisteredContract } from "../entities/RegisteredContract"

export function handleRegistryUpdate(event: RegistryUpdate): void {
    let contractAddress = event.params._new
    let contract = RegisteredContract.load(contractAddress.toHex())

    if (!contract) {
        contract = createRegisteredContract(
            contractAddress,
            event.params._contractName,
            event.block.timestamp
        )
    }

    let oldAddress = event.params._old
    let oldContract = RegisteredContract.load(oldAddress.toHex())

    if (!oldContract) {
        oldContract = createRegisteredContract(
            oldAddress,
            event.params._contractName,
            event.block.timestamp
        )
        oldContract.save()
    }

    contract.old = oldContract.address.toHex()

    contract.save()
}
