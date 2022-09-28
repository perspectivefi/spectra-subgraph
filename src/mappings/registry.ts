import { RegistryUpdate } from "../../generated/Registry/Registry"
import { RegisteredTokenFactory } from "../../generated/schema"
import { createRegisteredTokenFactory } from "../entities/RegisteredTokenFactory"

export function handleRegistryUpdate(event: RegistryUpdate): void {
    let contractAddress = event.params._new
    let contract = RegisteredTokenFactory.load(contractAddress.toHex())

    if (!contract) {
        contract = createRegisteredTokenFactory(
            contractAddress,
            event.params._contractName,
            event.block.timestamp
        )
    }

    let oldAddress = event.params._old
    let oldContract = RegisteredTokenFactory.load(oldAddress.toHex())

    if (!oldContract) {
        oldContract = createRegisteredTokenFactory(
            oldAddress,
            event.params._contractName,
            event.block.timestamp
        )
        oldContract.save()
    }

    contract.old = oldContract.address.toHex()

    contract.save()
}
