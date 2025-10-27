import { BigInt, Address } from "@graphprotocol/graph-ts"

import { Infravault, Metavault } from "../../../generated/schema"
import { EpochStart } from "../../../generated/templates/AmphorAsyncVault/AmphorAsyncVault"
import { AmphorAsyncVault } from "../../../generated/templates/AmphorAsyncVault/AmphorAsyncVault"
import { createMetavaultEpoch } from "../../entities/Metavault"

export function handleEpochStart(event: EpochStart): void {
    const infravault = Infravault.load(event.address.toHex())
    if (!infravault) {
        return
    }
    const metavault = Metavault.load(infravault.metavault)
    if (!metavault || !metavault.wrapperAddress) {
        // a valid infravault without a metavault wrapper should not happen
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
