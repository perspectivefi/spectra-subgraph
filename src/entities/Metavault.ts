import { MetavaultWrapper } from "../../generated/Metavault/MetavaultWrapper"
import { Metavault } from "../../generated/schema"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { getAsset } from "./Asset"
import { AssetType } from "../utils"

export function getMetavault(
    metavaultWrapperAddress: Address,
    timestamp: BigInt,
    blockNumber: BigInt,
    type: string
): Metavault {
    let safeAddress = MetavaultWrapper.bind(metavaultWrapperAddress).try_owner().value
    let metavault = Metavault.load(safeAddress.toHex())
    if (metavault) {
        return metavault
    }

    metavault = createMetavault(metavaultWrapperAddress, timestamp, blockNumber, type)
    // create the wrapper token asset type
    let wrapperToken = getAsset(
        metavaultWrapperAddress.toHex(),
        timestamp,
        AssetType.MV_SHARES
    )
    return metavault as Metavault
}


function createMetavault(metavaultWrapperAddress: Address, timestamp: BigInt, blockNumber: BigInt, type: string): Metavault {
    let safeAddress = MetavaultWrapper.bind(metavaultWrapperAddress).try_owner().value
    let metavault = new Metavault(safeAddress.toHex())
    metavault.createdAtTimestamp = timestamp
    metavault.createdAtBlock = blockNumber
    metavault.isMetavaultRegistered = false // we should call the metavault registry to check if the metavault is registered
    metavault.safeAddress = safeAddress // we should call the owner of the mv wrapper
    metavault.wrapperAddress = metavaultWrapperAddress
    metavault.infraVaultAddress = MetavaultWrapper.bind(metavaultWrapperAddress).try_getInfraVault().value
    metavault.name = MetavaultWrapper.bind(metavaultWrapperAddress).try_name().value
    metavault.symbol = MetavaultWrapper.bind(metavaultWrapperAddress).try_symbol().value
    metavault.underlying = MetavaultWrapper.bind(metavaultWrapperAddress).try_asset().value
    metavault.markets = []
    metavault.chains = []
    metavault.save()
    return metavault
}