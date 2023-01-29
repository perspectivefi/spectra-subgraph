import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { ERC20 } from "../../generated/ChainlinkAggregatorDataSource/ERC20"
import { ZERO_BI } from "../constants"

const UNKNOWN = "Unknown"

export function getERC20Name(address: Address): string {
    let erc20Contract = ERC20.bind(address)

    let nameCall = erc20Contract.try_name()

    if (!nameCall.reverted) {
        return nameCall.value
    }

    log.warning("name() call (string or bytes) reverted for {}", [
        address.toHex(),
    ])
    return UNKNOWN
}

export function getERC20Symbol(address: Address): string {
    let erc20Contract = ERC20.bind(address)

    let symbolCall = erc20Contract.try_symbol()

    if (!symbolCall.reverted) {
        return symbolCall.value
    }

    log.warning("symbol() call (string or bytes) reverted for {}", [
        address.toHex(),
    ])
    return UNKNOWN
}

export function getERC20Decimals(address: Address): i32 {
    let erc20Contract = ERC20.bind(address)

    let decimalsCall = erc20Contract.try_decimals()

    if (!decimalsCall.reverted) {
        return decimalsCall.value
    }

    log.warning("decimals() call (number) reverted for {}", [address.toHex()])
    return 18
}

export function getERC20Balance(
    tokenAddress: Address,
    account: Address
): BigInt {
    let erc20Contract = ERC20.bind(tokenAddress)

    let balanceOfCall = erc20Contract.try_balanceOf(account)

    if (!balanceOfCall.reverted) {
        return balanceOfCall.value
    }

    log.warning("balanceOfCall() call (BigNumber) reverted for {}", [
        tokenAddress.toHex(),
    ])
    return ZERO_BI
}
