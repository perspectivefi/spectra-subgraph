import { BigInt } from "@graphprotocol/graph-ts"
import { Address, log } from "@graphprotocol/graph-ts/index"

import { FutureVault } from "../../generated/FutureVault/FutureVault"

export function getExpirationTimestamp(address: Address): BigInt {
    const futureContract = FutureVault.bind(address)

    let expiryCall = futureContract.try_EXPIRY()

    if (!expiryCall.reverted) {
        return expiryCall.value
    }

    log.warning("EXPIRY() call reverted for {}", [address.toHex()])

    return BigInt.fromString("0")
}
