import { store } from "@graphprotocol/graph-ts"

import {
    MetavaultRegistered,
    MetavaultUnregistered,
    ChainRegistered,
    ChainUnregistered,
    MarketRegistered,
    MarketRegisteredWithType,
    MarketUnregistered,
    BridgePathAllowed,
    MetavaultsRegistry,
} from "../../../generated/MetavaultsRegistry/MetavaultsRegistry"
import {
    MetavaultBridgePath,
    PendleMarket,
    Pool,
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
    let metavault = getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )
    metavault.isMetavaultRegistered = true
    metavault.save()
}

export function handleMetavaultUnregistered(
    event: MetavaultUnregistered
): void {
    let metavault = getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )
    metavault.isMetavaultRegistered = false
    metavault.save()
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

export function handleMarketRegistered(event: MarketRegistered): void {
    let poolAddress = event.params.market
    let pool = Pool.load(poolAddress.toHex())
    let metavault = getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )
    if (pool) {
        // metavault.markets.push(pool.id) does not work for some reason
        let markets = metavault.markets
        markets.push(pool.id)
        metavault.markets = markets
        metavault.save()
    }
}

export function handleMarketRegisteredWithType(
    event: MarketRegisteredWithType
): void {
    let metavault = getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )

    let protocolType = event.params.protocolType

    // ProtocolType.Spectra = 0
    if (protocolType == 0) {
        let pool = Pool.load(event.params.market.toHex())
        if (pool) {
            let markets = metavault.markets
            markets.push(pool.id)
            metavault.markets = markets
            metavault.save()
        }
    }
    // ProtocolType.Pendle = 1
    else if (protocolType == 1) {
        let marketAddress = event.params.market
        let pendleMarket = PendleMarket.load(marketAddress.toHex())

        if (!pendleMarket) {
            pendleMarket = new PendleMarket(marketAddress.toHex())
            pendleMarket.address = marketAddress
            pendleMarket.createdAtTimestamp = event.block.timestamp

            // Read token addresses from the registry contract
            let registry = MetavaultsRegistry.bind(event.address)
            let infosResult = registry.try_getPendleMarketInfos(marketAddress)

            if (!infosResult.reverted) {
                pendleMarket.sy = infosResult.value.sy
                pendleMarket.pt = infosResult.value.pt
                pendleMarket.yt = infosResult.value.yt
            } else {
                // Fallback: zero addresses if the call reverts
                pendleMarket.sy = marketAddress
                pendleMarket.pt = marketAddress
                pendleMarket.yt = marketAddress
            }

            pendleMarket.save()
        }

        let pendleMarkets = metavault.pendleMarkets
        if (pendleMarkets == null) {
            pendleMarkets = []
        }
        pendleMarkets.push(pendleMarket.id)
        metavault.pendleMarkets = pendleMarkets
        metavault.save()
    }
}

export function handleMarketUnregistered(event: MarketUnregistered): void {
    let marketAddress = event.params.market
    let metavault = getMetavault(
        event.params.metavault,
        event.block.timestamp,
        event.block.number
    )

    // Try removing from Spectra markets
    let index = metavault.markets.indexOf(marketAddress.toHex())
    if (index > -1) {
        let markets = metavault.markets
        markets.splice(index, 1)
        metavault.markets = markets
        metavault.save()
        return
    }

    // Try removing from Pendle markets
    let pendleMarkets = metavault.pendleMarkets
    if (pendleMarkets != null) {
        let pendleIndex = pendleMarkets.indexOf(marketAddress.toHex())
        if (pendleIndex > -1) {
            pendleMarkets.splice(pendleIndex, 1)
            metavault.pendleMarkets = pendleMarkets
            metavault.save()
        }
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
