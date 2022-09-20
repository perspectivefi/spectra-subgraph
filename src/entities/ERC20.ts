import { Address, log } from "@graphprotocol/graph-ts"

import { ERC20Contract } from "../../generated/ChainlinkAggregatorDataSource/ERC20Contract"

const UNKNOWN = "Unknown"

export function getERC20Name(address: Address): string {
    let contract = ERC20Contract.bind(address)

    let nameCall = contract.try_name()

    if (!nameCall.reverted) {
        return nameCall.value
    }

    log.warning("name() call (string or bytes) reverted for {}", [
        address.toHex(),
    ])
    return UNKNOWN
}

export function getERC20Symbol(address: Address): string {
    let contract = ERC20Contract.bind(address)

    let symbolCall = contract.try_symbol()

    if (!symbolCall.reverted) {
        return symbolCall.value
    }

    log.warning("symbol() call (string or bytes) reverted for {}", [
        address.toHex(),
    ])
    return UNKNOWN
}

export function getERC20Decimals(address: Address): i32 {
    let contract = ERC20Contract.bind(address)

    let decimalsCall = contract.try_decimals()

    if (!decimalsCall.reverted) {
        return decimalsCall.value
    }

    log.warning("decimals() call (number) reverted for {}", [address.toHex()])
    return 18
}
