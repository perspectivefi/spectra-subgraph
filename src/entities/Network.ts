import { dataSource } from "@graphprotocol/graph-ts"

import { Network } from "../../generated/schema"
import { getChainId } from "../utils/ChainId"
import { logWarning } from "../utils";

export function setNetwork(): void {
    let network = Network.load("1")

    if (!network) {
        const chainName = dataSource.network()

        network = new Network("1")
        network.chainId = getChainId(chainName)
        network.name = chainName
        network.save()
    }
}

export function getNetwork(): Network {
    let network = Network.load("1")

    if (!network) {
        const chainName = dataSource.network()

        logWarning(chainName)

        network = new Network("1")
        network.chainId = getChainId(chainName)
        network.name = chainName
        network.save()
    }

    return network
}
