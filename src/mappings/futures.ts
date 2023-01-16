import { Address, ethereum, log } from "@graphprotocol/graph-ts"

import {
    Deposit,
    FeeClaimed,
    Paused,
    Redeem,
    Unpaused,
    Withdraw,
    YieldTransferred,
} from "../../generated/FutureVault/FutureVault"
import {
    CurveFactoryChanged,
    CurvePoolDeployed,
    FutureVaultDeployed,
} from "../../generated/FutureVaultFactory/FutureVaultFactory"
import {
    FeeClaim,
    Future,
    FutureVaultFactory,
    Pool,
    PoolFactory,
} from "../../generated/schema"
import { ERC20 } from "../../generated/templates"
import { ZERO_ADDRESS, UNIT_BI, ZERO_BI } from "../constants"
import { getAccount } from "../entities/Account"
import { updateAccountAssetBalance } from "../entities/AccountAsset"
import { getAsset } from "../entities/Asset"
import { getAssetAmount } from "../entities/AssetAmount"
import {
    getPoolAdminFee,
    getPoolFee,
    getPoolFutureAdminFee,
    getPoolLPToken,
} from "../entities/CurvePool"
import {
    getPoolFactoryAdmin,
    getPoolFactoryFeeReceiver,
} from "../entities/CurvePoolFactory"
import { updateFutureDailyStats } from "../entities/FutureDailyStats"
import {
    getExpirationTimestamp,
    getMaxFeeRate,
    getName,
    getSymbol,
    getIBT,
    getUnderlying,
    getTotalAssets,
    getYT,
    getUnclaimedFees,
} from "../entities/FutureVault"
import { createTransaction } from "../entities/Transaction"
import { generateFeeClaimId } from "../utils"

export function handleFutureVaultDeployed(event: FutureVaultDeployed): void {
    let futureVaultAddress = event.params._futureVault
    const newFuture = new Future(futureVaultAddress.toHex())
    newFuture.address = futureVaultAddress
    newFuture.futureVaultFactory = event.address.toHex()

    newFuture.state = "ACTIVE"
    newFuture.createdAtTimestamp = event.block.timestamp
    newFuture.expirationAtTimestamp = getExpirationTimestamp(futureVaultAddress)

    newFuture.daoFeeRate = getMaxFeeRate(futureVaultAddress)
    newFuture.unclaimedFees = ZERO_BI
    newFuture.totalCollectedFees = ZERO_BI

    newFuture.name = getName(futureVaultAddress)
    newFuture.symbol = getSymbol(futureVaultAddress)
    newFuture.totalAssets = getTotalAssets(futureVaultAddress)

    let underlyingAddress = getUnderlying(futureVaultAddress)
    let underlyingAsset = getAsset(
        underlyingAddress.toHex(),
        event.block.timestamp,
        "UNDERLYING"
    )
    underlyingAsset.save()

    let ibtAddress = getIBT(futureVaultAddress)
    let ibtAsset = getAsset(ibtAddress.toHex(), event.block.timestamp, "IBT")
    ibtAsset.underlying = underlyingAsset.id
    ibtAsset.save()

    newFuture.underlyingAsset = underlyingAddress.toHex()
    newFuture.ibtAsset = ibtAddress.toHex()

    newFuture.save()

    // PT Asset - Future relation
    let ptToken = getAsset(
        event.params._futureVault.toHex(),
        event.block.timestamp,
        "PT"
    )
    ptToken.futureVault = event.params._futureVault.toHex()
    ptToken.save()

    // YT Asset - Future relation
    let ytToken = getAsset(
        getYT(event.params._futureVault).toHex(),
        event.block.timestamp,
        "YT"
    )
    ytToken.futureVault = event.params._futureVault.toHex()
    ytToken.save()

    // Create dynamic data source for PT token events
    ERC20.create(event.params._futureVault)

    // Create dynamic data source for YT token events
    ERC20.create(Address.fromBytes(ytToken.address))
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
                event.params._feeCollector.toHex(),
                event.block.timestamp.toString()
            )
        )

        let feeCollector = getAccount(
            event.params._feeCollector.toHex(),
            event.block.timestamp
        )

        claim.createdAtTimestamp = event.block.timestamp
        claim.feeCollector = feeCollector.id
        claim.future = future.id
        claim.amount = event.params._feesInIBT

        future.totalCollectedFees = future.totalCollectedFees.plus(
            event.params._feesInIBT
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

export function handleDeposit(event: Deposit): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        let ibtAddress = getIBT(event.address)
        let ptAddress = event.address
        let ytAddress = getYT(event.address)

        // we should cover both kind of deposits - Underlying andIBT deposits but at this moment
        // there is no difference on the protocol side
        let amountIn = getAssetAmount(
            event.transaction.hash,
            ibtAddress,
            event.params.assets,
            "IBT",
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ibtAddress.toHex(),
            ZERO_BI.minus(event.params.assets),
            event.block.timestamp,
            "IBT"
        )

        let firstAmountOut = getAssetAmount(
            event.transaction.hash,
            ptAddress,
            event.params.shares,
            "PT",
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ptAddress.toHex(),
            event.params.shares,
            event.block.timestamp,
            "PT"
        )

        let secondAmountOut = getAssetAmount(
            event.transaction.hash,
            ytAddress,
            event.params.shares,
            "YT",
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ytAddress.toHex(),
            event.params.shares,
            event.block.timestamp,
            "YT"
        )

        createTransaction({
            transactionAddress: event.transaction.hash,

            futureInTransaction: Address.fromBytes(future.address),
            userInTransaction: event.params.sender,
            poolInTransaction: ZERO_ADDRESS,

            amountsIn: [amountIn.id],
            amountsOut: [firstAmountOut.id, secondAmountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "FUTURE_VAULT_DEPOSIT",

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })

        // Deposit specific FutureDailyStats  data
        let futureDailyStats = updateFutureDailyStats(
            event as ethereum.Event,
            event.address
        )
        futureDailyStats.dailyDeposits =
            futureDailyStats.dailyDeposits.plus(UNIT_BI)
        futureDailyStats.save()
    } else {
        log.warning("Deposit event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleWithdraw(event: Withdraw): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        let ibtAddress = getIBT(event.address)
        let ptAddress = event.address
        let ytAddress = getYT(event.address)

        let firstAmountIn = getAssetAmount(
            event.transaction.hash,
            ptAddress,
            event.params.shares,
            "PT",
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ptAddress.toHex(),
            ZERO_BI.minus(event.params.shares),
            event.block.timestamp,
            "PT"
        )

        let secondAmountIn = getAssetAmount(
            event.transaction.hash,
            ytAddress,
            event.params.shares,
            "YT",
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ytAddress.toHex(),
            ZERO_BI.minus(event.params.shares),
            event.block.timestamp,
            "YT"
        )

        let amountOut = getAssetAmount(
            event.transaction.hash,
            ibtAddress,
            event.params.assets,
            "IBT",
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.receiver.toHex(),
            ibtAddress.toHex(),
            event.params.assets,
            event.block.timestamp,
            "IBT"
        )

        createTransaction({
            transactionAddress: event.transaction.hash,

            futureInTransaction: Address.fromBytes(future.address),
            userInTransaction: event.params.sender,
            poolInTransaction: ZERO_ADDRESS,

            amountsIn: [firstAmountIn.id, secondAmountIn.id],
            amountsOut: [amountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "FUTURE_VAULT_WITHDRAW",

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })
        // Withdraw specific FutureDailyStats  data
        let futureDailyStats = updateFutureDailyStats(event, event.address)
        futureDailyStats.dailyWithdrawals =
            futureDailyStats.dailyWithdrawals.plus(UNIT_BI)
        futureDailyStats.save()
    } else {
        log.warning("Withdraw event call for not existing Future {}", [
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

export function handleYieldTransferred(event: YieldTransferred): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        future.unclaimedFees = getUnclaimedFees(event.address)
        future.save()
    } else {
        log.warning("YieldTransferred event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleCurveFactoryChanged(event: CurveFactoryChanged): void {
    let futureVaultFactory = FutureVaultFactory.load(event.address.toHex())

    if (futureVaultFactory) {
        let curveFactoryAddress = event.params.newFactory
        let curveFactory = new PoolFactory(curveFactoryAddress.toHex())
        curveFactory.createdAtTimestamp = event.block.timestamp
        curveFactory.address = curveFactoryAddress
        curveFactory.futureVaultFactory = futureVaultFactory.id
        curveFactory.ammProvider = "CURVE"
        curveFactory.admin = getPoolFactoryAdmin(curveFactoryAddress)
        let factoryFeeReceiver = getAccount(
            getPoolFactoryFeeReceiver(curveFactoryAddress).toHex(),
            event.block.timestamp
        )
        curveFactory.feeReceiver = factoryFeeReceiver.id
        curveFactory.save()

        futureVaultFactory.poolFactory = curveFactory.id
        futureVaultFactory.save()
    } else {
        log.warning(
            "CurveFactoryChanged event call for not existing FutureVaultFactory {}",
            [event.address.toHex()]
        )
    }
}

export function handleCurvePoolDeployed(event: CurvePoolDeployed): void {
    let poolAddress = event.params.poolAddress
    let pool = new Pool(poolAddress.toHex())

    let ibtAssetAmount = getAssetAmount(
        event.transaction.hash,
        event.params.ibt,
        ZERO_BI,
        "IBT",
        event.block.timestamp
    )

    let ptAssetAmount = getAssetAmount(
        event.transaction.hash,
        event.params.pt,
        ZERO_BI,
        "PT",
        event.block.timestamp
    )

    pool.address = poolAddress
    pool.createdAtTimestamp = event.block.timestamp

    pool.feeRate = getPoolFee(poolAddress)
    pool.totalFees = ZERO_BI
    pool.adminFeeRate = getPoolAdminFee(poolAddress)
    pool.totalAdminFees = ZERO_BI
    pool.futureAdminFeeRate = getPoolFutureAdminFee(poolAddress)
    pool.futureAdminFeeDeadline = ZERO_BI
    pool.totalClaimedAdminFees = ZERO_BI

    pool.assets = [ibtAssetAmount.id, ptAssetAmount.id]

    pool.transactionCount = 0

    let future = Future.load(event.params.pt.toHex())!
    pool.futureVault = future.address.toHex()

    // Asset - Future relation
    let lpToken = getAsset(
        getPoolLPToken(poolAddress).toHex(),
        event.block.timestamp,
        "LP"
    )
    lpToken.futureVault = future.address.toHex()
    lpToken.save()

    pool.liquidityToken = lpToken.id
    pool.totalLPSupply = ZERO_BI

    let futureVaultFactory = FutureVaultFactory.load(event.address.toHex())
    if (futureVaultFactory) {
        if (futureVaultFactory.poolFactory) {
            pool.factory = futureVaultFactory.poolFactory
        }
        pool.futureVaultFactory = futureVaultFactory.id
    }

    pool.save()
}
