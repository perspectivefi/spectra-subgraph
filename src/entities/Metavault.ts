import { Address, BigInt } from "@graphprotocol/graph-ts"

import { MetavaultWrapper } from "../../generated/Metavault/MetavaultWrapper"
import {
    Account,
    Metavault,
    MetavaultEpoch,
    Infravault,
    MetavaultBridgePath,
} from "../../generated/schema"
import {
    AmphorAsyncVault as AmphorAsyncVaultTemplate,
    GnosisSafe,
} from "../../generated/templates"
import { AmphorAsyncVault } from "../../generated/templates/AmphorAsyncVault/AmphorAsyncVault"
import { InfraVaultType } from "../utils"
import { AssetType } from "../utils"
import { getAccount } from "./Account"
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

export function getMetavaultFromWrapper(
    metavaultWrapperAddress: Address,
    timestamp: BigInt,
    blockNumber: BigInt
): Metavault {
    let safeAddress = MetavaultWrapper.bind(metavaultWrapperAddress).try_owner()
        .value
    let metavault = getMetavault(safeAddress, timestamp, blockNumber)
    if (metavault.wrapperAddress) {
        // metavault already exists and has a wrapper assigned
        return metavault
    }

    // metavault does not have a wrapper assigned yet, fill remaining fields
    {
        metavault.wrapperAddress = metavaultWrapperAddress
        const infravaultAddress = MetavaultWrapper.bind(
            metavaultWrapperAddress
        ).try_getInfraVault().value
        const infravault = createInfravault(infravaultAddress, safeAddress)
        metavault.infravault = infravault.id
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
        // create the wrapper token asset type
        getAsset(
            metavaultWrapperAddress.toHex(),
            timestamp,
            AssetType.MV_SHARES
        )
        metavault.save()
    }

    return metavault as Metavault
}

export function getMetavault(
    metavaultAddress: Address,
    timestamp: BigInt,
    blockNumber: BigInt
): Metavault {
    let metavault = Metavault.load(metavaultAddress.toHex())
    if (metavault) {
        return metavault
    }

    metavault = createMetavault(metavaultAddress, timestamp, blockNumber)
    return metavault as Metavault
}

function createMetavault(
    metavaultAddress: Address,
    timestamp: BigInt,
    blockNumber: BigInt
): Metavault {
    let metavault = new Metavault(metavaultAddress.toHex())
    metavault.createdAtTimestamp = timestamp
    metavault.createdAtBlock = blockNumber
    metavault.isMetavaultRegistered = false
    metavault.safeAddress = metavaultAddress
    metavault.address = metavaultAddress

    metavault.markets = []
    metavault.chains = []

    let account = getAccount(metavaultAddress.toHex(), timestamp)
    metavault.account = account.id

    metavault.save()
    GnosisSafe.create(Address.fromBytes(metavault.safeAddress))
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

export function getMetavaultBridgePathId(
    metavaultAddress: Address,
    tokenIn: Address,
    tokenOut: Address,
    dstChainId: BigInt,
    bridgeAddress: Address
): string {
    return (
        metavaultAddress.toHex() +
        "-" +
        tokenIn.toHex() +
        "-" +
        tokenOut.toHex() +
        "-" +
        dstChainId.toString() +
        "-" +
        bridgeAddress.toHex()
    )
}

export function createMetavaultBridgePath(
    metavaultAddress: Address,
    tokenIn: Address,
    tokenOut: Address,
    dstChainId: BigInt,
    bridgeAddress: Address
): MetavaultBridgePath {
    let bridgePathEntity = new MetavaultBridgePath(
        getMetavaultBridgePathId(
            metavaultAddress,
            tokenIn,
            tokenOut,
            dstChainId,
            bridgeAddress
        )
    )
    bridgePathEntity.metavault = metavaultAddress.toHex()
    bridgePathEntity.tokenIn = tokenIn.toHex()
    bridgePathEntity.tokenOut = tokenOut.toHex()
    bridgePathEntity.dstChainId = dstChainId.toI32()
    bridgePathEntity.bridgeAddress = bridgeAddress
    bridgePathEntity.save()
    return bridgePathEntity
}
