import { MetavaultRegistered, MetavaultUnregistered, ChainRegistered, ChainUnregistered, MarketRegistered, MarketUnregistered } from "../../../generated/MetavaultsRegistry/MetavaultsRegistry"
import { Metavault, Pool, RemoteMetavault } from "../../../generated/schema";

export function handleMetavaultRegistered(event: MetavaultRegistered): void {
    let metavault = Metavault.load(event.params.metavault.toHex())
    if (metavault) {
        metavault.isMetavaultRegistered = true
        metavault.save()
    }
}

export function handleMetavaultUnregistered(event: MetavaultUnregistered): void {
    let metavault = Metavault.load(event.params.metavault.toHex())
    if (metavault) {
        metavault.isMetavaultRegistered = false
        metavault.save()
    }
}

export function handleChainRegistered(event: ChainRegistered): void {
    let metavault = Metavault.load(event.params.metavault.toHex())
    if (metavault) {
        // Create RemoteMetavault entity
        let remoteMetavaultId = event.params.metavault.toHex() + "-" + event.params.chainId.toString()
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
}

export function handleChainUnregistered(event: ChainUnregistered): void {
    let metavault = Metavault.load(event.params.metavault.toHex())
    if (metavault) {
        let remoteMetavaultId = event.params.metavault.toHex() + "-" + event.params.chainId.toString()
        
        // Remove from metavault chains array
        let index = metavault.chains.indexOf(remoteMetavaultId)
        if (index > -1) {
            metavault.chains.splice(index, 1)
            metavault.save()
        }
    }
}

export function handleMarketRegistered(event: MarketRegistered): void {
    let poolAddress = event.params.market
    let pool = Pool.load(poolAddress.toHex())
    let metavault = Metavault.load(event.params.metavault.toHex())
    //Need a non null assesrtion otherwise subgraph crashes for some reason
    if (pool && metavault) {
        // metavault.markets.push(pool.id) does not work for some reason
        let markets = metavault.markets
        markets.push(pool.id)
        metavault.markets = markets
        metavault.save()
    }
}

export function handleMarketUnregistered(event: MarketUnregistered): void {
    let poolAddress = event.params.market
    let metavault = Metavault.load(event.params.metavault.toHex())
    
    if (metavault) {
        let index = metavault.markets.indexOf(poolAddress.toHex())
        if (index > -1) {
            // metavault.markets.splice(index, 1) does not work for some reason
            let markets = metavault.markets
            markets.splice(index, 1)
            metavault.markets = markets
            metavault.save()
        }
    }
}