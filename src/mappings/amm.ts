import { BigInt, Address } from "@graphprotocol/graph-ts"

import {
    AddLiquidity,
    ClaimAdminFee,
    CommitNewParameters,
    NewParameters,
    RemoveLiquidity,
    RemoveLiquidityOne,
    TokenExchange,
} from "../../generated/CurvePool/CurvePool"
import { AssetAmount, FeeClaim, Pool } from "../../generated/schema"
import { ZERO_ADDRESS, UNIT_BI, ZERO_BI } from "../constants"
import { getAccount } from "../entities/Account"
import { updateAccountAssetBalance } from "../entities/AccountAsset"
import { getAsset } from "../entities/Asset"
import { getAssetAmount } from "../entities/AssetAmount"
import { getPoolPriceScale, getPoolLPToken } from "../entities/CurvePool"
import { getERC20Decimals, getERC20TotalSupply } from "../entities/ERC20"
import { updateFutureDailyStats } from "../entities/FutureDailyStats"
import { createTransaction } from "../entities/Transaction"
import { AssetType, generateFeeClaimId } from "../utils"
import { updatePoolAPR } from "../utils/calculateAPR"
import { generateTransactionId } from "../utils/idGenerators"
import { toPrecision } from "../utils/toPrecision"

const FEES_PRECISION = 10

export function handleAddLiquidity(event: AddLiquidity): void {
    let eventTimestamp = event.block.timestamp

    let account = getAccount(event.transaction.from.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let ibtAmountAddress = pool.ibtAsset
        let ptAmountAddress = pool.ptAsset

        let poolIBTAssetAmount = AssetAmount.load(ibtAmountAddress)!
        let poolPTAssetAmount = AssetAmount.load(ptAmountAddress)!

        let ibtAddress = poolIBTAssetAmount.asset
        let ptAddress = poolPTAssetAmount.asset

        let ibtAmountIn = getAssetAmount(
            event.transaction.hash,
            Address.fromString(ibtAddress),
            event.params.token_amounts[0],
            AssetType.IBT,
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            ibtAddress,
            eventTimestamp,
            AssetType.IBT
        )

        let ptAmountIn = getAssetAmount(
            event.transaction.hash,
            Address.fromString(ptAddress),
            event.params.token_amounts[1],
            AssetType.PT,
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            ptAddress,
            eventTimestamp,
            AssetType.PT
        )

        let lpTokenAddress = getPoolLPToken(event.address)

        const lpTotalSupply = getERC20TotalSupply(lpTokenAddress)
        pool.lpTotalSupply = lpTotalSupply

        let lpTokenDiff = lpTotalSupply.minus(pool.lpTotalSupply)

        let lpAmountOut = getAssetAmount(
            event.transaction.hash,
            lpTokenAddress,
            lpTokenDiff,
            AssetType.LP,
            eventTimestamp
        )

        let lpPosition = updateAccountAssetBalance(
            account.address.toHex(),
            lpTokenAddress.toHex(),
            eventTimestamp,
            AssetType.LP
        )

        lpPosition.pool = pool.id
        lpPosition.save()

        const ibtDecimals = getERC20Decimals(Address.fromString(ibtAddress))

        let fee = toPrecision(event.params.fee, FEES_PRECISION, ibtDecimals)

        let adminFee = fee
            .times(toPrecision(pool.adminFeeRate, FEES_PRECISION, ibtDecimals))
            .div(BigInt.fromI32(10).pow(ibtDecimals as u8))

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: Address.fromBytes(account.address),
            poolInTransaction: event.address,
            lpVaultInTransaction: ZERO_ADDRESS,

            amountsIn: [ibtAmountIn.id, ptAmountIn.id],
            amountsOut: [lpAmountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "AMM_ADD_LIQUIDITY",

                fee,
                adminFee,
            },
        })

        pool.totalFees = pool.totalFees.plus(fee)
        pool.totalAdminFees = pool.totalAdminFees.plus(adminFee)

        pool.save()

        poolIBTAssetAmount.amount = poolIBTAssetAmount.amount.plus(
            event.params.token_amounts[0]
        )
        poolIBTAssetAmount.save()

        poolPTAssetAmount.amount = poolPTAssetAmount.amount.plus(
            event.params.token_amounts[1]
        )
        poolPTAssetAmount.save()

        if (pool.futureVault) {
            // AddLiquidity specific FutureDailyStats data
            const futureVaultAddress = Address.fromString(pool.futureVault!)
            let futureDailyStats = updateFutureDailyStats(
                event,
                futureVaultAddress
            )
            futureDailyStats.dailyAddLiquidity =
                futureDailyStats.dailyAddLiquidity.plus(UNIT_BI)
            futureDailyStats.save()
        }

        if (pool.futureVault) {
            updatePoolAPR(
                event.address,
                Address.fromString(pool.futureVault!),
                event.block.timestamp
            )
        }
    }
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
    let eventTimestamp = event.block.timestamp

    let account = getAccount(event.transaction.from.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let lpTokenAddress = getPoolLPToken(event.address)
        let lpTokenDiff = pool.lpTotalSupply.minus(event.params.token_supply)

        let lpAmountIn = getAssetAmount(
            event.transaction.hash,
            lpTokenAddress,
            lpTokenDiff,
            AssetType.LP,
            eventTimestamp
        )

        let lpPosition = updateAccountAssetBalance(
            account.address.toHex(),
            lpTokenAddress.toHex(),
            eventTimestamp,
            AssetType.LP
        )

        if (!lpPosition.pool) {
            lpPosition.pool = pool.id
            lpPosition.save()
        }

        let ibtAmountAddress = pool.ibtAsset
        let ptAmountAddress = pool.ptAsset

        let poolIBTAssetAmount = AssetAmount.load(ibtAmountAddress)!
        let poolPTAssetAmount = AssetAmount.load(ptAmountAddress)!

        let ibtAddress = poolIBTAssetAmount.asset
        let ptAddress = poolPTAssetAmount.asset

        let ibtAmountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(ibtAddress),
            event.params.token_amounts[0],
            AssetType.IBT,
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            ibtAddress,
            event.block.timestamp,
            AssetType.IBT
        )

        let ptAmountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(ptAddress),
            event.params.token_amounts[1],
            AssetType.PT,
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            ptAddress,
            event.block.timestamp,
            AssetType.PT
        )

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: Address.fromBytes(account.address),
            poolInTransaction: event.address,
            lpVaultInTransaction: ZERO_ADDRESS,

            amountsIn: [lpAmountIn.id],
            amountsOut: [ibtAmountOut.id, ptAmountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "AMM_REMOVE_LIQUIDITY",

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })

        pool.lpTotalSupply = event.params.token_supply

        pool.save()

        poolIBTAssetAmount.amount = poolIBTAssetAmount.amount.minus(
            event.params.token_amounts[0]
        )
        poolIBTAssetAmount.save()

        poolPTAssetAmount.amount = poolPTAssetAmount.amount.minus(
            event.params.token_amounts[1]
        )
        poolPTAssetAmount.save()

        if (pool.futureVault) {
            // RemoveLiquidity specific FutureDailyStats data
            const futureVaultAddress = Address.fromString(pool.futureVault!)
            let futureDailyStats = updateFutureDailyStats(
                event,
                futureVaultAddress
            )
            futureDailyStats.dailyRemoveLiquidity =
                futureDailyStats.dailyRemoveLiquidity.plus(UNIT_BI)
            futureDailyStats.save()
        }
    }
}

export function handleTokenExchange(event: TokenExchange): void {
    let eventTimestamp = event.block.timestamp

    let account = getAccount(event.params.buyer.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let assetSoldAddress = event.params.sold_id.equals(ZERO_BI)
            ? pool.ibtAsset
            : pool.ptAsset
        let assetBoughtAddress = event.params.bought_id.equals(ZERO_BI)
            ? pool.ibtAsset
            : pool.ptAsset

        let poolAssetInAmount = AssetAmount.load(assetSoldAddress)!
        let poolAssetOutAmount = AssetAmount.load(assetBoughtAddress)!

        let amountIn = getAssetAmount(
            event.transaction.hash,
            Address.fromString(poolAssetInAmount.asset),
            event.params.tokens_sold,
            event.params.sold_id.equals(ZERO_BI) ? AssetType.IBT : AssetType.PT,
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            poolAssetInAmount.asset,
            event.block.timestamp,
            event.params.sold_id.equals(ZERO_BI) ? AssetType.IBT : AssetType.PT
        )

        let amountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(poolAssetOutAmount.asset),
            event.params.tokens_bought,
            event.params.bought_id.equals(ZERO_BI)
                ? AssetType.IBT
                : AssetType.PT,
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            poolAssetOutAmount.asset,
            event.block.timestamp,
            event.params.bought_id.equals(ZERO_BI)
                ? AssetType.IBT
                : AssetType.PT
        )

        let assetOut = getAsset(
            poolAssetOutAmount.asset,
            eventTimestamp,
            event.params.bought_id.equals(ZERO_BI)
                ? AssetType.IBT
                : AssetType.PT
        )

        let feeWithBoughtTokenPrecision = toPrecision(
            pool.feeRate,
            FEES_PRECISION,
            assetOut.decimals
        )

        let amountOutWithFee = event.params.tokens_bought
            .times(BigInt.fromI32(10).pow(assetOut.decimals as u8))
            .div(
                BigInt.fromI32(10)
                    .pow(assetOut.decimals as u8)
                    .minus(feeWithBoughtTokenPrecision)
            )

        let fee = amountOutWithFee.minus(event.params.tokens_bought)

        let adminFeeWithBoughtTokenPrecision = toPrecision(
            pool.adminFeeRate,
            FEES_PRECISION,
            assetOut.decimals
        )

        let adminFee = fee
            .times(adminFeeWithBoughtTokenPrecision)
            .div(BigInt.fromI32(10).pow(assetOut.decimals as u8))

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: Address.fromBytes(account.address),
            poolInTransaction: Address.fromBytes(pool.address),
            lpVaultInTransaction: ZERO_ADDRESS,

            amountsIn: [amountIn.id],
            amountsOut: [amountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "AMM_EXCHANGE",

                fee,
                adminFee,
            },
        })

        pool.totalFees = pool.totalFees.plus(fee)
        pool.totalAdminFees = pool.totalAdminFees.plus(adminFee)

        let spotPrice = getPoolPriceScale(event.address)
        pool.spotPrice = spotPrice

        pool.save()

        poolAssetInAmount.amount = poolAssetInAmount.amount.plus(
            event.params.tokens_sold
        )
        poolAssetInAmount.save()

        poolAssetOutAmount.amount = poolAssetOutAmount.amount.minus(
            event.params.tokens_bought
        )
        poolAssetOutAmount.save()

        if (pool.futureVault) {
            // Swap specific FutureDailyStats data
            const futureVaultAddress = Address.fromString(pool.futureVault!)
            let futureDailyStats = updateFutureDailyStats(
                event,
                futureVaultAddress
            )
            futureDailyStats.dailySwaps =
                futureDailyStats.dailySwaps.plus(UNIT_BI)
            futureDailyStats.save()
        }

        if (pool.futureVault) {
            updatePoolAPR(
                event.address,
                Address.fromString(pool.futureVault!),
                event.block.timestamp
            )
        }
    }
}

export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {
    let eventTimestamp = event.block.timestamp

    let accountAddress = event.transaction.from.toHex()
    // there is a risc that provider will not exist and in that case the caller will become receiver - https://curve.readthedocs.io/factory-deposits.html
    // if (event.params.provider) accountAddress = event.params.provider.toHex()

    let account = getAccount(accountAddress, eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let lpTokenAddress = getPoolLPToken(event.address)

        let lpAmountIn = getAssetAmount(
            event.transaction.hash,
            lpTokenAddress,
            event.params.token_amount,
            AssetType.LP,
            eventTimestamp
        )

        let lpPosition = updateAccountAssetBalance(
            account.address.toHex(),
            lpTokenAddress.toHex(),
            eventTimestamp,
            AssetType.LP
        )

        if (!lpPosition.pool) {
            lpPosition.pool = pool.id
            lpPosition.save()
        }

        let withdrawnCoin = event.params.coin_index.equals(ZERO_BI)
            ? pool.ibtAsset
            : pool.ptAsset
        let poolWithdrawnAssetAmount = AssetAmount.load(withdrawnCoin)!
        let withdrawnTokenAddress = poolWithdrawnAssetAmount.asset

        let withdrawnAssetType = event.params.coin_index.equals(ZERO_BI)
            ? AssetType.IBT
            : AssetType.PT

        let withdrawnAmountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(withdrawnTokenAddress),
            event.params.coin_amount,
            withdrawnAssetType,
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            withdrawnTokenAddress,
            event.block.timestamp,
            withdrawnAssetType
        )

        let assetOut = getAsset(
            withdrawnAmountOut.asset,
            eventTimestamp,
            withdrawnAssetType
        )

        let feeWithWithdrawnTokenPrecision = toPrecision(
            pool.feeRate,
            FEES_PRECISION,
            assetOut.decimals
        )

        let amountOutWithFee = event.params.coin_amount
            .times(BigInt.fromI32(10).pow(assetOut.decimals as u8))
            .div(
                BigInt.fromI32(10)
                    .pow(assetOut.decimals as u8)
                    .minus(feeWithWithdrawnTokenPrecision)
            )

        let fee = amountOutWithFee.minus(event.params.coin_amount)

        let adminFeeWithBoughtTokenPrecision = toPrecision(
            pool.adminFeeRate,
            FEES_PRECISION,
            assetOut.decimals
        )

        let adminFee = fee
            .times(adminFeeWithBoughtTokenPrecision)
            .div(BigInt.fromI32(10).pow(assetOut.decimals as u8))

        createTransaction({
            id: generateTransactionId(
                event.transaction.hash,
                event.logIndex.toString()
            ),
            transactionAddress: event.transaction.hash,

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: Address.fromString(accountAddress),
            poolInTransaction: event.address,
            lpVaultInTransaction: ZERO_ADDRESS,

            amountsIn: [lpAmountIn.id],
            amountsOut: [withdrawnAmountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "AMM_REMOVE_LIQUIDITY_ONE",

                fee,
                adminFee,
            },
        })

        pool.totalFees = pool.totalFees.plus(fee)
        pool.totalAdminFees = pool.totalAdminFees.plus(adminFee)

        const lpTotalSupply = getERC20TotalSupply(lpTokenAddress)
        pool.lpTotalSupply = lpTotalSupply

        let spotPrice = getPoolPriceScale(event.address)
        pool.spotPrice = spotPrice

        pool.save()

        poolWithdrawnAssetAmount.amount = poolWithdrawnAssetAmount.amount.minus(
            event.params.coin_amount
        )
        poolWithdrawnAssetAmount.save()

        if (pool.futureVault) {
            // RemoveLiquidityOne specific FutureDailyStats data
            const futureVaultAddress = Address.fromString(pool.futureVault!)
            let futureDailyStats = updateFutureDailyStats(
                event,
                futureVaultAddress
            )
            futureDailyStats.dailyRemoveLiquidity =
                futureDailyStats.dailyRemoveLiquidity.plus(UNIT_BI)
            futureDailyStats.save()
        }

        if (pool.futureVault) {
            updatePoolAPR(
                event.address,
                Address.fromString(pool.futureVault!),
                event.block.timestamp
            )
        }
    }
}

export function handleClaimAdminFee(event: ClaimAdminFee): void {
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let feeClaim = new FeeClaim(
            generateFeeClaimId(
                event.params.admin.toHex(),
                event.block.timestamp.toString()
            )
        )

        let account = getAccount(
            event.params.admin.toHex(),
            event.block.timestamp
        )

        feeClaim.createdAtTimestamp = event.block.timestamp
        feeClaim.pool = pool.id
        feeClaim.feeCollector = account.id
        feeClaim.amount = event.params.tokens
        feeClaim.save()

        pool.totalClaimedAdminFees = pool.totalClaimedAdminFees.plus(
            event.params.tokens
        )
        pool.save()
    }
}

export function handleCommitNewParameters(event: CommitNewParameters): void {
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        pool.futureAdminFeeRate = event.params.admin_fee
        // as fee rate can change in depend of time when it reaches the deadline
        // we should check current admin fee rate before every transaction
        pool.futureAdminFeeDeadline = event.params.deadline
        pool.save()
    }
}

export function handleNewParameters(event: NewParameters): void {
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        pool.adminFeeRate = event.params.admin_fee
        pool.save()
    }
}
