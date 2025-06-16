import { BigInt, Address, ethereum } from "@graphprotocol/graph-ts"

import { AssetAmount, Pool } from "../../../generated/schema"
import { AddLiquidity } from "../../../generated/templates/CurvePool/CurvePool"
import { AddLiquidity as AddLiquidityNG } from "../../../generated/templates/CurvePool/CurvePoolNG"
import { AddLiquidity as AddLiquiditySNG } from "../../../generated/templates/CurvePool/CurvePoolSNG"
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
import {
    getPoolFee,
    getPoolLastPrices,
    getPoolLPToken,
    getPoolVirtualPrice,
} from "../../entities/CurvePool"
import { getERC20Decimals, getERC20TotalSupply } from "../../entities/ERC20"
import { getIBTRate } from "../../entities/ERC4626"
import { updateFutureDailyStats } from "../../entities/FutureDailyStats"
import { PoolActionType, updatePoolStats } from "../../entities/PoolDailyStats"
import { createTransaction } from "../../entities/Transaction"
import { AssetType } from "../../utils"
import { updatePoolAPY } from "../../utils/calculateAPY"
import { generateTransactionId } from "../../utils/idGenerators"
import { toPrecision } from "../../utils/toPrecision"

const FEES_PRECISION = 10

function addLiquidity(
    event: ethereum.Event,
    token_amounts: BigInt[],
    _fee: BigInt
): void {
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
            token_amounts[0],
            AssetType.IBT,
            event.logIndex.toString(),
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
            token_amounts[1],
            AssetType.PT,
            event.logIndex.toString(),
            eventTimestamp
        )

        updateAccountAssetBalance(
            account.address.toHex(),
            ptAddress,
            eventTimestamp,
            AssetType.PT
        )

        let lpTokenAddress = getPoolLPToken(event.address, pool.type)

        const lpTotalSupply = getERC20TotalSupply(lpTokenAddress)
        let lpTokenDiff = lpTotalSupply.minus(pool.lpTotalSupply)
        pool.lpTotalSupply = lpTotalSupply

        let lpAmountOut = getAssetAmount(
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

        lpPosition.pool = pool.id
        lpPosition.save()

        const ibtDecimals = getERC20Decimals(Address.fromString(ibtAddress))

        let fee = toPrecision(_fee, FEES_PRECISION, ibtDecimals)

        let adminFee = fee
            .times(toPrecision(pool.adminFeeRate, FEES_PRECISION, ibtDecimals))
            .div(BigInt.fromI32(10).pow(ibtDecimals as u8))

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
            PoolActionType.ADD_LIQUIDITY,
            valueUnderlying
        )
        updatePoolStats(
            event,
            Address.fromBytes(pool.address),
            SECONDS_PER_DAY,
            PoolActionType.ADD_LIQUIDITY,
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

            amountsIn: [ibtAmountIn.id, ptAmountIn.id],
            amountsOut: [lpAmountOut.id],
            valueUnderlying,

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

        // In case of no liquidity, the fee() will revert on the "CurvePoolDeployed" event so we have to set the fee rate here
        if (
            poolIBTAssetAmount.amount.equals(ZERO_BI) &&
            poolPTAssetAmount.amount.equals(ZERO_BI)
        ) {
            pool.feeRate = getPoolFee(Address.fromBytes(pool.address))
        }

        if (pool.initialVirtualPrice.equals(ZERO_BI)) {
            pool.initialVirtualPrice = getPoolVirtualPrice(
                Address.fromBytes(pool.address)
            )
        }

        pool.save()

        poolIBTAssetAmount.amount = poolIBTAssetAmount.amount.plus(
            token_amounts[0]
        )
        poolIBTAssetAmount.save()

        poolPTAssetAmount.amount = poolPTAssetAmount.amount.plus(
            token_amounts[1]
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

export function handleAddLiquidity(event: AddLiquidity): void {
    addLiquidity(event, event.params.token_amounts, event.params.fee)
}

export function handleAddLiquidityNG(event: AddLiquidityNG): void {
    addLiquidity(event, event.params.token_amounts, event.params.fee)
}

export function handleAddLiquiditySNG(event: AddLiquiditySNG): void {
    addLiquidity(event, event.params.token_amounts, BigInt.fromI32(0)) // TODO: add fees
}
