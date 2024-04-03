import { Address, BigInt } from "@graphprotocol/graph-ts"

import { AccountAsset, Asset, Future } from "../../generated/schema"
import { ZERO_BI } from "../constants"
import { AssetType, generateAccountAssetId } from "../utils"
import {
    generateClaimedYieldAssetId,
    generateYieldAssetId,
} from "../utils/idGenerators"
import { getAccount } from "./Account"
import { getAsset } from "./Asset"
import { getERC20Decimals } from "./ERC20"
import {
    getName,
    getSymbol,
    getCurrentYieldOfUserInIBT,
    getIBT,
} from "./FutureVault"
import { getNetwork } from "./Network"

function createYieldAsset(
    principalToken: Address,
    underlyingAddress: Address,
    timestamp: BigInt
): Asset {
    let asset = new Asset(generateYieldAssetId(principalToken.toHex()))
    asset.chainId = getNetwork().chainId
    asset.address = underlyingAddress
    asset.createdAtTimestamp = timestamp
    asset.type = AssetType.YIELD

    asset.name = getName(principalToken) + " Yield"
    asset.symbol = getSymbol(principalToken) + " Yield"
    asset.decimals = getERC20Decimals(underlyingAddress)

    let underlyingAsset = getAsset(
        underlyingAddress.toHex(),
        timestamp,
        AssetType.UNDERLYING
    )
    asset.underlying = underlyingAsset.id
    asset.futureVault = principalToken.toHex()

    asset.save()
    return asset
}

function getYieldAsset(
    principalToken: Address,
    underlyingAddress: Address,
    timestamp: BigInt
): Asset {
    let asset = Asset.load(generateYieldAssetId(principalToken.toHex()))
    if (asset) {
        return asset
    }

    asset = createYieldAsset(principalToken, underlyingAddress, timestamp)

    return asset as Asset
}

export function getAccountYieldAsset(
    accountAddress: Address,
    principalToken: Address,
    underlyingAddress: Address,
    timestamp: BigInt
): AccountAsset {
    let account = getAccount(accountAddress.toHex(), timestamp)
    let asset = getYieldAsset(principalToken, underlyingAddress, timestamp)

    let accountAssetId = generateAccountAssetId(
        account.address.toHex(),
        asset.id
    )

    let accountAsset = AccountAsset.load(accountAssetId)
    if (accountAsset) {
        return accountAsset
    }

    accountAsset = new AccountAsset(accountAssetId)

    accountAsset.createdAtTimestamp = timestamp
    accountAsset.balance = ZERO_BI

    accountAsset.asset = asset.id
    accountAsset.account = accountAddress.toHex()

    accountAsset.save()
    return accountAsset
}

function createClaimedYieldAsset(
    principalToken: Address,
    ibtAddress: Address,
    timestamp: BigInt
): Asset {
    let asset = new Asset(generateClaimedYieldAssetId(principalToken.toHex()))
    asset.chainId = getNetwork().chainId
    asset.address = ibtAddress
    asset.createdAtTimestamp = timestamp
    asset.type = AssetType.CLAIMED_YIELD

    asset.name = getName(principalToken) + " Claimed Yield"
    asset.symbol = getSymbol(principalToken) + " Claimed Yield"
    asset.decimals = getERC20Decimals(ibtAddress)

    let ibtAsset = getAsset(ibtAddress.toHex(), timestamp, AssetType.IBT)
    asset.ibt = ibtAsset.id
    asset.futureVault = principalToken.toHex()

    asset.save()
    return asset
}

function getClaimedYieldAsset(
    principalToken: Address,
    ibtAddress: Address,
    timestamp: BigInt
): Asset {
    let asset = Asset.load(generateClaimedYieldAssetId(principalToken.toHex()))
    if (asset) {
        return asset
    }

    asset = createClaimedYieldAsset(principalToken, ibtAddress, timestamp)

    return asset as Asset
}

export function getAccountClaimedYieldAsset(
    accountAddress: Address,
    principalToken: Address,
    timestamp: BigInt
): AccountAsset {
    const ibtAddress = getIBT(principalToken)
    let claimedYieldAsset = getClaimedYieldAsset(
        principalToken,
        ibtAddress,
        timestamp
    )
    let ibtAsset = getAsset(ibtAddress.toHex(), timestamp, AssetType.IBT)

    claimedYieldAsset.ibt = ibtAsset.id
    claimedYieldAsset.save()

    let account = getAccount(accountAddress.toHex(), timestamp)
    let accountAssetId = generateAccountAssetId(
        account.address.toHex(),
        claimedYieldAsset.id,
        "claimed-"
    )

    let accountAsset = AccountAsset.load(accountAssetId)
    if (accountAsset) {
        return accountAsset
    }

    accountAsset = new AccountAsset(accountAssetId)

    accountAsset.createdAtTimestamp = timestamp
    accountAsset.balance = ZERO_BI

    accountAsset.asset = claimedYieldAsset.id
    accountAsset.account = accountAddress.toHex()

    accountAsset.save()
    return accountAsset
}

export function updateYieldAccountAssetBalance(
    principalToken: Address,
    accountAddress: Address,
    timestamp: BigInt
): AccountAsset {
    let yieldAsset = getYieldAsset(principalToken, accountAddress, timestamp)

    let accountAsset = getAccountYieldAsset(
        accountAddress,
        principalToken,
        Address.fromBytes(yieldAsset.address),
        timestamp
    )

    accountAsset.balance = getCurrentYieldOfUserInIBT(
        principalToken,
        accountAddress
    )

    accountAsset.save()
    return accountAsset
}

export function updateClaimedYieldAccountAssetBalance(
    principalToken: Address,
    accountAddress: Address,
    claimBalance: BigInt,
    timestamp: BigInt
): AccountAsset {
    let accountAsset = getAccountClaimedYieldAsset(
        accountAddress,
        principalToken,
        timestamp
    )

    accountAsset.balance = accountAsset.balance.plus(claimBalance)

    accountAsset.save()
    return accountAsset
}

export function updateYield(
    principalToken: Address,
    accountAddress: Address,
    timestamp: BigInt
): void {
    updateYieldAccountAssetBalance(principalToken, accountAddress, timestamp)
}

export function updateYieldForAll(
    principalTokenAddress: Address,
    timestamp: BigInt
): void {
    const principalToken = Future.load(principalTokenAddress.toHex())

    if (principalToken && principalToken.yieldGenerators) {
        // Update yield for all the wallets holding YT or have positive yield
        for (let i = 0; i < principalToken.yieldGenerators.length; i++) {
            const ytAccountAssetAddress = principalToken.yieldGenerators[i]
            const ytAsset = AccountAsset.load(ytAccountAssetAddress)

            if (ytAsset && ytAsset.generatedYield) {
                updateYield(
                    Address.fromString(ytAsset.principalToken!),
                    Address.fromString(ytAsset.account),
                    timestamp
                )
            }
        }
    }
}
