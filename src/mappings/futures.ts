import { Address, ethereum, log } from "@graphprotocol/graph-ts"

import {
    CurveFactoryChanged,
    CurvePoolDeployed,
    PrincipalTokenDeployed,
} from "../../generated/PrincipalTokenFactory/PrincipalTokenFactory"
import {
    FeeClaim,
    Future,
    FutureVaultFactory,
    Pool,
    PoolFactory,
} from "../../generated/schema"
import {
    ERC20,
    PrincipalToken as PrincipalTokenTemplate,
} from "../../generated/templates"
import {
    Deposit,
    FeeClaimed,
    Paused,
    Unpaused,
    Withdraw,
    YieldTransferred,
} from "../../generated/templates/PrincipalToken/PrincipalToken"
import { ZERO_ADDRESS, UNIT_BI, ZERO_BI } from "../constants"
import { createAPRInTimeForPool } from "../entities/APRInTime"
import { getAccount } from "../entities/Account"
import { updateAccountAssetBalance } from "../entities/AccountAsset"
import { getAsset } from "../entities/Asset"
import { getAssetAmount } from "../entities/AssetAmount"
import {
    getPoolAdminFee,
    getPoolPriceScale,
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
    getName,
    getSymbol,
    getIBT,
    getUnderlying,
    getTotalAssets,
    getYT,
    getUnclaimedFees,
    getFeeRate,
} from "../entities/FutureVault"
import { getNetwork } from "../entities/Network"
import { createTransaction } from "../entities/Transaction"
import { AssetType, generateFeeClaimId } from "../utils"
import transactionType from "../utils/TransactionType"
import { generateTransactionId } from "../utils/idGenerators"

export function handlePrincipalTokenDeployed(
    event: PrincipalTokenDeployed
): void {
    let futureVaultAddress = event.params._principalToken
    const newFuture = new Future(futureVaultAddress.toHex())
    newFuture.chainId = getNetwork().chainId
    newFuture.address = futureVaultAddress
    newFuture.futureVaultFactory = event.address.toHex()

    newFuture.state = "ACTIVE"
    newFuture.createdAtTimestamp = event.block.timestamp
    newFuture.expirationAtTimestamp = getExpirationTimestamp(futureVaultAddress)

    newFuture.daoFeeRate = getFeeRate(futureVaultAddress)
    newFuture.unclaimedFees = ZERO_BI
    newFuture.totalCollectedFees = ZERO_BI

    newFuture.name = getName(futureVaultAddress)
    newFuture.symbol = getSymbol(futureVaultAddress)
    newFuture.totalAssets = getTotalAssets(futureVaultAddress)

    let underlyingAddress = getUnderlying(futureVaultAddress)
    let underlyingAsset = getAsset(
        underlyingAddress.toHex(),
        event.block.timestamp,
        AssetType.UNDERLYING
    )
    underlyingAsset.save()

    let ibtAddress = getIBT(futureVaultAddress)
    let ibtAsset = getAsset(
        ibtAddress.toHex(),
        event.block.timestamp,
        AssetType.IBT
    )
    ibtAsset.underlying = underlyingAsset.id
    ibtAsset.save()

    newFuture.underlyingAsset = underlyingAddress.toHex()
    newFuture.ibtAsset = ibtAddress.toHex()

    newFuture.save()

    // PT Asset - Future relation
    let ptToken = getAsset(
        event.params._principalToken.toHex(),
        event.block.timestamp,
        AssetType.PT
    )
    ptToken.futureVault = event.params._principalToken.toHex()
    ptToken.save()

    // YT Asset - Future relation
    let ytToken = getAsset(
        getYT(event.params._principalToken).toHex(),
        event.block.timestamp,
        AssetType.YT
    )
    ytToken.futureVault = event.params._principalToken.toHex()
    ytToken.save()

    // Create dynamic data source for PT token events
    ERC20.create(event.params._principalToken)

    // Create dynamic data source for YT token events
    ERC20.create(Address.fromBytes(ytToken.address))

    // Create dynamic data source for PrincipalToken events
    PrincipalTokenTemplate.create(event.params._principalToken)
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
        let underlyingAddress = getUnderlying(event.address)
        let ptAddress = event.address
        let ytAddress = getYT(event.address)

        let amountIn = getAssetAmount(
            event.transaction.hash,
            underlyingAddress,
            event.params.assets,
            AssetType.UNDERLYING,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            underlyingAddress.toHex(),
            event.block.timestamp,
            AssetType.UNDERLYING
        )

        let firstAmountOut = getAssetAmount(
            event.transaction.hash,
            ptAddress,
            event.params.shares,
            AssetType.PT,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ptAddress.toHex(),
            event.block.timestamp,
            AssetType.PT
        )

        let secondAmountOut = getAssetAmount(
            event.transaction.hash,
            ytAddress,
            event.params.shares,
            AssetType.YT,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ytAddress.toHex(),
            event.block.timestamp,
            AssetType.YT
        )

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: Address.fromBytes(future.address),
            userInTransaction: event.params.sender,
            poolInTransaction: ZERO_ADDRESS,
            lpVaultInTransaction: ZERO_ADDRESS,

            amountsIn: [amountIn.id],
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
            AssetType.PT,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ptAddress.toHex(),
            event.block.timestamp,
            AssetType.PT
        )

        let secondAmountIn = getAssetAmount(
            event.transaction.hash,
            ytAddress,
            event.params.shares,
            AssetType.YT,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.owner.toHex(),
            ytAddress.toHex(),
            event.block.timestamp,
            AssetType.YT
        )

        let amountOut = getAssetAmount(
            event.transaction.hash,
            ibtAddress,
            event.params.assets,
            AssetType.IBT,
            event.block.timestamp
        )

        updateAccountAssetBalance(
            event.params.receiver.toHex(),
            ibtAddress.toHex(),
            event.block.timestamp,
            AssetType.IBT
        )

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: Address.fromBytes(future.address),
            userInTransaction: event.params.sender,
            poolInTransaction: ZERO_ADDRESS,
            lpVaultInTransaction: ZERO_ADDRESS,

            amountsIn: [firstAmountIn.id, secondAmountIn.id],
            amountsOut: [amountOut.id],

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
        AssetType.IBT,
        event.block.timestamp
    )

    let ptAssetAmount = getAssetAmount(
        event.transaction.hash,
        event.params.pt,
        ZERO_BI,
        AssetType.PT,
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

    // Asset - Future relation
    let lpToken = getAsset(
        getPoolLPToken(poolAddress).toHex(),
        event.block.timestamp,
        AssetType.LP
    )

    let future = Future.load(event.params.pt.toHex())
    if (future) {
        pool.futureVault = future.address.toHex()
        lpToken.futureVault = future.address.toHex()
    }
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

    let spotPrice = getPoolPriceScale(poolAddress)
    if (pool.futureVault) {
        let poolAPR = createAPRInTimeForPool(poolAddress, event.block.timestamp)

        poolAPR.save()
    }

    pool.spotPrice = spotPrice
    pool.save()
}
