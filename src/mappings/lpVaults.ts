import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { LPVault, Pool } from "../../generated/schema"
import {
    Deposit,
    Paused,
    CurvePoolUpdated,
    Unpaused,
    Withdraw,
} from "../../generated/templates/LPVault/LPVault"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"
import { updateAccountAssetBalance } from "../entities/AccountAsset"
import { getAssetAmount } from "../entities/AssetAmount"
import {
    getTotalSupply,
    getTotalAssets,
    getUnderlying,
} from "../entities/LPVault"
import { createPool } from "../entities/Pool"
import { createTransaction } from "../entities/Transaction"
import { AssetType } from "../utils"
import FutureState from "../utils/FutureState"
import transactionType from "../utils/TransactionType"
import { generateTransactionId } from "../utils/idGenerators"

export function handleCurvePoolUpdated(event: CurvePoolUpdated): void {
    let lpVault = LPVault.load(event.address.toHex())!

    let pool = Pool.load(event.params._newCurvePool.toHex())
    if (pool) {
        lpVault.pool = pool.id
    } else {
        lpVault.pool = createPool({
            poolAddress: event.params._newCurvePool,
            ibtAddress: Address.fromString(lpVault.ibt),
            factoryAddress: Address.fromString(lpVault.factory),
            ptAddress: Address.fromString(lpVault.future),
            timestamp: event.block.timestamp,
            transactionHash: event.transaction.hash,
        }).id
    }

    lpVault.save()
}

export function handlePaused(event: Paused): void {
    let lpVault = LPVault.load(event.address.toHex())

    if (lpVault) {
        lpVault.state = FutureState.PAUSED

        lpVault.save()
    } else {
        log.warning("Paused event call for nonexistent LPVault {}", [
            event.address.toHex(),
        ])
    }
}

export function handleUnpaused(event: Unpaused): void {
    let lpVault = LPVault.load(event.address.toHex())

    if (lpVault) {
        lpVault.state = FutureState.ACTIVE

        lpVault.save()
    } else {
        log.warning("Unpaused event call for nonexistent LPVault {}", [
            event.address.toHex(),
        ])
    }
}

export function handleDeposit(event: Deposit): void {
    let lpVault = LPVault.load(event.address.toHex())

    if (lpVault) {
        let underlyingAddress = getUnderlying(
            Address.fromString(lpVault.future)
        )

        let amountIn = getAssetAmount(
            event.transaction.hash,
            underlyingAddress,
            event.params.assets,
            AssetType.UNDERLYING,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.sender.toHex(),
            underlyingAddress.toHex(),
            event.block.timestamp,
            AssetType.UNDERLYING
        )

        let amountOut = getAssetAmount(
            event.transaction.hash,
            event.address,
            event.params.shares,
            AssetType.LP_VAULT_SHARES,
            event.block.timestamp
        )

        let lpVaultPosition = updateAccountAssetBalance(
            event.params.owner.toHex(),
            event.address.toHex(),
            event.block.timestamp,
            AssetType.LP_VAULT_SHARES
        )

        lpVaultPosition.lpVault = lpVault.id

        let totalUnderlyingDeposit = ZERO_BI
        let totalMintedShares = ZERO_BI
        if (lpVaultPosition.totalUnderlyingDeposit) {
            totalUnderlyingDeposit = lpVaultPosition.totalUnderlyingDeposit!
            totalMintedShares = lpVaultPosition.totalMintedShares!
        }

        lpVaultPosition.totalUnderlyingDeposit = totalUnderlyingDeposit.plus(
            event.params.assets
        )

        lpVaultPosition.totalMintedShares = totalMintedShares.plus(
            event.params.shares
        )

        if (
            lpVaultPosition.totalUnderlyingDeposit !== ZERO_BI &&
            lpVaultPosition.totalMintedShares !== ZERO_BI
        ) {
            lpVaultPosition.averageShareCost = lpVaultPosition
                .totalUnderlyingDeposit!.times(BigInt.fromI32(10).pow(18 as u8))
                .div(lpVaultPosition.totalMintedShares!)
        }

        lpVaultPosition.save()

        let lpVaultAddress = Address.fromBytes(lpVault.address)

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: event.params.sender,
            poolInTransaction: ZERO_ADDRESS,
            lpVaultInTransaction: lpVaultAddress,

            amountsIn: [amountIn.id],
            amountsOut: [amountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: transactionType.LP_VAULT_IBT_DEPOSIT,

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })

        lpVault.totalSupply = getTotalSupply(lpVaultAddress)
        lpVault.totalAssets = getTotalAssets(lpVaultAddress)
        lpVault.save()
    } else {
        log.warning("Deposit event call for not existing LPVault {}", [
            event.address.toHex(),
        ])
    }
}

export function handleWithdraw(event: Withdraw): void {
    let lpVault = LPVault.load(event.address.toHex())

    if (lpVault) {
        let amountIn = getAssetAmount(
            event.transaction.hash,
            event.address,
            event.params.shares,
            AssetType.LP_VAULT_SHARES,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            event.address.toHex(),
            event.block.timestamp,
            AssetType.LP_VAULT_SHARES
        )

        let underlyingAddress = getUnderlying(
            Address.fromString(lpVault.future)
        )

        let amountOut = getAssetAmount(
            event.transaction.hash,
            underlyingAddress,
            event.params.assets,
            AssetType.UNDERLYING,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.receiver.toHex(),
            underlyingAddress.toHex(),
            event.block.timestamp,
            AssetType.UNDERLYING
        )

        let lpVaultAddress = Address.fromBytes(lpVault.address)

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: event.params.receiver,
            poolInTransaction: ZERO_ADDRESS,
            lpVaultInTransaction: lpVaultAddress,

            amountsIn: [amountIn.id],
            amountsOut: [amountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: transactionType.LP_VAULT_WITHDRAW,

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })

        lpVault.totalSupply = getTotalSupply(lpVaultAddress)
        lpVault.totalAssets = getTotalAssets(lpVaultAddress)
        lpVault.save()
    } else {
        log.warning("Withdraw event call for not existing LPVault {}", [
            event.address.toHex(),
        ])
    }
}

// TODO: this event doesn't exist in the contract anymore
// export function handleFeeUpdated(event: FeeUpdated): void {
//     let lpVault = LPVault.load(event.address.toHex())
//
//     if (lpVault) {
//         lpVault.fee = event.params.fees
//         lpVault.save()
//     } else {
//         log.warning("FeeUpdated event call for not existing LPVault {}", [
//             event.address.toHex(),
//         ])
//     }
// }
