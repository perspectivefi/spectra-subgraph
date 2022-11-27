import { BigInt } from "@graphprotocol/graph-ts"
import { Address } from "@graphprotocol/graph-ts/index"

import {
    AddLiquidity,
    RemoveLiquidity,
    RemoveLiquidityOne,
    TokenExchange,
} from "../../generated/AMM/CurvePool"
import { AssetAmount, Pool } from "../../generated/schema"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"
import { getAccount } from "../entities/Account"
import { updateAccountAssetBalance } from "../entities/AccountAsset"
import { getAsset } from "../entities/Asset"
import { getAssetAmount } from "../entities/AssetAmount"
import { getPoolLPToken } from "../entities/CurvePool"
import { createTransaction } from "../entities/Transaction"

export function handleAddLiquidity(event: AddLiquidity): void {
    let eventTimestamp = event.block.timestamp

    let account = getAccount(event.params.provider.toHex(), eventTimestamp)
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

        updateAccountAssetBalance(
            account.address.toHex(),
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

        updateAccountAssetBalance(
            account.address.toHex(),
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

        let lpPosition = updateAccountAssetBalance(
            account.address.toHex(),
            lpTokenAddress.toHex(),
            lpTokenDiff,
            eventTimestamp,
            "LP"
        )
        lpPosition.pool = pool.id
        lpPosition.save()

        let ibtAsset = getAsset(ibtAmountIn.asset, eventTimestamp, "IBT")
        let underlyingAsset = getAsset(
            ibtAsset.underlying!,
            eventTimestamp,
            "UNDERLYING"
        )
        let adminFee = event.params.fee
            .times(pool.adminFeeRate)
            .div(BigInt.fromI32(10).pow(underlyingAsset.decimals as u8))

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

                fee: event.params.fee,
                adminFee,
            },
        })

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

    let account = getAccount(event.params.provider.toHex(), eventTimestamp)
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

        let lpPosition = updateAccountAssetBalance(
            account.address.toHex(),
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

        updateAccountAssetBalance(
            account.address.toHex(),
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

        updateAccountAssetBalance(
            account.address.toHex(),
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

    let account = getAccount(event.params.buyer.toHex(), eventTimestamp)
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

        updateAccountAssetBalance(
            account.address.toHex(),
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

        updateAccountAssetBalance(
            account.address.toHex(),
            poolAssetOutAmount.asset,
            event.params.tokens_bought,
            event.block.timestamp,
            event.params.bought_id.equals(ZERO_BI) ? "PT" : "IBT"
        )

        createTransaction({
            transactionAddress: Address.fromBytes(event.transaction.hash),

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: Address.fromBytes(account.address),
            poolInTransaction: Address.fromBytes(pool.address),

            amountsIn: [amountIn.id],
            amountsOut: [amountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "AMM_EXCHANGE",

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })

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

    let accountAddress = event.transaction.from.toHex()
    // there is a risc that provider will not exist and in that case the caller will become receiver - https://curve.readthedocs.io/factory-deposits.html
    if (event.params.provider) accountAddress = event.params.provider.toHex()

    let account = getAccount(accountAddress, eventTimestamp)
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

        let lpPosition = updateAccountAssetBalance(
            account.address.toHex(),
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

        updateAccountAssetBalance(
            account.address.toHex(),
            withdrawnTokenAddress,
            event.params.coin_amount,
            event.block.timestamp,
            withdrawnAssetType
        )

        createTransaction({
            transactionAddress: Address.fromBytes(event.transaction.hash),

            futureInTransaction: ZERO_ADDRESS,
            userInTransaction: Address.fromString(accountAddress),
            poolInTransaction: event.address,

            amountsIn: [lpAmountIn.id],
            amountsOut: [withdrawnAmountOut.id],

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "AMM_REMOVE_LIQUIDITY_ONE",

                fee: ZERO_BI,
                adminFee: ZERO_BI,
            },
        })

        pool.totalLPSupply = pool.totalLPSupply.minus(event.params.token_amount)
        pool.save()

        poolWithdrawnAssetAmount.amount = poolWithdrawnAssetAmount.amount.minus(
            event.params.coin_amount
        )
        poolWithdrawnAssetAmount.save()
    }
}
