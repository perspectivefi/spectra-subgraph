import { Address, log } from "@graphprotocol/graph-ts"

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
import { FeeClaim, Future, Pool, PoolFactory } from "../../generated/schema"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"
import { getAsset } from "../entities/Asset"
import { getAssetAmount } from "../entities/AssetAmount"
import {
    getPoolAdminFee,
    getPoolFee,
    getPoolLPToken,
} from "../entities/CurvePool"
import {
    getPoolFactoryAdmin,
    getPoolFactoryFeeReceiver,
} from "../entities/CurvePoolFactory"
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
import { getUser } from "../entities/User"
import { updateUserAssetBalance } from "../entities/UserAsset"
import { generateFeeClaimId } from "../utils/idGenerators"

export function handleFutureVaultDeployed(event: FutureVaultDeployed): void {
    let futureVaultAddress = event.params._futureVault
    const newFuture = new Future(futureVaultAddress.toHex())
    newFuture.address = futureVaultAddress

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

    newFuture.transactions = []

    newFuture.save()
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

        let feeCollector = getUser(
            event.params._feeCollector.toHex(),
            event.block.timestamp
        )

        claim.createdAtTimestamp = event.block.timestamp
        claim.feeCollector = feeCollector.id
        claim.future = future.id
        claim.amount = event.params._fees

        future.totalCollectedFees = future.totalCollectedFees.plus(
            event.params._fees
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

        updateUserAssetBalance(
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

        updateUserAssetBalance(
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

        updateUserAssetBalance(
            event.params.owner.toHex(),
            ytAddress.toHex(),
            event.params.shares,
            event.block.timestamp,
            "YT"
        )

        createTransaction({
            transactionAddress: Address.fromBytes(event.transaction.hash),

            futureInTransaction: event.params.caller,
            userInTransaction: event.params.owner,
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

        updateUserAssetBalance(
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

        updateUserAssetBalance(
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

        updateUserAssetBalance(
            event.params.receiver.toHex(),
            ibtAddress.toHex(),
            event.params.assets,
            event.block.timestamp,
            "IBT"
        )

        createTransaction({
            transactionAddress: Address.fromBytes(event.transaction.hash),

            futureInTransaction: event.params.caller,
            userInTransaction: event.params.receiver,
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
    let future = Future.load(event.address.toHex())

    if (future) {
        let curveFactoryAddress = event.params.newFactory
        let curveFactory = new PoolFactory(curveFactoryAddress.toHex())
        curveFactory.createdAtTimestamp = event.block.timestamp
        curveFactory.address = curveFactoryAddress
        curveFactory.future = future.id
        curveFactory.ammProvider = "CURVE"
        curveFactory.admin = getPoolFactoryAdmin(curveFactoryAddress)
        let factoryFeeReceiver = getUser(
            getPoolFactoryFeeReceiver(curveFactoryAddress).toHex(),
            event.block.timestamp
        )
        curveFactory.feeReceiver = factoryFeeReceiver.id
        curveFactory.save()

        future.poolFactory = curveFactory.id
        future.save()
    } else {
        log.warning(
            "CurveFactoryChanged event call for not existing Future {}",
            [event.address.toHex()]
        )
    }
}

export function handleCurvePoolDeployed(event: CurvePoolDeployed): void {
    let poolAddress = event.params.poolAddress
    let pool = new Pool(poolAddress.toHex())

    let ibtAsset = getAssetAmount(
        event.transaction.hash,
        event.params.ibt,
        ZERO_BI,
        "IBT",
        event.block.timestamp
    )

    let ptAsset = getAssetAmount(
        event.transaction.hash,
        event.params.pt,
        ZERO_BI,
        "PT",
        event.block.timestamp
    )

    pool.address = poolAddress
    pool.createdAtTimestamp = event.block.timestamp

    pool.feeRate = getPoolFee(poolAddress)
    pool.adminFeeRate = getPoolAdminFee(poolAddress)
    pool.totalFees = ZERO_BI
    pool.totalAdminFees = ZERO_BI

    pool.assets = [ibtAsset.id, ptAsset.id]

    pool.transactionCount = 0
    pool.transactions = []

    let lpToken = getAsset(
        getPoolLPToken(poolAddress).toHex(),
        event.block.timestamp,
        "LP"
    )
    pool.liquidityToken = lpToken.id

    pool.volumeHistory = []

    let future = Future.load(event.address.toHex())!
    pool.factory = future.poolFactory!
    pool.futureVault = future.address.toHex()

    pool.totalLPSupply = ZERO_BI
    pool.liquidityPositions = []

    pool.save()
}
