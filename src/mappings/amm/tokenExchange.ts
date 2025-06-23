import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts"

import { AssetAmount, Pool } from "../../../generated/schema"
import { CurvePool } from "../../../generated/templates"
import { TokenExchange } from "../../../generated/templates/CurvePool/CurvePool"
import { CurvePool as CurvePoolContract } from "../../../generated/templates/CurvePool/CurvePool"
import { TokenExchange as TokenExchangeNG } from "../../../generated/templates/CurvePool/CurvePoolNG"
import { TokenExchange as TokenExchangeSNG } from "../../../generated/templates/CurvePool/CurvePoolSNG"
import {
    ZERO_ADDRESS,
    UNIT_BI,
    ZERO_BI,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    CURVE_UNIT,
} from "../../constants"
import { getAccount } from "../../entities/Account"
import { updateAccountAssetBalance } from "../../entities/AccountAsset"
import { getAsset } from "../../entities/Asset"
import { getAssetAmount } from "../../entities/AssetAmount"
import { getPoolLastPrices } from "../../entities/CurvePool"
import { getERC20Decimals } from "../../entities/ERC20"
import { getIBTRate } from "../../entities/ERC4626"
import { getPoolAdminBalances, createFeeClaim } from "../../entities/FeeClaim"
import { updateFutureDailyStats } from "../../entities/FutureDailyStats"
import {
    getLpFeeUnderlying,
    getPoolDynamicFee,
    getPoolLiquidityInUnderlying,
    updatePoolAdminBalances,
} from "../../entities/Pool"
import { PoolActionType, updatePoolStats } from "../../entities/PoolDailyStats"
import { createTransaction } from "../../entities/Transaction"
import { AssetType, PoolType } from "../../utils"
import { updatePoolAPY } from "../../utils/calculateAPY"
import { generateTransactionId } from "../../utils/idGenerators"
import { toPrecision } from "../../utils/toPrecision"

const FEES_PRECISION = 10

function tokenExchange(
    event: ethereum.Event,
    buyer: Address,
    sold_id: BigInt,
    tokens_sold: BigInt,
    bought_id: BigInt,
    tokens_bought: BigInt
): void {
    let eventTimestamp = event.block.timestamp

    let account = getAccount(buyer.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let assetSoldAddress = sold_id.equals(ZERO_BI)
            ? pool.ibtAsset
            : pool.ptAsset
        let assetBoughtAddress = bought_id.equals(ZERO_BI)
            ? pool.ibtAsset
            : pool.ptAsset

        let poolAssetInAmount = AssetAmount.load(assetSoldAddress)!
        let poolAssetOutAmount = AssetAmount.load(assetBoughtAddress)!

        let amountIn = getAssetAmount(
            event.transaction.hash,
            Address.fromString(poolAssetInAmount.asset),
            tokens_sold,
            sold_id.equals(ZERO_BI) ? AssetType.IBT : AssetType.PT,
            event.logIndex.toString(),
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            poolAssetInAmount.asset,
            event.block.timestamp,
            sold_id.equals(ZERO_BI) ? AssetType.IBT : AssetType.PT
        )

        let amountOut = getAssetAmount(
            event.transaction.hash,
            Address.fromString(poolAssetOutAmount.asset),
            tokens_bought,
            bought_id.equals(ZERO_BI) ? AssetType.IBT : AssetType.PT,
            event.logIndex.toString(),
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            poolAssetOutAmount.asset,
            event.block.timestamp,
            bought_id.equals(ZERO_BI) ? AssetType.IBT : AssetType.PT
        )

        let assetOut = getAsset(
            poolAssetOutAmount.asset,
            eventTimestamp,
            bought_id.equals(ZERO_BI) ? AssetType.IBT : AssetType.PT
        )

        let feeWithBoughtTokenPrecision = toPrecision(
            pool.feeRate,
            FEES_PRECISION,
            assetOut.decimals
        )

        let amountOutWithFee = tokens_bought
            .times(BigInt.fromI32(10).pow(assetOut.decimals as u8))
            .div(
                BigInt.fromI32(10)
                    .pow(assetOut.decimals as u8)
                    .minus(feeWithBoughtTokenPrecision)
            )

        let fee = amountOutWithFee.minus(tokens_bought)

        let adminFeeWithBoughtTokenPrecision = toPrecision(
            pool.adminFeeRate,
            FEES_PRECISION,
            assetOut.decimals
        )

        let adminFee = fee
            .times(adminFeeWithBoughtTokenPrecision)
            .div(BigInt.fromI32(10).pow(assetOut.decimals as u8))

        let spotPrice = getPoolLastPrices(event.address, pool.type)
        pool.spotPrice = spotPrice

        let adminFees = updatePoolAdminBalances(pool)
        let ibtAdminFee = adminFees[0]
        let ptAdminFee = adminFees[1]

        let valueUnderlying = ZERO_BI
        let feeUnderlying = ZERO_BI
        let feeRatio = ZERO_BI
        const isBuyPt = !bought_id.equals(ZERO_BI)
        if (pool.futureVault && spotPrice.gt(ZERO_BI)) {
            const ibtAddress = AssetAmount.load(pool.ibtAsset)!.asset
            const ibtDecimals = getERC20Decimals(Address.fromString(ibtAddress))
            const ibtRate = getIBTRate(Address.fromString(ibtAddress))
            const ibt = isBuyPt ? tokens_sold : tokens_bought
            const ptInIbt = (isBuyPt ? tokens_bought : tokens_sold)
                .times(CURVE_UNIT)
                .div(spotPrice)
            valueUnderlying = ibt
                .plus(ptInIbt)
                .times(ibtRate)
                .div(BigInt.fromString("10").pow(ibtDecimals as u8))
                .div(BigInt.fromI32(2))
            feeUnderlying = getLpFeeUnderlying(
                pool,
                ibtAdminFee,
                ptAdminFee,
                ibtRate,
                ibtDecimals
            )
            const liquidityInUnderlying = getPoolLiquidityInUnderlying(
                isBuyPt ? poolAssetInAmount.amount : poolAssetOutAmount.amount,
                isBuyPt ? poolAssetOutAmount.amount : poolAssetInAmount.amount,
                spotPrice,
                ibtRate,
                ibtDecimals
            )
            if (liquidityInUnderlying.gt(ZERO_BI)) {
                feeRatio = feeUnderlying
                    .times(CURVE_UNIT)
                    .div(liquidityInUnderlying)
            }
        }

        updatePoolStats(
            event,
            Address.fromBytes(pool.address),
            SECONDS_PER_HOUR,
            isBuyPt ? PoolActionType.BUY_PT : PoolActionType.SELL_PT,
            valueUnderlying,
            feeUnderlying,
            feeRatio
        )
        updatePoolStats(
            event,
            Address.fromBytes(pool.address),
            SECONDS_PER_DAY,
            isBuyPt ? PoolActionType.BUY_PT : PoolActionType.SELL_PT,
            valueUnderlying,
            feeUnderlying,
            feeRatio
        )

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
            valueUnderlying,
            feeUnderlying,
            feeRatio,

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
        pool.totalFeeRatio = pool.totalFeeRatio.plus(feeRatio)
        pool.totalAdminFees = pool.totalAdminFees.plus(adminFee)

        if (pool.type == PoolType.CURVE_SNG) {
            createFeeClaim({
                admin: ZERO_ADDRESS,
                timestamp: event.block.timestamp,
                poolId: pool.id,
                amount: ZERO_BI,
                ibtAmount: ibtAdminFee,
                ptAmount: ptAdminFee,
            })
        }

        pool.save()

        poolAssetInAmount.amount = poolAssetInAmount.amount.plus(tokens_sold)
        poolAssetInAmount.save()

        poolAssetOutAmount.amount =
            poolAssetOutAmount.amount.minus(tokens_bought)
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

export function handleTokenExchange(event: TokenExchange): void {
    tokenExchange(
        event,
        event.params.buyer,
        event.params.sold_id,
        event.params.tokens_sold,
        event.params.bought_id,
        event.params.tokens_bought
    )
}

export function handleTokenExchangeNG(event: TokenExchangeNG): void {
    tokenExchange(
        event,
        event.params.buyer,
        event.params.sold_id,
        event.params.tokens_sold,
        event.params.bought_id,
        event.params.tokens_bought
    )
}

export function handleTokenExchangeSNG(event: TokenExchangeSNG): void {
    tokenExchange(
        event,
        event.params.buyer,
        event.params.sold_id,
        event.params.tokens_sold,
        event.params.bought_id,
        event.params.tokens_bought
    )
}
