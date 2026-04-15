import { BigInt, Address } from "@graphprotocol/graph-ts"

import { MetavaultMetadata, Metavault } from "../../../generated/schema"
import { EpochStart } from "../../../generated/templates/AmphorAsyncVault/AmphorAsyncVault"
import { AmphorAsyncVault } from "../../../generated/templates/AmphorAsyncVault/AmphorAsyncVault"
import { createMetavaultEpoch } from "../../entities/Metavault"

export function handleEpochStart(event: EpochStart): void {
    // Reverse-lookup: find the metavault that owns this vault address.
    // The entry is created by handleAddressSet when core.vault key is set.
    let reverseEntry = MetavaultMetadata.load(
        "vault-reverse-" + event.address.toHex()
    )
    if (!reverseEntry) {
        return
    }
    const metavault = Metavault.load(reverseEntry.vault)
    if (!metavault || !metavault.wrapperAddress) {
        return
    }
    const lastSavedBalance = event.params.lastSavedBalance
    const totalShares = event.params.totalShares
    const asyncVault = AmphorAsyncVault.bind(event.address)
    const epochId = asyncVault.try_epochId().value
    const amphorSharesDecimals = asyncVault.try_decimals().value
    createMetavaultEpoch(
        Address.fromBytes(metavault.wrapperAddress!),
        epochId,
        lastSavedBalance
            .times(BigInt.fromString("10").pow(amphorSharesDecimals as u8))
            .div(totalShares),
        lastSavedBalance,
        event.block.timestamp,
        event.block.number
    )
}
