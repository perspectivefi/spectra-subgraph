import { Address, BigInt } from "@graphprotocol/graph-ts"

import { AccountAsset } from "../../generated/schema";
import { ZERO_BI } from "../constants"
import { generateAccountAssetId } from "../utils"
import { getAsset } from "./Asset"
import { getAccount } from "./Account"

export function createAccountAsset(
    accountAddress: Address,
    assetAddress: Address,
    type: string,
    timestamp: BigInt
): AccountAsset {
    let id = generateAccountAssetId(accountAddress.toHex(), assetAddress.toHex())

    let accountAsset = new AccountAsset(id)

    accountAsset.createdAtTimestamp = timestamp
    accountAsset.balance = ZERO_BI

    let asset = getAsset(assetAddress.toHex(), timestamp, type)
    let account = getAccount(accountAddress.toHex(), timestamp)

    accountAsset.asset = asset.id
    accountAsset.account = account.id

    accountAsset.save()
    return accountAsset
}

export function getAccountAsset(
    accountAddress: Address,
    assetAddress: Address,
    timestamp: BigInt,
    type: string
): AccountAsset {
    let id = generateAccountAssetId(accountAddress.toHex(), assetAddress.toHex())

    let accountAsset = AccountAsset.load(id)

    if (!accountAsset) {
        accountAsset = createAccountAsset(accountAddress, assetAddress, type, timestamp)
    }

    return accountAsset as AccountAsset
}

export function updateAccountAssetBalance(
    accountId: string,
    assetId: string,
    balanceDiff: BigInt,
    timestamp: BigInt,
    assetType: string
): AccountAsset {
    let account = getAccount(accountId, timestamp)
    let asset = getAsset(assetId, timestamp, assetType)

    let accountAsset = getAccountAsset(
        Address.fromBytes(account.address),
        Address.fromBytes(asset.address),
        timestamp,
        asset.type
    )

    accountAsset.balance = accountAsset.balance.plus(balanceDiff)
    accountAsset.save()
    return accountAsset
}
