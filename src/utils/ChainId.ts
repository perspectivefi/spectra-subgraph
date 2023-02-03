class ChainId {
    mainnet: u8 = 1
    goerli: u8 = 5
}

const chainId = new ChainId()

export function getChainId(network: string): u8 {
    if (network == "mainnet") {
        return chainId.mainnet
    } else if (network == "goerli") {
        return chainId.goerli
    }
    return chainId.mainnet
}
