import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { LPVault } from "../../generated/templates/LPVault/LPVault"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"

export function getName(address: Address): string {
    const lpVaultContract = LPVault.bind(address)

    let nameCall = lpVaultContract.try_name()

    if (!nameCall.reverted) {
        return nameCall.value
    }

    log.warning("name() call reverted for {}", [address.toHex()])

    return ""
}

export function getSymbol(address: Address): string {
    const lpVaultContract = LPVault.bind(address)

    let symbolCall = lpVaultContract.try_symbol()

    if (!symbolCall.reverted) {
        return symbolCall.value
    }

    log.warning("symbol() call reverted for {}", [address.toHex()])

    return ""
}

export function getTotalSupply(address: Address): BigInt {
    const lpVaultContract = LPVault.bind(address)

    let totalSupplyCall = lpVaultContract.try_totalSupply()

    if (!totalSupplyCall.reverted) {
        return totalSupplyCall.value
    }

    log.warning("totalSupply() call reverted for {}", [address.toHex()])

    return ZERO_BI
}

export function getUnderlying(address: Address): Address {
    const lpVaultContract = LPVault.bind(address)

    let assetCall = lpVaultContract.try_asset()

    if (!assetCall.reverted) {
        return assetCall.value
    }

    log.warning("asset() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}

export function getTotalAssets(address: Address): BigInt {
    const lpVaultContract = LPVault.bind(address)

    let totalAssetsCall = lpVaultContract.try_totalAssets()

    if (!totalAssetsCall.reverted) {
        return totalAssetsCall.value
    }

    log.warning("totalAssets() call reverted for {}", [address.toHex()])

    return ZERO_BI
}
