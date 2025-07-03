class ChainId {
    mainnet: i32 = 1
    goerli: i32 = 5
    sepolia: i32 = 11155111
    arbitrum: i32 = 42161
    sonic: i32 = 146
    base: i32 = 8453
    optimism: i32 = 10
    hemi: i32 = 43111
    avalanche: i32 = 43114
    bsc: i32 = 56
}

const chainId = new ChainId()

export function getChainId(network: string): i32 {
    if (network == "mainnet") {
        return chainId.mainnet
    } else if (network == "goerli") {
        return chainId.goerli
    } else if (network == "sepolia") {
        return chainId.sepolia
    } else if (network == "arbitrum-one") {
        return chainId.arbitrum
    } else if (network == "sonic-mainnet") {
        return chainId.sonic
    } else if (network == "base") {
        return chainId.base
    } else if (network == "optimism") {
        return chainId.optimism
    } else if (network == "spectra-hemi") {
        return chainId.hemi
    } else if (network == "avalanche") {
        return chainId.avalanche
    } else if (network == "bsc") {
        return chainId.bsc
    }
    throw new Error(`Unsupported network: ${network}`)
}
