import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

import { Asset } from "../../generated/schema"
import { AssetType } from "../utils"
import { getAsset } from "./Asset"
import { getERC20Decimals } from "./ERC20"
import { getERC4626Asset, getIBTRate, getUnderlyingUnit } from "./ERC4626"
import { getNetwork } from "./Network"

export function getIBTAsset(ibtAddress: Bytes, timestamp: BigInt): Asset {
    let ibt = Asset.load(ibtAddress.toString())
    if (ibt) {
        return ibt
    }
    ibt = createIBTAsset(ibtAddress, timestamp)
    return ibt
}

export function updateIBTRates(ibtAddress: Bytes, timestamp: BigInt): void {
    let ibt = getIBTAsset(ibtAddress, timestamp)
    let convertToAssets = getIBTRate(Address.fromBytes(ibtAddress))
    ibt.convertToAssetsUnit = convertToAssets
    const UNDERLYING_UNIT = getUnderlyingUnit(Address.fromBytes(ibtAddress))
    ibt.lastIBTRate = convertToAssets.divDecimal(UNDERLYING_UNIT.toBigDecimal())
    ibt.lastUpdateTimestamp = timestamp
    ibt.save()
}

export function createIBTAsset(ibtAddress: Bytes, timestamp: BigInt): Asset {
    let ibt = getAsset(ibtAddress.toHex(), timestamp, AssetType.IBT)
    ibt.chainId = getNetwork().chainId
    ibt.address = ibtAddress
    ibt.createdAtTimestamp = timestamp
    let convertToAssets = getIBTRate(Address.fromBytes(ibtAddress))
    ibt.convertToAssetsUnit = convertToAssets
    const underlying = getERC4626Asset(Address.fromBytes(ibtAddress))
    const underlying_decimals = getERC20Decimals(underlying)
    const UNDERLYING_UNIT = BigInt.fromI32(10).pow(underlying_decimals as u8)
    ibt.lastIBTRate = convertToAssets.divDecimal(UNDERLYING_UNIT.toBigDecimal())
    ibt.lastUpdateTimestamp = timestamp
    ibt.save()
    return ibt as Asset
}
