import { Address, BigInt } from "@graphprotocol/graph-ts"

import { AccountAsset, Asset, Yield } from "../../generated/schema"
import { ZERO_BI } from "../constants"
import { AssetType, generateAccountAssetId } from "../utils"
import { generateYieldAssetId } from "../utils/idGenerators"
import { getAccount } from "./Account"
import { getAccountAsset } from "./AccountAsset"
import { getAsset } from "./Asset"
import { getERC20Decimals } from "./ERC20"
import {
    getName,
    getSymbol,
    getUnderlying,
    getUserYieldInIBT,
} from "./FutureVault"
import { getNetwork } from "./Network"

export function updateYield(
    principalToken: Address,
    accountAddress: Address,
    timestamp: BigInt
) {
    let underlyingAddress = getUnderlying(principalToken)
    let yieldAsset = getYieldAsset(principalToken, underlyingAddress, timestamp)

    updateAccountAssetBalance(
        principalToken,
        accountAddress,
        yieldAsset.id,
        timestamp
    )
}

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

    let accountAsset = new AccountAsset(accountAssetId)

    accountAsset.createdAtTimestamp = timestamp
    accountAsset.balance = ZERO_BI

    accountAsset.asset = asset.id
    accountAsset.account = accountAddress.toHex()

    accountAsset.save()
    return accountAsset
}

export function updateAccountAssetBalance(
    principalToken: Address,
    accountAddress: Address,
    assetId: string,
    timestamp: BigInt
): AccountAsset {
    let yieldAsset = getYieldAsset(principalToken, accountAddress, timestamp)

    let accountAsset = getAccountYieldAsset(
        accountAddress,
        principalToken,
        Address.fromBytes(yieldAsset.address),
        timestamp
    )

    // TODO: Change IBT to Underlying
    accountAsset.balance = getUserYieldInIBT(principalToken, accountAddress)

    accountAsset.save()
    return accountAsset
}
