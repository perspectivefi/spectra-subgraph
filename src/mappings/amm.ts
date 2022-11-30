import { BigInt } from "@graphprotocol/graph-ts"
import { Address } from "@graphprotocol/graph-ts/index"

import {
    AddLiquidity,
    ClaimAdminFee,
    CommitNewParameters,
    NewParameters,
    RemoveLiquidity,
    RemoveLiquidityOne,
    TokenExchange,
} from "../../generated/AMM/CurvePool"
import { AssetAmount, FeeClaim, Pool } from "../../generated/schema"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"
import { getAsset } from "../entities/Asset"
import { getAssetAmount } from "../entities/AssetAmount"
import { getPoolLPToken } from "../entities/CurvePool"
import { createTransaction } from "../entities/Transaction"
import { getUser } from "../entities/User"
import { updateUserAssetBalance } from "../entities/UserAsset"
import { logWarning } from "../utils"
import { generateFeeClaimId } from "../utils/idGenerators"
import { toPrecision } from "../utils/toPrecision"

const FEES_PRECISION = 10
const CURVE_LP_TOKEN_PRECISION = 18

export function handleAddLiquidity(event: AddLiquidity): void {
    let eventTimestamp = event.block.timestamp

    let user = getUser(event.params.provider.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let ibtAmountAddress = pool.assets![0]
        let ptAmountAddress = pool.assets![1]

        let poolIBTAssetAmount = AssetAmount.load(ibtAmountAddress)!
        let poolPTAssetAmount = AssetAmount.load(ptAmountAddress)!

        let ibtAddress = poolIBTAssetAmount.asset
        let ptAddress = poolPTAssetAmount.asset

        let ibtAmountIn = getAssetAmount(
            event.transaction.hash,
            Address.fromString(ibtAddress),
            event.params.token_amounts[0],
            "IBT",
            eventTimestamp
        )

        updateUserAssetBalance(
            user.address.toHex(),
            ibtAddress,
            ZERO_BI.minus(event.params.token_amounts[0]),
            eventTimestamp,
            "IBT"
        )

        let ptAmountIn = getAssetAmount(
            event.transaction.hash,
            Address.fromString(ptAddress),
            event.params.token_amounts[1],
            "PT",
            eventTimestamp
        )

        updateUserAssetBalance(
            user.address.toHex(),
            ptAddress,
            ZERO_BI.minus(event.params.token_amounts[1]),
            eventTimestamp,
            "PT"
        )

        let lpTokenDiff = event.params.token_supply.minus(pool.totalLPSupply)
        let lpTokenAddress = getPoolLPToken(event.address)

        let lpAmountOut = getAssetAmount(
            event.transaction.hash,
            lpTokenAddress,
            lpTokenDiff,
            "LP",
            eventTimestamp
        )

        let lpPosition = updateUserAssetBalance(
            user.address.toHex(),
            lpTokenAddress.toHex(),
            lpTokenDiff,
            eventTimestamp,
            "LP"
        )

        lpPosition.pool = pool.id
        lpPosition.save()

        let fee = toPrecision(
            event.params.fee,
            FEES_PRECISION,
            CURVE_LP_TOKEN_PRECISION
        )

        let adminFee = fee
            .times(
                toPrecision(
                    pool.adminFeeRate,
                    FEES_PRECISION,
                    CURVE_LP_TOKEN_PRECISION
                )
            )
            .div(BigInt.fromI32(10).pow(18 as u8))

        createTransaction({
            transactionAddress: Address.fromBytes(event.transaction.hash),

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: event.params.provider,
            poolInTransaction: event.address,

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

        pool.totalLPSupply = event.params.token_supply
        pool.save()

        poolIBTAssetAmount.amount = poolIBTAssetAmount.amount.plus(
            event.params.token_amounts[0]
        )
        poolIBTAssetAmount.save()

        poolPTAssetAmount.amount = poolPTAssetAmount.amount.plus(
            event.params.token_amounts[1]
        )
        poolPTAssetAmount.save()
    }
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
    let eventTimestamp = event.block.timestamp

    let user = getUser(event.params.provider.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let lpTokenDiff = pool.totalLPSupply.minus(event.params.token_supply)
        let lpTokenAddress = getPoolLPToken(event.address)

        let lpAmountIn = getAssetAmount(
            event.transaction.hash,
            lpTokenAddress,
            lpTokenDiff,
            "LP",
            eventTimestamp
        )

        let lpPosition = updateUserAssetBalance(
            user.address.toHex(),
            lpTokenAddress.toHex(),
            ZERO_BI.minus(lpTokenDiff),
            eventTimestamp,
            "LP"
        )

        if (!lpPosition.pool) {
            lpPosition.pool = pool.id
            lpPosition.save()
        }

        let ibtAmountAddress = pool.assets![0]
        let ptAmountAddress = pool.assets![1]

        let poolIBTAssetAmount = AssetAmount.load(ibtAmountAddress)!
        let poolPTAssetAmount = AssetAmount.load(ptAmountAddress)!

        let ibtAddress = poolIBTAssetAmount.asset
        let ptAddress = poolPTAssetAmount.asset

        let ibtAmountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(ibtAddress),
            event.params.token_amounts[0],
            "IBT",
            eventTimestamp
        )

        updateUserAssetBalance(
            user.address.toHex(),
            ibtAddress,
            event.params.token_amounts[0],
            event.block.timestamp,
            "IBT"
        )

        let ptAmountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(ptAddress),
            event.params.token_amounts[1],
            "PT",
            eventTimestamp
        )

        updateUserAssetBalance(
            user.address.toHex(),
            ptAddress,
            event.params.token_amounts[1],
            event.block.timestamp,
            "PT"
        )

        createTransaction({
            transactionAddress: Address.fromBytes(event.transaction.hash),

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: event.params.provider,
            poolInTransaction: event.address,

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

        pool.totalLPSupply = event.params.token_supply
        pool.save()

        poolIBTAssetAmount.amount = poolIBTAssetAmount.amount.minus(
            event.params.token_amounts[0]
        )
        poolIBTAssetAmount.save()

        poolPTAssetAmount.amount = poolPTAssetAmount.amount.minus(
            event.params.token_amounts[1]
        )
        poolPTAssetAmount.save()
    }
}

export function handleTokenExchange(event: TokenExchange): void {
    let eventTimestamp = event.block.timestamp

    let user = getUser(event.params.buyer.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let assetSoldAddress = pool.assets![event.params.sold_id.toI32()]
        let assetBoughtAddress = pool.assets![event.params.bought_id.toI32()]

        let poolAssetInAmount = AssetAmount.load(assetSoldAddress)!
        let poolAssetOutAmount = AssetAmount.load(assetBoughtAddress)!

        let amountIn = getAssetAmount(
            event.transaction.hash,
            Address.fromString(poolAssetInAmount.asset),
            event.params.tokens_sold,
            event.params.sold_id.equals(ZERO_BI) ? "IBT" : "PT",
            eventTimestamp
        )

        updateUserAssetBalance(
            user.address.toHex(),
            poolAssetInAmount.asset,
            ZERO_BI.minus(event.params.tokens_sold),
            event.block.timestamp,
            event.params.sold_id.equals(ZERO_BI) ? "IBT" : "PT"
        )

        let amountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(poolAssetOutAmount.asset),
            event.params.tokens_bought,
            event.params.bought_id.equals(ZERO_BI) ? "PT" : "IBT",
            eventTimestamp
        )

        updateUserAssetBalance(
            user.address.toHex(),
            poolAssetOutAmount.asset,
            event.params.tokens_bought,
            event.block.timestamp,
            event.params.bought_id.equals(ZERO_BI) ? "PT" : "IBT"
        )

        let assetOut = getAsset(
            poolAssetOutAmount.asset,
            eventTimestamp,
            event.params.bought_id.equals(ZERO_BI) ? "PT" : "IBT"
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
            transactionAddress: Address.fromBytes(event.transaction.hash),

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: Address.fromBytes(user.address),
            poolInTransaction: Address.fromBytes(pool.address),

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
        pool.save()

        poolAssetInAmount.amount = poolAssetInAmount.amount.plus(
            event.params.tokens_sold
        )
        poolAssetInAmount.save()

        poolAssetOutAmount.amount = poolAssetOutAmount.amount.minus(
            event.params.tokens_bought
        )
        poolAssetOutAmount.save()
    }
}

export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {
    let eventTimestamp = event.block.timestamp

    let userAddress = event.transaction.from.toHex()
    // there is a risc that provider will not exist and in that case the caller will become receiver - https://curve.readthedocs.io/factory-deposits.html
    if (event.params.provider) userAddress = event.params.provider.toHex()

    let user = getUser(userAddress, eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let lpTokenAddress = getPoolLPToken(event.address)

        let lpAmountIn = getAssetAmount(
            event.transaction.hash,
            lpTokenAddress,
            event.params.token_amount,
            "LP",
            eventTimestamp
        )

        let lpPosition = updateUserAssetBalance(
            user.address.toHex(),
            lpTokenAddress.toHex(),
            ZERO_BI.minus(event.params.token_amount),
            eventTimestamp,
            "LP"
        )

        if (!lpPosition.pool) {
            lpPosition.pool = pool.id
            lpPosition.save()
        }

        let withdrawnCoin = pool.assets![event.params.coin_index.toI32()]
        let poolWithdrawnAssetAmount = AssetAmount.load(withdrawnCoin)!
        let withdrawnTokenAddress = poolWithdrawnAssetAmount.asset

        let withdrawnAssetType = event.params.coin_index.equals(ZERO_BI)
            ? "IBT"
            : "PT"

        let withdrawnAmountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(withdrawnTokenAddress),
            event.params.coin_amount,
            withdrawnAssetType,
            eventTimestamp
        )

        updateUserAssetBalance(
            user.address.toHex(),
            withdrawnTokenAddress,
            event.params.coin_amount,
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
            transactionAddress: Address.fromBytes(event.transaction.hash),

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: Address.fromString(userAddress),
            poolInTransaction: event.address,

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

        pool.totalLPSupply = pool.totalLPSupply.minus(event.params.token_amount)
        pool.save()

        poolWithdrawnAssetAmount.amount = poolWithdrawnAssetAmount.amount.minus(
            event.params.coin_amount
        )
        poolWithdrawnAssetAmount.save()
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

        let user = getUser(event.params.admin.toHex(), event.block.timestamp)

        feeClaim.createdAtTimestamp = event.block.timestamp
        feeClaim.pool = pool.id
        feeClaim.feeCollector = user.id
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
