import { RegistryUpdate } from "../../generated/Registry/Registry"
import { FutureVaultFactory } from "../../generated/schema"
import { createFutureVaultFactory } from "../entities/FutureVaultFactory"

export function handleRegistryUpdate(event: RegistryUpdate): void {
    let contractAddress = event.params._new
    let futureVaultFactory = FutureVaultFactory.load(contractAddress.toHex())

    if (!futureVaultFactory) {
        futureVaultFactory = createFutureVaultFactory(
            contractAddress,
            event.params._contractName,
            event.block.timestamp
        )
    }

    let oldAddress = event.params._old
    let oldFutureVaultFactory = FutureVaultFactory.load(oldAddress.toHex())

    if (!oldFutureVaultFactory) {
        oldFutureVaultFactory = createFutureVaultFactory(
            oldAddress,
            event.params._contractName,
            event.block.timestamp
        )
        oldFutureVaultFactory.save()
    }

    futureVaultFactory.old = oldFutureVaultFactory.address.toHex()

    futureVaultFactory.save()
}
