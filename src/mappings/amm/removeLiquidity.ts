import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts"

import { AssetAmount, Pool } from "../../../generated/schema"
import { RemoveLiquidity } from "../../../generated/templates/CurvePool/CurvePool"
import { RemoveLiquidity as RemoveLiquiditySNG } from "../../../generated/templates/CurvePool/CurvePoolSNG"
import { RemoveLiquidityImbalance as RemoveLiquidityImbalanceSNG } from "../../../generated/templates/CurvePool/CurvePoolSNG"
import {
    ZERO_ADDRESS,
    UNIT_BI,
    ZERO_BI,
    CURVE_UNIT,
    SECONDS_PER_HOUR,
    SECONDS_PER_DAY,
} from "../../constants"
import { getAccount } from "../../entities/Account"
import { updateAccountAssetBalance } from "../../entities/AccountAsset"
import { getAssetAmount } from "../../entities/AssetAmount"
import { getPoolLastPrices, getPoolLPToken } from "../../entities/CurvePool"
import { getERC20Decimals } from "../../entities/ERC20"
import { getIBTRate } from "../../entities/ERC4626"
import { updateFutureDailyStats } from "../../entities/FutureDailyStats"
import { PoolActionType, updatePoolStats } from "../../entities/PoolDailyStats"
import { createTransaction } from "../../entities/Transaction"
import { AssetType } from "../../utils"
import { updatePoolAPY } from "../../utils/calculateAPY"
import { generateTransactionId } from "../../utils/idGenerators"

export function removeLiquidity(
    event: ethereum.Event,
    token_amounts: BigInt[],
    token_supply: BigInt
): void {
    let eventTimestamp = event.block.timestamp

    let account = getAccount(event.transaction.from.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let lpTokenAddress = getPoolLPToken(event.address, pool.type)
        let lpTokenDiff = pool.lpTotalSupply.minus(token_supply)

        let lpAmountIn = getAssetAmount(
            event.transaction.hash,
            lpTokenAddress,
            lpTokenDiff,
            AssetType.LP,
            event.logIndex.toString(),
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
            token_amounts[0],
            AssetType.IBT,
            event.logIndex.toString(),
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
            token_amounts[1],
            AssetType.PT,
            event.logIndex.toString(),
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            ptAddress,
            event.block.timestamp,
            AssetType.PT
        )

        const spotPrice = getPoolLastPrices(event.address, pool.type)
        pool.spotPrice = spotPrice

        let valueUnderlying = ZERO_BI
        if (pool.futureVault && spotPrice.gt(ZERO_BI)) {
            const ibtAddress = AssetAmount.load(pool.ibtAsset)!.asset
            const ibtDecimals = getERC20Decimals(Address.fromString(ibtAddress))
            const ibtRate = getIBTRate(Address.fromString(ibtAddress))
            const ibtAmount = token_amounts[0]
            const ptAmountInIbt = token_amounts[1]
                .times(CURVE_UNIT)
                .div(spotPrice)
            valueUnderlying = ibtAmount
                .plus(ptAmountInIbt)
                .times(ibtRate)
                .div(BigInt.fromString("10").pow(ibtDecimals as u8))
        }

        updatePoolStats(
            event,
            Address.fromBytes(pool.address),
            SECONDS_PER_HOUR,
            PoolActionType.REMOVE_LIQUIDITY,
            valueUnderlying
        )
        updatePoolStats(
            event,
            Address.fromBytes(pool.address),
            SECONDS_PER_DAY,
            PoolActionType.REMOVE_LIQUIDITY,
            valueUnderlying
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
            valueUnderlying,

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

        pool.lpTotalSupply = pool.lpTotalSupply.minus(lpTokenDiff)

        pool.save()

        poolIBTAssetAmount.amount = poolIBTAssetAmount.amount.minus(
            token_amounts[0]
        )
        poolIBTAssetAmount.save()

        poolPTAssetAmount.amount = poolPTAssetAmount.amount.minus(
            token_amounts[1]
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

        if (pool.futureVault) {
            updatePoolAPY(
                event.address,
                pool.type,
                Address.fromString(pool.futureVault!),
                event.block.timestamp,
                event.block.number
            )
        }
    }
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {
    removeLiquidity(
        event,
        event.params.token_amounts,
        event.params.token_supply
    )
}

export function handleRemoveLiquiditySNG(event: RemoveLiquiditySNG): void {
    removeLiquidity(
        event,
        event.params.token_amounts,
        event.params.token_supply
    )
}

export function handleRemoveLiquidityImbalanceSNG(
    event: RemoveLiquidityImbalanceSNG
): void {
    removeLiquidity(
        event,
        event.params.token_amounts,
        event.params.token_supply
    )
}
