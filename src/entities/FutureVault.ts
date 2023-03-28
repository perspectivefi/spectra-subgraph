import { BigInt } from "@graphprotocol/graph-ts"
import { Address, log } from "@graphprotocol/graph-ts"

import { PrincipalToken } from "../../generated/templates/PrincipalToken/PrincipalToken"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"

export function getExpirationTimestamp(futureVault: Address): BigInt {
    const futureContract = PrincipalToken.bind(futureVault)

    let expiryCall = futureContract.try_maturity()

    if (!expiryCall.reverted) {
        return expiryCall.value
    }

    log.warning("maturity() call reverted for {}", [futureVault.toHex()])

    return ZERO_BI
}

export function getFeeRate(futureVault: Address): BigInt {
    const futureContract = PrincipalToken.bind(futureVault)

    let protocolFeeCall = futureContract.try_getProtocolFee()

    if (!protocolFeeCall.reverted) {
        return protocolFeeCall.value
    }

    log.warning("getProtocolFee() call reverted for {}", [futureVault.toHex()])

    return ZERO_BI
}

export function getUnclaimedFees(futureVault: Address): BigInt {
    const futureContract = PrincipalToken.bind(futureVault)

    let unclaimedFeesCall = futureContract.try_getUnclaimedFeesInIBT()

    if (!unclaimedFeesCall.reverted) {
        return unclaimedFeesCall.value
    }

    log.warning("getUnclaimedFeesInIBT() call reverted for {}", [
        futureVault.toHex(),
    ])

    return ZERO_BI
}

export function getName(address: Address): string {
    const futureContract = PrincipalToken.bind(address)

    let nameCall = futureContract.try_name()

    if (!nameCall.reverted) {
        return nameCall.value
    }

    log.warning("name() call reverted for {}", [address.toHex()])

    return ""
}

export function getSymbol(address: Address): string {
    const futureContract = PrincipalToken.bind(address)

    let symbolCall = futureContract.try_symbol()

    if (!symbolCall.reverted) {
        return symbolCall.value
    }

    log.warning("symbol() call reverted for {}", [address.toHex()])

    return ""
}

export function getUnderlying(address: Address): Address {
    const futureContract = PrincipalToken.bind(address)

    let underlyingCall = futureContract.try_underlying()

    if (!underlyingCall.reverted) {
        return underlyingCall.value
    }

    log.warning("underlying() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}

export function getIBT(address: Address): Address {
    const futureContract = PrincipalToken.bind(address)

    let ibtCall = futureContract.try_getIBT()

    if (!ibtCall.reverted) {
        return ibtCall.value
    }

    log.warning("getIBT() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}

export function getYT(address: Address): Address {
    const futureContract = PrincipalToken.bind(address)

    let ytCall = futureContract.try_getYT()

    if (!ytCall.reverted) {
        return ytCall.value
    }

    log.warning("getYT() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}

export function getTotalAssets(address: Address): BigInt {
    const futureContract = PrincipalToken.bind(address)

    let totalAssetsCall = futureContract.try_totalAssets()

    if (!totalAssetsCall.reverted) {
        return totalAssetsCall.value
    }

    log.warning("totalAssets() call reverted for {}", [address.toHex()])

    return ZERO_BI
}

export function getIBTUnit(address: Address): BigInt {
    const futureContract = PrincipalToken.bind(address)

    let ibtUnitCall = futureContract.try_getIBTUnit()

    if (!ibtUnitCall.reverted) {
        return ibtUnitCall.value
    }

    log.warning("getIBTUnit() call reverted for {}", [address.toHex()])

    return ZERO_BI
}
