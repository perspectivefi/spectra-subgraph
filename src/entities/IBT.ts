import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

import { IBT } from "../../generated/schema"
import { AssetType } from "../utils"
import { generateIBTId } from "../utils/idGenerators"
import { getAsset } from "./Asset"
import { getERC20Decimals } from "./ERC20"
import { getERC4626Asset, getIBTRate, getUnderlyingUnit } from "./ERC4626"
import { getNetwork } from "./Network"

export function getIBT(ibtAddress: Bytes, timestamp: BigInt): IBT {
    const ibtID = generateIBTId(ibtAddress.toHex())
    let ibt = IBT.load(ibtID)
    if (ibt) {
        return ibt
    }
    ibt = createIBT(ibtAddress, timestamp)
    return ibt
}

export function updateIBTRates(ibtAddress: Bytes, timestamp: BigInt): void {
    let ibt = getIBT(ibtAddress, timestamp)
    let convertToAssets = getIBTRate(Address.fromBytes(ibtAddress))
    ibt.convertToAssetsUnit = convertToAssets
    const UNDERLYING_UNIT = getUnderlyingUnit(Address.fromBytes(ibtAddress))
    ibt.lastIBTRate = convertToAssets.divDecimal(UNDERLYING_UNIT.toBigDecimal())
    ibt.lastUpdateTimestamp = timestamp
    ibt.save()
}

export function createIBT(ibtAddress: Bytes, timestamp: BigInt): IBT {
    const ibtID = generateIBTId(ibtAddress.toHex())
    let ibt = new IBT(ibtID)
    ibt.chainId = getNetwork().chainId
    ibt.address = ibtAddress
    ibt.createdAtTimestamp = timestamp
    let ibtDetails = getAsset(ibtAddress.toHex(), timestamp, AssetType.IBT)
    let convertToAssets = getIBTRate(Address.fromBytes(ibtAddress))
    ibt.convertToAssetsUnit = convertToAssets
    const underlying = getERC4626Asset(Address.fromBytes(ibtAddress))
    const underlying_decimals = getERC20Decimals(underlying)
    const UNDERLYING_UNIT = BigInt.fromI32(10).pow(underlying_decimals as u8)
    ibt.ibtDetails = ibtDetails.id
    ibt.lastIBTRate = convertToAssets.divDecimal(UNDERLYING_UNIT.toBigDecimal())
    ibt.lastUpdateTimestamp = timestamp
    ibt.save()
    return ibt as IBT
}
