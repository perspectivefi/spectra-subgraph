import { BigInt } from "@graphprotocol/graph-ts"
import { Address, log } from "@graphprotocol/graph-ts"

import { FutureVault } from "../../generated/FutureVault/FutureVault"

export function getExpirationTimestamp(address: Address): BigInt {
    const futureContract = FutureVault.bind(address)

    let expiryCall = futureContract.try_EXPIRY()

    if (!expiryCall.reverted) {
        return expiryCall.value
    }

    log.warning("EXPIRY() call reverted for {}", [address.toHex()])

    return BigInt.fromString("0")
}

export function getMaxFeeRate(address: Address): BigInt {
    const futureContract = FutureVault.bind(address)

    let maxProtocolFeeCall = futureContract.try_MAX_PROTOCOL_FEE()

    if (!maxProtocolFeeCall.reverted) {
        return maxProtocolFeeCall.value
    }

    log.warning("MAX_PROTOCOL_FEE() call reverted for {}", [address.toHex()])

    return BigInt.fromString("0")
}

export function getName(address: Address): string {
    const futureContract = FutureVault.bind(address)

    let nameCall = futureContract.try_name()

    if (!nameCall.reverted) {
        return nameCall.value
    }

    log.warning("name() call reverted for {}", [address.toHex()])

    return ""
}

export function getSymbol(address: Address): string {
    const futureContract = FutureVault.bind(address)

    let symbolCall = futureContract.try_symbol()

    if (!symbolCall.reverted) {
        return symbolCall.value
    }

    log.warning("symbol() call reverted for {}", [address.toHex()])

    return ""
}

export function getUnderlying(address: Address): Address {
    const futureContract = FutureVault.bind(address)

    let underlyingCall = futureContract.try_underlying()

    if (!underlyingCall.reverted) {
        return underlyingCall.value
    }

    log.warning("underlying() call reverted for {}", [address.toHex()])

    return Address.fromString("0x0000000000000000000000000000000000000000")
}

export function getIBT(address: Address): Address {
    const futureContract = FutureVault.bind(address)

    let ibtCall = futureContract.try_asset()

    if (!ibtCall.reverted) {
        return ibtCall.value
    }

    log.warning("asset() call reverted for {}", [address.toHex()])

    return Address.fromString("0x0000000000000000000000000000000000000000")
}

export function getTotalAssets(address: Address): BigInt {
    const futureContract = FutureVault.bind(address)

    let totalAssetsCall = futureContract.try_totalAssets()

    if (!totalAssetsCall.reverted) {
        return totalAssetsCall.value
    }

    log.warning("totalAssets() call reverted for {}", [address.toHex()])

    return BigInt.fromString("0")
}
