import { Address, BigInt } from "@graphprotocol/graph-ts"

import { Asset } from "../../generated/schema"
import { getERC20Decimals, getERC20Name, getERC20Symbol } from "./ERC20"
import { getNetwork } from "./Network"

export function getAsset(
    address: string,
    timestamp: BigInt,
    type: string,
    id?: string
): Asset {
    let asset = Asset.load(id || address)
    if (asset) {
        return asset
    }

    asset = createAsset(address, timestamp, type)

    return asset as Asset
}

function createAsset(address: string, timestamp: BigInt, type: string, id?: string): Asset {
    let asset = new Asset(id || address)
    asset.chainId = getNetwork().chainId
    asset.address = Address.fromString(address)
    asset.createdAtTimestamp = timestamp
    asset.type = type

    asset.name = getERC20Name(Address.fromString(address))
    asset.symbol = getERC20Symbol(Address.fromString(address))
    asset.decimals = getERC20Decimals(Address.fromString(address))

    asset.save()
    return asset
}


export function getAssetID(address:string, suffix: string): string {
    return address + "_" + suffix
}

