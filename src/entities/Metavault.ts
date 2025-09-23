import { Address, BigInt } from "@graphprotocol/graph-ts"

import { MetavaultWrapper } from "../../generated/Metavault/MetavaultWrapper"
import { Account, Metavault, MetavaultEpoch } from "../../generated/schema"
import { AssetType } from "../utils"
import { getAsset } from "./Asset"

export function getMetavault(
    metavaultWrapperAddress: Address,
    timestamp: BigInt,
    blockNumber: BigInt,
    type: string
): Metavault {
    let safeAddress = MetavaultWrapper.bind(metavaultWrapperAddress).try_owner()
        .value
    let metavault = Metavault.load(safeAddress.toHex())
    if (metavault) {
        return metavault
    }

    metavault = createMetavault(
        metavaultWrapperAddress,
        timestamp,
        blockNumber,
        type
    )
    // create the wrapper token asset type
    let wrapperToken = getAsset(
        metavaultWrapperAddress.toHex(),
        timestamp,
        AssetType.MV_SHARES
    )
    return metavault as Metavault
}

function createMetavault(
    metavaultWrapperAddress: Address,
    timestamp: BigInt,
    blockNumber: BigInt,
    type: string
): Metavault {
    let safeAddress = MetavaultWrapper.bind(metavaultWrapperAddress).try_owner()
        .value
    let metavault = new Metavault(safeAddress.toHex())
    metavault.createdAtTimestamp = timestamp
    metavault.createdAtBlock = blockNumber
    metavault.isMetavaultRegistered = false
    metavault.safeAddress = safeAddress
    metavault.address = safeAddress
    metavault.wrapperAddress = metavaultWrapperAddress
    metavault.infraVaultAddress = MetavaultWrapper.bind(
        metavaultWrapperAddress
    ).try_getInfraVault().value
    metavault.name = MetavaultWrapper.bind(
        metavaultWrapperAddress
    ).try_name().value
    metavault.symbol = MetavaultWrapper.bind(
        metavaultWrapperAddress
    ).try_symbol().value
    metavault.decimals = MetavaultWrapper.bind(
        metavaultWrapperAddress
    ).try_decimals().value

    let underlyingAddress = MetavaultWrapper.bind(
        metavaultWrapperAddress
    ).try_asset().value
    let underlyingAsset = getAsset(
        underlyingAddress.toHex(),
        timestamp,
        AssetType.UNDERLYING
    )
    underlyingAsset.save()

    metavault.underlying = underlyingAsset.address.toHex()
    metavault.markets = []
    metavault.chains = []

    let account = new Account(safeAddress.toHex())
    metavault.account = account.id

    metavault.save()
    return metavault
}

export function createMetavaultEpoch(
    metavaultWrapperAddress: Address,
    epochId: BigInt,
    rate: BigInt,
    assets: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt
): MetavaultEpoch {
    let safeAddress = MetavaultWrapper.bind(metavaultWrapperAddress).try_owner()
        .value
    let id =
        safeAddress.toHex() +
        "-" +
        epochId.toString() +
        "-" +
        timestamp.toString()
    let epochEntity = new MetavaultEpoch(id)

    epochEntity.timestamp = timestamp
    epochEntity.blockNumber = blockNumber
    epochEntity.rate = rate
    epochEntity.assets = assets
    epochEntity.metavault = safeAddress.toHex()

    epochEntity.save()
    return epochEntity
}
