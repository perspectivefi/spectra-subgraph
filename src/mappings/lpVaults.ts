import { Address, log } from "@graphprotocol/graph-ts"

import {
    LPVaultDeployed,
    RegistryUpdated,
} from "../../generated/LPVaultFactory/LPVaultFactory"
import { Future, LPVault, LPVaultFactory, Pool } from "../../generated/schema"
import { LPVault as LPVaultTemplate } from "../../generated/templates"
import {
    Deposit,
    FeeUpdated,
    Paused,
    PoolIndexUpdated,
    Unpaused,
    Withdraw,
} from "../../generated/templates/LPVault/LPVault"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"
import { createAPRInTimeForLPVault } from "../entities/APRInTime"
import { updateAccountAssetBalance } from "../entities/AccountAsset"
import { getAsset } from "../entities/Asset"
import { getAssetAmount } from "../entities/AssetAmount"
import { getIBT } from "../entities/FutureVault"
import { getPool } from "../entities/FutureVaultFactory"
import {
    getName,
    getSymbol,
    getTotalAssets,
    getUnderlying,
} from "../entities/LPVault"
import { createLPVaultFactory } from "../entities/LPVaultFactory"
import { getNetwork } from "../entities/Network"
import { createTransaction } from "../entities/Transaction"
import { AssetType } from "../utils"
import FutureState from "../utils/FutureState"
import transactionType from "../utils/TransactionType"
import { calculateLpVaultAPR } from "../utils/calculateAPR"
import { generateTransactionId } from "../utils/idGenerators"

export function handleRegistryUpdated(event: RegistryUpdated): void {
    let lpVaultFactory = LPVaultFactory.load(event.address.toHex())

    if (!lpVaultFactory) {
        lpVaultFactory = createLPVaultFactory(
            event.address,
            event.block.timestamp
        )
    }

    lpVaultFactory.oldRegistry = event.params.oldRegistry
    lpVaultFactory.registry = event.params.newRegistry

    lpVaultFactory.save()
}

export function handleLPVaultDeployed(event: LPVaultDeployed): void {
    let lpVault = new LPVault(event.params.lpVault.toHex())
    let future = Future.load(event.params.principalToken.toHex())!

    lpVault.chainId = getNetwork().chainId
    lpVault.address = event.params.lpVault
    lpVault.createdAtTimestamp = event.block.timestamp
    lpVault.expirationAtTimestamp = future.expirationAtTimestamp

    let lpVaultFactory = LPVaultFactory.load(event.address.toHex())!
    lpVault.lpVaultFactory = lpVaultFactory.id
    lpVault.future = future.id

    lpVault.state = FutureState.ACTIVE

    let underlyingAddress = getUnderlying(event.params.lpVault)
    let underlying = getAsset(
        underlyingAddress.toHex(),
        event.block.timestamp,
        AssetType.UNDERLYING
    )
    lpVault.underlying = underlying.address.toHex()

    let ibtAddress = getIBT(Address.fromBytes(future.address))
    let ibt = getAsset(ibtAddress.toHex(), event.block.timestamp, AssetType.IBT)
    lpVault.ibt = ibt.address.toHex()

    let name = getName(Address.fromBytes(lpVault.address))
    lpVault.name = name
    let symbol = getSymbol(Address.fromBytes(lpVault.address))
    lpVault.symbol = symbol
    lpVault.totalAssets = ZERO_BI

    // interestInTime: [LPVaultInterest!]! @derivedFrom(field: "lpVault")
    lpVault.save()

    let lpVaultShareAsset = getAsset(
        lpVault.address.toHex(),
        event.block.timestamp,
        AssetType.LP_VAULT_SHARES
    )
    lpVaultShareAsset.futureVault = future.address.toHex()
    lpVaultShareAsset.save()

    // Create dynamic data source for LPVault events
    LPVaultTemplate.create(Address.fromBytes(lpVault.address))

    let lpVaultAPR = createAPRInTimeForLPVault(
        event.params.lpVault,
        event.block.timestamp
    )
    lpVaultAPR.apr = calculateLpVaultAPR(event.params.lpVault)
    lpVaultAPR.save()
}

export function handlePoolIndexUpdated(event: PoolIndexUpdated): void {
    let lpVault = LPVault.load(event.address.toHex())!

    lpVault.poolIndex = event.params._newIndex

    let future = Future.load(lpVault.future)!

    let poolAddress = getPool(
        Address.fromString(future.futureVaultFactory!),
        Address.fromString(lpVault.future),
        event.params._newIndex
    )

    let pool = Pool.load(poolAddress.toHex())
    if (pool) {
        lpVault.pool = pool.id
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

        lpVault.totalAssets = getTotalAssets(lpVaultAddress)
        lpVault.save()
    } else {
        log.warning("Withdraw event call for not existing LPVault {}", [
            event.address.toHex(),
        ])
    }
}

export function handleFeeUpdated(event: FeeUpdated): void {
    let lpVault = LPVault.load(event.address.toHex())

    if (lpVault) {
        lpVault.fee = event.params.fees
        lpVault.save()
    } else {
        log.warning("FeeUpdated event call for not existing LPVault {}", [
            event.address.toHex(),
        ])
    }
}
