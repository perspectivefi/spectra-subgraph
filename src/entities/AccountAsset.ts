import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { AccountAsset, Future } from "../../generated/schema"
import { ZERO_BI } from "../constants"
import { AssetType, generateAccountAssetId } from "../utils"
import { getAccount } from "./Account"
import { getAsset } from "./Asset"
import { getERC20Balance } from "./ERC20"
import { getERC4626Balance } from "./ERC4626"
import { getAccountYieldAsset } from "./Yield"

// store.get("Future", "")

export function createAccountAsset(
    accountAddress: Address,
    assetAddress: Address,
    type: string,
    timestamp: BigInt
): AccountAsset {
    let id = generateAccountAssetId(
        accountAddress.toHex(),
        assetAddress.toHex()
    )

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
    let id = generateAccountAssetId(
        accountAddress.toHex(),
        assetAddress.toHex()
    )

    let accountAsset = AccountAsset.load(id)

    if (!accountAsset) {
        accountAsset = createAccountAsset(
            accountAddress,
            assetAddress,
            type,
            timestamp
        )
    }

    return accountAsset as AccountAsset
}

export function updateAccountAssetBalance(
    accountId: string,
    assetId: string,
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

    const assetAddress = Address.fromBytes(asset.address)
    const accountAddress = Address.fromBytes(account.address)

    if (assetType == AssetType.IBT) {
        accountAsset.balance = getERC4626Balance(assetAddress, accountAddress)
    } else {
        accountAsset.balance = getERC20Balance(assetAddress, accountAddress)
    }

    accountAsset.save()
    return accountAsset
}

export function getAccountAssetYT(
    accountAddress: Address,
    assetAddress: Address,
    timestamp: BigInt,
    type: string,
    principalTokenAddress: Address
): AccountAsset {
    let id = generateAccountAssetId(
        accountAddress.toHex(),
        assetAddress.toHex()
    )

    let accountAsset = AccountAsset.load(id)

    if (!accountAsset) {
        accountAsset = createAccountAsset(
            accountAddress,
            assetAddress,
            type,
            timestamp
        )

        accountAsset.generatedYield = true

        if (!accountAsset.principalToken) {
            accountAsset.principalToken = principalTokenAddress.toHex()

            const principalToken = Future.load(principalTokenAddress.toHex())
            if (principalToken) {
                // TODO: There is an issue if using PT -> AccountAsset relation, have to find better optimised way if there will be many yield generators
                let yieldGenerators = principalToken.yieldGenerators
                yieldGenerators.push(accountAsset.id)
                principalToken.yieldGenerators = yieldGenerators
                principalToken.save()
            }
        }
    }

    return accountAsset as AccountAsset
}

export function updateAccountAssetYTBalance(
    accountId: string,
    assetId: string,
    timestamp: BigInt,
    assetType: string,
    principalTokenAddress: Address
): AccountAsset {
    let account = getAccount(accountId, timestamp)
    let asset = getAsset(assetId, timestamp, assetType)

    let accountAsset = getAccountAssetYT(
        Address.fromBytes(account.address),
        Address.fromBytes(asset.address),
        timestamp,
        asset.type,
        principalTokenAddress
    )

    if (assetType == AssetType.YT) {
        const assetAddress = Address.fromBytes(asset.address)
        const accountAddress = Address.fromBytes(account.address)

        const balance = getERC20Balance(assetAddress, accountAddress)
        accountAsset.balance = getERC20Balance(assetAddress, accountAddress)

        if (accountAsset.principalToken) {
            const principalToken = Future.load(accountAsset.principalToken!)

            if (principalToken) {
                const yieldAccountAsset = getAccountYieldAsset(
                    accountAddress,
                    Address.fromString(accountAsset.principalToken!),
                    Address.fromString(principalToken.underlyingAsset),
                    timestamp
                )

                if (
                    !balance.gt(ZERO_BI) &&
                    (!yieldAccountAsset ||
                        !yieldAccountAsset.balance.gt(ZERO_BI))
                ) {
                    accountAsset.generatedYield = false
                } else {
                    accountAsset.generatedYield = true
                }
            }
        }

        accountAsset.save()
    } else {
        log.warning("{} AccountAsset is not a YT position but {}", [
            accountAsset.id,
            asset.type,
        ])
    }
    return accountAsset
}
