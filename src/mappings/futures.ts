import { Address, ethereum, log } from "@graphprotocol/graph-ts"

import {
    CurveFactoryChange, // CurveFactoryChange,
    CurvePoolDeployed, // LPVDeployed,
    PTDeployed,
    RegistryChange,
} from "../../generated/Factory/Factory"
import {
    FeeClaim,
    Future,
    Factory, // LPVault,
    // Pool,
} from "../../generated/schema"
import {
    ERC20, // LPVault as LPVaultTemplate,
    PrincipalToken as PrincipalTokenTemplate,
} from "../../generated/templates"
import {
    FeeClaimed,
    Paused,
    Unpaused,
    YieldClaimed,
    YieldUpdated,
    Transfer as PTTransfer,
    Mint,
    Redeem,
} from "../../generated/templates/PrincipalToken/PrincipalToken"
import { ZERO_ADDRESS, UNIT_BI, ZERO_BI } from "../constants"
// import { createAPRInTimeForLPVault } from "../entities/APRInTime"
import { getAccount } from "../entities/Account"
import {
    updateAccountAssetBalance,
    updateAccountAssetYTBalance,
} from "../entities/AccountAsset"
import { getAsset } from "../entities/Asset"
import { getAssetAmount } from "../entities/AssetAmount"
import { createFactory, getCurveFactory } from "../entities/Factory"
import { updateFutureDailyStats } from "../entities/FutureDailyStats"
import {
    getExpirationTimestamp,
    getName,
    getSymbol,
    getIBT,
    getUnderlying,
    getTotalAssets,
    getYT,
} from "../entities/FutureVault"
import { getNetwork } from "../entities/Network"
import { createPool } from "../entities/Pool"
import { createTransaction } from "../entities/Transaction"
import {
    updateClaimedYieldAccountAssetBalance,
    updateYieldForAll,
} from "../entities/Yield"
import { AssetType, generateFeeClaimId } from "../utils"
// import FutureState from "../utils/FutureState"
import transactionType from "../utils/TransactionType"
// import { calculateLpVaultAPR } from "../utils/calculateAPR"
import { generateTransactionId } from "../utils/idGenerators"

export function handleRegistryChange(event: RegistryChange): void {
    let factory = Factory.load(event.address.toHex())

    if (!factory) {
        factory = createFactory(
            event.params.newRegistry,
            event.address,
            event.block.timestamp
        )
    }

    factory.oldRegistry = event.params.previousRegistry
    factory.registry = event.params.newRegistry

    factory.save()
}

export function handlePTDeployed(event: PTDeployed): void {
    let ptAddress = event.params.pt
    const newFuture = new Future(ptAddress.toHex())
    newFuture.chainId = getNetwork().chainId
    newFuture.address = ptAddress
    newFuture.factory = event.address.toHex()

    newFuture.state = "ACTIVE"
    newFuture.createdAtTimestamp = event.block.timestamp
    newFuture.expirationAtTimestamp = getExpirationTimestamp(ptAddress)

    newFuture.unclaimedFees = ZERO_BI
    newFuture.totalCollectedFees = ZERO_BI

    newFuture.name = getName(ptAddress)
    newFuture.symbol = getSymbol(ptAddress)
    newFuture.totalAssets = getTotalAssets(ptAddress)

    let underlyingAddress = getUnderlying(ptAddress)
    let underlyingAsset = getAsset(
        underlyingAddress.toHex(),
        event.block.timestamp,
        AssetType.UNDERLYING
    )
    underlyingAsset.save()

    let ibtAddress = getIBT(ptAddress)
    let ibtAsset = getAsset(
        ibtAddress.toHex(),
        event.block.timestamp,
        AssetType.IBT
    )
    ibtAsset.underlying = underlyingAsset.id
    ibtAsset.save()

    newFuture.underlyingAsset = underlyingAddress.toHex()
    newFuture.ibtAsset = ibtAddress.toHex()

    newFuture.yieldGenerators = []

    newFuture.save()

    // PT Asset - Future relation
    let ptToken = getAsset(
        event.params.pt.toHex(),
        event.block.timestamp,
        AssetType.PT
    )
    ptToken.futureVault = event.params.pt.toHex()
    ptToken.save()

    // YT Asset - Future relation
    let ytToken = getAsset(
        getYT(event.params.pt).toHex(),
        event.block.timestamp,
        AssetType.YT
    )
    ytToken.futureVault = event.params.pt.toHex()
    ytToken.save()

    // Create dynamic data source for PT token events
    ERC20.create(event.params.pt)

    // Create dynamic data source for YT token events
    ERC20.create(Address.fromBytes(ytToken.address))

    // Create dynamic data source for PrincipalToken events
    PrincipalTokenTemplate.create(event.params.pt)
}

export function handlePaused(event: Paused): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        future.state = "PAUSED"
        future.save()
    } else {
        log.warning("Paused event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleUnpaused(event: Unpaused): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        future.state = "ACTIVE"
        future.save()
    } else {
        log.warning("Unpaused event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleFeeClaimed(event: FeeClaimed): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        let claim = new FeeClaim(
            generateFeeClaimId(
                event.params.user.toHex(),
                event.block.timestamp.toString()
            )
        )

        let feeCollector = getAccount(
            event.params.user.toHex(),
            event.block.timestamp
        )

        claim.createdAtTimestamp = event.block.timestamp
        claim.feeCollector = feeCollector.id
        claim.future = future.id
        claim.amount = event.params.receivedAssets

        future.totalCollectedFees = future.totalCollectedFees.plus(
            event.params.receivedAssets
        )
        future.unclaimedFees = ZERO_BI

        future.save()
        claim.save()
    } else {
        log.warning("FeeClaimed event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleMint(event: Mint): void {
    let principalToken = Future.load(event.address.toHex())

    if (principalToken) {
        let ptAddress = event.address
        let ytAddress = getYT(event.address)

        let firstAmountOut = getAssetAmount(
            event.transaction.hash,
            ptAddress,
            event.params.amount,
            AssetType.PT,
            event.logIndex.toString(),
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.to.toHex(),
            ptAddress.toHex(),
            event.block.timestamp,
            AssetType.PT
        )

        let secondAmountOut = getAssetAmount(
            event.transaction.hash,
            ytAddress,
            event.params.amount,
            AssetType.YT,
            event.logIndex.toString(),
            event.block.timestamp
        )

        updateAccountAssetYTBalance(
            event.params.to.toHex(),
            ytAddress.toHex(),
            event.block.timestamp,
            AssetType.YT,
            Address.fromBytes(principalToken.address)
        )

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: Address.fromBytes(principalToken.address),
            userInTransaction: event.params.to,
            poolInTransaction: ZERO_ADDRESS,
            lpVaultInTransaction: ZERO_ADDRESS,

            amountsIn: [],
            amountsOut: [firstAmountOut.id, secondAmountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: transactionType.FUTURE_VAULT_DEPOSIT,

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })

        // Mint specific FutureDailyStats data
        let futureDailyStats = updateFutureDailyStats(
            event as ethereum.Event,
            event.address
        )
        futureDailyStats.dailyDeposits =
            futureDailyStats.dailyDeposits.plus(UNIT_BI)
        futureDailyStats.save()
    } else {
        log.warning("Mint event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleRedeem(event: Redeem): void {
    let principalToken = Future.load(event.address.toHex())

    if (principalToken) {
        let ibtAddress = getIBT(event.address)
        let ptAddress = event.address
        let ytAddress = getYT(event.address)

        let firstAmountIn = getAssetAmount(
            event.transaction.hash,
            ptAddress,
            event.params.amount,
            AssetType.PT,
            event.logIndex.toString(),
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.from.toHex(),
            ptAddress.toHex(),
            event.block.timestamp,
            AssetType.PT
        )

        let secondAmountIn = getAssetAmount(
            event.transaction.hash,
            ytAddress,
            event.params.amount,
            AssetType.YT,
            event.logIndex.toString(),
            event.block.timestamp
        )

        updateAccountAssetYTBalance(
            event.params.from.toHex(),
            ytAddress.toHex(),
            event.block.timestamp,
            AssetType.YT,
            Address.fromBytes(principalToken.address)
        )

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: Address.fromBytes(principalToken.address),
            userInTransaction: event.params.from,
            poolInTransaction: ZERO_ADDRESS,
            lpVaultInTransaction: ZERO_ADDRESS,

            amountsIn: [firstAmountIn.id, secondAmountIn.id],
            amountsOut: [],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: transactionType.FUTURE_VAULT_WITHDRAW,

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })

        // Redeem specific FutureDailyStats data
        let futureDailyStats = updateFutureDailyStats(event, event.address)
        futureDailyStats.dailyWithdrawals =
            futureDailyStats.dailyWithdrawals.plus(UNIT_BI)
        futureDailyStats.save()
    } else {
        log.warning("Redeem event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

// Missing `assets` param at this moment
// export function handleRedeem(event: Redeem): void {
//     let future = Future.load(event.address.toHex())
//
//     if (future) {
//         // getTransaction()
//     } else {
//         log.warning("Redeem event call for not existing Future {}", [
//             event.address.toHex(),
//         ])
//     }
// }

export function handleCurveFactoryChange(event: CurveFactoryChange): void {
    let factory = Factory.load(event.address.toHex())

    if (factory) {
        let poolFactory = getCurveFactory(event.address)

        factory.curveFactory = poolFactory
        factory.save()
    } else {
        log.warning(
            "CurveFactoryChange event call for not existing factory {}",
            [event.address.toHex()]
        )
    }
}

export function handleCurvePoolDeployed(event: CurvePoolDeployed): void {
    createPool({
        poolAddress: event.params.poolAddress,
        ibtAddress: event.params.ibt,
        factoryAddress: event.address,
        ptAddress: event.params.pt,
        timestamp: event.block.timestamp,
        logIndex: event.logIndex,
        transactionHash: event.transaction.hash,
        blockNumber: event.block.number,
    })
}

export function handleYieldUpdated(event: YieldUpdated): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        updateYieldForAll(event.address, event.block.timestamp)
    } else {
        log.warning("YieldUpdated event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleYieldClaimed(event: YieldClaimed): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        updateClaimedYieldAccountAssetBalance(
            event.address,
            event.params.receiver,
            event.params.yieldInIBT,
            event.block.timestamp
        )
    } else {
        log.warning("YieldClaimed event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handlePTTransfer(event: PTTransfer): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        updateYieldForAll(event.address, event.block.timestamp)
    } else {
        log.warning("PTTransfer event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

// TODO: LPVaults
// export function handleLPVDeployed(event: LPVDeployed): void {
//     let lpVault = new LPVault(event.params.lpv.toHex())
//     let future = Future.load(event.params.pt.toHex())!
//
//     lpVault.chainId = getNetwork().chainId
//     lpVault.address = event.params.lpv
//     lpVault.createdAtTimestamp = event.block.timestamp
//     lpVault.expirationAtTimestamp = future.expirationAtTimestamp
//
//     let factory = Factory.load(event.address.toHex())!
//     lpVault.factory = factory.id
//     lpVault.future = future.id
//
//     lpVault.state = FutureState.ACTIVE
//
//     let underlyingAddress = getUnderlying(Address.fromBytes(future.address))
//     let underlying = getAsset(
//         underlyingAddress.toHex(),
//         event.block.timestamp,
//         AssetType.UNDERLYING
//     )
//     lpVault.underlying = underlying.address.toHex()
//
//     let ibtAddress = getIBT(Address.fromBytes(future.address))
//     let ibt = getAsset(ibtAddress.toHex(), event.block.timestamp, AssetType.IBT)
//     lpVault.ibt = ibt.address.toHex()
//
//     let name = getName(Address.fromBytes(lpVault.address))
//     lpVault.name = name
//     let symbol = getSymbol(Address.fromBytes(lpVault.address))
//     lpVault.symbol = symbol
//     lpVault.totalSupply = ZERO_BI
//     lpVault.totalAssets = ZERO_BI
//
//     let poolAddress = event.params.curvePool
//
//     let pool = Pool.load(poolAddress.toHex())
//     if (pool) {
//         lpVault.pool = pool.id
//     } else {
//         lpVault.pool = createPool({
//             poolAddress: poolAddress,
//             ibtAddress: ibtAddress,
//             factoryAddress: Address.fromString(future.factory!),
//             ptAddress: Address.fromBytes(future.address),
//             timestamp: event.block.timestamp,
//             transactionHash: event.transaction.hash,
//         }).id
//     }
//
//     lpVault.save()
//
//     let lpVaultShareAsset = getAsset(
//         lpVault.address.toHex(),
//         event.block.timestamp,
//         AssetType.LP_VAULT_SHARES
//     )
//     lpVaultShareAsset.futureVault = future.address.toHex()
//     lpVaultShareAsset.save()
//
//     // Create dynamic data source for LPVault events
//     LPVaultTemplate.create(Address.fromBytes(lpVault.address))
//
//     let lpVaultAPR = createAPRInTimeForLPVault(
//         event.params.lpv,
//         event.block.timestamp
//     )
//     lpVaultAPR.apr = calculateLpVaultAPR(event.params.lpv)
//     lpVaultAPR.save()
// }
