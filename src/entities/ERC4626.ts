import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { Asset } from "../../generated/schema"
import { ERC4626 } from "../../generated/templates/PrincipalToken/ERC4626"
import { UNIT_BI, ZERO_ADDRESS, ZERO_BI } from "../constants"
import { getERC20Decimals } from "./ERC20"

export function getIBTRate(address: Address): BigInt {
    let erc4626Contract = ERC4626.bind(address)
    const ibtDecimals = getERC20Decimals(address)
    const IBT_UNIT = BigInt.fromI32(10).pow(ibtDecimals as u8)
    let rate = erc4626Contract.try_convertToAssets(IBT_UNIT)

    if (!rate.reverted) {
        return rate.value
    }

    log.warning("convertToAssets() call reverted for {}", [address.toHex()])
    return UNIT_BI
}

export function getERC4626Asset(address: Address): Address {
    let erc4626Contract = ERC4626.bind(address)
    let asset = erc4626Contract.try_asset()

    if (!asset.reverted) {
        return asset.value
    }

    log.warning("asset() call reverted for {}", [address.toHex()])

    return ZERO_ADDRESS
}

export function getERC4626UnderlyingDecimals(address: Address): i32 {
    let ibtAsset = Asset.load(address.toHex())
    if (ibtAsset) {
        let underlyingAddress = ibtAsset.underlying
        if (underlyingAddress) {
            return getERC20Decimals(Address.fromString(underlyingAddress))
        }
    }
    let underlying = getERC4626Asset(address)
    return getERC20Decimals(underlying)
}

export function getUnderlyingUnit(address: Address): BigInt {
    let underlyingDecimals = getERC4626UnderlyingDecimals(address)
    return BigInt.fromI32(10).pow(underlyingDecimals as u8)
}

export function getERC4626Balance(
    tokenAddress: Address,
    account: Address
): BigInt {
    let erc4626Contract = ERC4626.bind(tokenAddress)

    let balanceOfCall = erc4626Contract.try_balanceOf(account)

    if (!balanceOfCall.reverted) {
        return balanceOfCall.value
    }

    log.warning("balanceOfCall() call (BigNumber) reverted for {}", [
        tokenAddress.toHex(),
    ])
    return ZERO_BI
}

export function getSharesRate(tokenAddress: Address, value: BigInt): BigInt {
    let erc4626Contract = ERC4626.bind(tokenAddress)

    let convertToSharesCall = erc4626Contract.try_convertToShares(value)

    if (!convertToSharesCall.reverted) {
        return convertToSharesCall.value
    }

    log.warning("convertToSharesCall() call (BigNumber) reverted for {}", [
        tokenAddress.toHex(),
    ])
    return UNIT_BI
}
