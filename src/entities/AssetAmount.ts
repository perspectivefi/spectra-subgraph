import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

import { AssetAmount } from "../../generated/schema"
import { ZERO_BI } from "../constants"
import { generateAssetAmountId } from "../utils"
import { getAsset } from "./Asset"

export function getAssetAmount(
    transactionAddress: Bytes,
    assetAddress: Address,
    amount: BigInt,
    type: string,
    timestamp: BigInt
): AssetAmount {
    let id = generateAssetAmountId(
        transactionAddress.toHex(),
        assetAddress.toHex()
    )

    let assetAmount = AssetAmount.load(id)

    if (!assetAmount) {
        assetAmount = createAssetAmount(id, assetAddress, type, timestamp)
    }

    let newAmount = assetAmount.amount.plus(amount)
    assetAmount.amount = newAmount

    assetAmount.save()

    return assetAmount as AssetAmount
}

export function createAssetAmount(
    id: string,
    assetAddress: Address,
    type: string,
    timestamp: BigInt
): AssetAmount {
    let asset = getAsset(assetAddress.toHex(), timestamp, type)

    let assetAmount = new AssetAmount(id)

    assetAmount.createdAtTimestamp = timestamp

    assetAmount.amount = ZERO_BI
    assetAmount.asset = asset.id

    assetAmount.save()
    return assetAmount
}
