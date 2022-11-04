import { Address, BigInt } from "@graphprotocol/graph-ts"

import { UserAsset } from "../../generated/schema"
import { ZERO_BI } from "../constants"
import { generateUserAssetId } from "../utils"
import { getAsset } from "./Asset"
import { getUser } from "./User"

export function createUserAsset(
    userAddress: Address,
    assetAddress: Address,
    type: string,
    timestamp: BigInt
): UserAsset {
    let id = generateUserAssetId(userAddress.toHex(), assetAddress.toHex())

    let userAsset = new UserAsset(id)

    userAsset.createdAtTimestamp = timestamp
    userAsset.balance = ZERO_BI

    let asset = getAsset(assetAddress.toHex(), timestamp, type)
    let user = getUser(userAddress.toHex(), timestamp)

    userAsset.asset = asset.id
    userAsset.user = user.id

    userAsset.save()
    return userAsset
}

export function getUserAsset(
    userAddress: Address,
    assetAddress: Address,
    timestamp: BigInt,
    type: string
): UserAsset {
    let id = generateUserAssetId(userAddress.toHex(), assetAddress.toHex())

    let userAsset = UserAsset.load(id)

    if (!userAsset) {
        userAsset = createUserAsset(userAddress, assetAddress, type, timestamp)
    }

    return userAsset as UserAsset
}

export function updateUserAssetBalance(
    userId: string,
    assetId: string,
    balanceDiff: BigInt,
    timestamp: BigInt,
    assetType: string
): UserAsset {
    let user = getUser(userId, timestamp)
    let asset = getAsset(assetId, timestamp, assetType)

    let userAsset = getUserAsset(
        Address.fromBytes(user.address),
        Address.fromBytes(asset.address),
        timestamp,
        asset.type
    )

    userAsset.balance = userAsset.balance.plus(balanceDiff)
    userAsset.save()
    return userAsset
}
