import { BigInt } from "@graphprotocol/graph-ts";
import { Address } from "@graphprotocol/graph-ts/index";



import { AddLiquidity, RemoveLiquidity } from "../../generated/AMM/CurvePool";
import { AssetAmount, Pool } from "../../generated/schema";
import { ZERO_ADDRESS, ZERO_BI } from "../constants";
import { getAsset } from "../entities/Asset";
import { getAssetAmount } from "../entities/AssetAmount";
import { getPoolLPToken } from "../entities/CurvePool";
import { createTransaction } from "../entities/Transaction";
import { getUser } from "../entities/User";
import { updateUserAssetBalance } from "../entities/UserAsset";


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