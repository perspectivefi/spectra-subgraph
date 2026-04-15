import { store } from "@graphprotocol/graph-ts"

import {
    MetavaultRegistered,
    MetavaultUnregistered,
    ChainRegistered,
    ChainUnregistered,
    BridgePathAllowed,
} from "../../../generated/MetavaultsRegistry/MetavaultsRegistry"
import {
    MetavaultBridgePath,
    RemoteMetavault,
} from "../../../generated/schema"
import { getAsset } from "../../entities/Asset"
import {
    createMetavaultBridgePath,
    getMetavault,
    getMetavaultBridgePathId,
} from "../../entities/Metavault"
import AssetType from "../../utils/AssetType"

export function handleMetavaultRegistered(event: MetavaultRegistered): void {
    getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )
}

export function handleMetavaultUnregistered(
    event: MetavaultUnregistered
): void {
    getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )
}

export function handleChainRegistered(event: ChainRegistered): void {
    let metavault = getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )

    // Create RemoteMetavault entity
    let remoteMetavaultId =
        event.params.metavault.toHex() + "-" + event.params.chainId.toString()
    let remoteMetavault = new RemoteMetavault(remoteMetavaultId)
    remoteMetavault.chainId = event.params.chainId.toI32()
    remoteMetavault.remoteMetavaultAddress = event.params.remoteMetavaultAddress
    remoteMetavault.save()

    // Add to metavault chains array
    let chains = metavault.chains
    chains.push(remoteMetavault.id)
    metavault.chains = chains
    metavault.save()
}

export function handleChainUnregistered(event: ChainUnregistered): void {
    let metavault = getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )

    let remoteMetavaultId =
        event.params.metavault.toHex() + "-" + event.params.chainId.toString()

    // Remove from metavault chains array
    let index = metavault.chains.indexOf(remoteMetavaultId)
    if (index > -1) {
        metavault.chains.splice(index, 1)
        metavault.save()
    }
}

export function handleBridgePathAllowed(event: BridgePathAllowed): void {
    getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )
    getAsset(
        event.params.tokenIn.toHex(),
        event.block.timestamp,
        AssetType.UNDERLYING
    )
    getAsset(
        event.params.tokenOut.toHex(),
        event.block.timestamp,
        AssetType.UNDERLYING
    )
    createMetavaultBridgePath(
        event.params.metavault,
        event.params.tokenIn,
        event.params.tokenOut,
        event.params.dstChainId,
        event.params.bridge
    )
}

export function handleBridgePathRemoved(event: BridgePathAllowed): void {
    let bridgePath = MetavaultBridgePath.load(
        getMetavaultBridgePathId(
            event.params.metavault,
            event.params.tokenIn,
            event.params.tokenOut,
            event.params.dstChainId,
            event.params.bridge
        )
    )
    if (bridgePath) {
        store.remove("MetavaultBridgePath", bridgePath.id)
    }
}
