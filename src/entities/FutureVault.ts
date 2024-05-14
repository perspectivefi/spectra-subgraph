import { BigInt } from "@graphprotocol/graph-ts"
import { Address, log } from "@graphprotocol/graph-ts"

import { PrincipalToken } from "../../generated/templates/PrincipalToken/PrincipalToken"
import { UNIT_BI, ZERO_ADDRESS, ZERO_BI } from "../constants"

export function getExpirationTimestamp(futureVault: Address): BigInt {
    const principalTokenContract = PrincipalToken.bind(futureVault)

    let expiryCall = principalTokenContract.try_maturity()

    if (!expiryCall.reverted) {
        return expiryCall.value
    }

    log.warning("maturity() call reverted for {}", [futureVault.toHex()])

    return ZERO_BI
}

export function getUnclaimedFees(futureVault: Address): BigInt {
    const principalTokenContract = PrincipalToken.bind(futureVault)

    let unclaimedFeesCall = principalTokenContract.try_getUnclaimedFeesInIBT()

    if (!unclaimedFeesCall.reverted) {
        return unclaimedFeesCall.value
    }

    log.warning("getUnclaimedFeesInIBT() call reverted for {}", [
        futureVault.toHex(),
    ])

    return ZERO_BI
}

export function getName(address: Address): string {
    const principalTokenContract = PrincipalToken.bind(address)

    let nameCall = principalTokenContract.try_name()

    if (!nameCall.reverted) {
        return nameCall.value
    }

    log.warning("name() call reverted for {}", [address.toHex()])

    return ""
}

export function getSymbol(address: Address): string {
    const principalTokenContract = PrincipalToken.bind(address)

    let symbolCall = principalTokenContract.try_symbol()

    if (!symbolCall.reverted) {
        return symbolCall.value
    }

    log.warning("symbol() call reverted for {}", [address.toHex()])

    return ""
}

export function getUnderlying(address: Address): Address {
    const principalTokenContract = PrincipalToken.bind(address)

    let underlyingCall = principalTokenContract.try_underlying()

    if (!underlyingCall.reverted) {
        return underlyingCall.value
    }

    log.warning("underlying() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}

export function getIBT(address: Address): Address {
    const principalTokenContract = PrincipalToken.bind(address)

    let ibtCall = principalTokenContract.try_getIBT()

    if (!ibtCall.reverted) {
        return ibtCall.value
    }

    log.warning("getIBT() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}

// With 27 decimals precision
export function getIBTRate(address: Address): BigInt {
    const principalTokenContract = PrincipalToken.bind(address)

    let ibtRateCall = principalTokenContract.try_getIBTRate()

    if (!ibtRateCall.reverted) {
        return ibtRateCall.value
    }

    log.warning("getIBTRate() call reverted for {}", [address.toHex()])

    return UNIT_BI
}

// With 27 decimals precision
export function getPTRate(address: Address): BigInt {
    const principalTokenContract = PrincipalToken.bind(address)

    let ptRateCall = principalTokenContract.try_getPTRate()

    if (!ptRateCall.reverted) {
        return ptRateCall.value
    }

    log.warning("getPTRate() call reverted for {}", [address.toHex()])

    return UNIT_BI
}

export function getYT(address: Address): Address {
    const principalTokenContract = PrincipalToken.bind(address)

    let ytCall = principalTokenContract.try_getYT()

    if (!ytCall.reverted) {
        return ytCall.value
    }

    log.warning("getYT() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}

export function getTotalAssets(address: Address): BigInt {
    const principalTokenContract = PrincipalToken.bind(address)

    let totalAssetsCall = principalTokenContract.try_totalAssets()

    if (!totalAssetsCall.reverted) {
        return totalAssetsCall.value
    }

    log.warning("totalAssets() call reverted for {}", [address.toHex()])

    return ZERO_BI
}

// With 27 decimals precision
export function getIBTUnit(address: Address): BigInt {
    const principalTokenContract = PrincipalToken.bind(address)

    let ibtUnitCall = principalTokenContract.try_getIBTUnit()

    if (!ibtUnitCall.reverted) {
        return ibtUnitCall.value
    }

    log.warning("getIBTUnit() call reverted for {}", [address.toHex()])

    return ZERO_BI
}

export function getCurrentYieldOfUserInIBT(
    principalToken: Address,
    account: Address
): BigInt {
    const principalTokenContract = PrincipalToken.bind(principalToken)

    let userYieldInIBTCall =
        principalTokenContract.try_getCurrentYieldOfUserInIBT(account)

    if (!userYieldInIBTCall.reverted) {
        return userYieldInIBTCall.value
    }

    // No warning as this request is failing too often.
    // It is happening for all the requests if account do not exist in the contract as IBT yield owner

    return ZERO_BI
}
