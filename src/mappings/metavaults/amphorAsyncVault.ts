import { BigInt, Address } from "@graphprotocol/graph-ts"

import {
    EpochStart,
} from "../../../generated/templates/AmphorAsyncVault/AmphorAsyncVault"

import { AmphorAsyncVault } from "../../../generated/templates/AmphorAsyncVault/AmphorAsyncVault"
import { createMetavaultEpoch } from "../../entities/Metavault"
import { Infravault, Metavault } from "../../../generated/schema"


export function handleEpochStart(event: EpochStart): void {
    const infravault = Infravault.load(event.address.toHex())
    if (!infravault) {
        return
    }
    const metavault = Metavault.load(infravault.metavault)
    if (!metavault) {
        return
    }
    const lastSavedBalance = event.params.lastSavedBalance
    const totalShares = event.params.totalShares
    const asyncVault = AmphorAsyncVault.bind(event.address)
    const epochId = asyncVault.try_epochId().value
    const amphorSharesDecimals = asyncVault.try_decimals().value
    createMetavaultEpoch(
        Address.fromBytes(metavault.wrapperAddress),
        epochId,
        lastSavedBalance
            .times(BigInt.fromString("10").pow(amphorSharesDecimals as u8))
            .div(totalShares),
        lastSavedBalance,
        event.block.timestamp,
        event.block.number
    )
}
