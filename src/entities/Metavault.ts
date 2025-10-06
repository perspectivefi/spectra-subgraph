import { Address, BigInt } from "@graphprotocol/graph-ts"

import { MetavaultWrapper } from "../../generated/Metavault/MetavaultWrapper"
import {
    Account,
    Metavault,
    MetavaultEpoch,
    Infravault,
} from "../../generated/schema"
import { AmphorAsyncVault as AmphorAsyncVaultTemplate } from "../../generated/templates"
import { AmphorAsyncVault } from "../../generated/templates/AmphorAsyncVault/AmphorAsyncVault"
import { InfraVaultType } from "../utils"
import { AssetType } from "../utils"
import { getAsset } from "./Asset"

export function createInfravault(
    infravaultAddress: Address,
    metavaultAddress: Address
): Infravault {
    let infravault = new Infravault(infravaultAddress.toHex())
    infravault.address = infravaultAddress

    infravault.type = inferInfravaultType(infravaultAddress)
    infravault.metavault = metavaultAddress.toHex()
    infravault.save()

    if (infravault.type == InfraVaultType.AMPHOR_ASYNC_VAULT) {
        AmphorAsyncVaultTemplate.create(infravaultAddress)
    }

    return infravault
}

export function inferInfravaultType(infravaultAddress: Address): string {
    const infravault = AmphorAsyncVault.bind(infravaultAddress)

    let pendingSiloCall = infravault.try_pendingSilo()
    let claimableSilo = infravault.try_claimableSilo()
    let epochId = infravault.try_epochId()

    if (
        !pendingSiloCall.reverted &&
        !claimableSilo.reverted &&
        !epochId.reverted
    ) {
        return InfraVaultType.AMPHOR_ASYNC_VAULT
    }

    return InfraVaultType.UNKNOWN
}

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

    const infravaultAddress = MetavaultWrapper.bind(
        metavaultWrapperAddress
    ).try_getInfraVault().value
    const infravault = createInfravault(infravaultAddress, safeAddress)
    metavault.infravault = infravault.id

    MetavaultWrapper.bind(metavaultWrapperAddress).try_getInfraVault().value

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
