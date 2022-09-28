import { FutureVaultDeployed } from "../../generated/Futures/TokenFactory"
import { Future } from "../../generated/schema"
import { getExpirationTimestamp } from "../entities/FutureVault"

export function handleFutureVaultDeployed(event: FutureVaultDeployed): void {
    const newFuture = new Future(event.params._futureVault.toHex())
    newFuture.state = "ACTIVE"
    newFuture.address = event.params._futureVault.toHex()
    newFuture.createdAtTimestamp = event.block.timestamp

    let expiry = getExpirationTimestamp(event.params._futureVault)

    newFuture.expirationAtTimestamp = expiry

    newFuture.save()
}
