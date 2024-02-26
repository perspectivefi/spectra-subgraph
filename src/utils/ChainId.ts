class ChainId {
    mainnet: i32 = 1
    goerli: i32 = 5
    sepolia: i32 = 11155111
}

const chainId = new ChainId()

export function getChainId(network: string): i32 {
    if (network == "mainnet") {
        return chainId.mainnet
    } else if (network == "goerli") {
        return chainId.goerli
    } else if (network == "sepolia") {
        return chainId.sepolia
    }
    return chainId.mainnet
}
