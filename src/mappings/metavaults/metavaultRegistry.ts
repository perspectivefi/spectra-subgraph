import { MetavaultRegistered, MetavaultUnregistered, ChainRegistered, ChainUnregistered, MarketRegistered, MarketUnregistered } from "../../../generated/MetavaultsRegistry/MetavaultsRegistry"
import { Metavault, Pool } from "../../../generated/schema";

export function handleMetavaultRegistered(event: MetavaultRegistered): void {
    throw new Error("Not implemented");
}

export function handleMetavaultUnregistered(event: MetavaultUnregistered): void {
    throw new Error("Not implemented");
}

export function handleChainRegistered(event: ChainRegistered): void {

    throw new Error("Not implemented");
}

export function handleChainUnregistered(event: ChainUnregistered): void {
    throw new Error("Not implemented");
}

export function handleMarketRegistered(event: MarketRegistered): void {
    let poolAddress = event.params.market
    let pool = Pool.load(poolAddress.toHex())!
    let metavault = Metavault.load(event.params.metavault.toHex())!
    metavault.markets.push(pool.id)
    metavault.save()
    throw new Error("Not implemented");
}

export function handleMarketUnregistered(event: MarketUnregistered): void {
    throw new Error("Not implemented");
}