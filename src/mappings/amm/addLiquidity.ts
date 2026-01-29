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
    getPoolA,
    getPoolStoredRates,
    getPoolOffpegFeeMultiplier,
} from "../../entities/CurvePool"
import { getERC20Decimals, getERC20TotalSupply } from "../../entities/ERC20"
import { getIBTRate } from "../../entities/ERC4626"
import { createFeeClaim, getPoolAdminBalances } from "../../entities/FeeClaim"
import { updateFutureDailyStats } from "../../entities/FutureDailyStats"
import { getPTRate } from "../../entities/FutureVault"
import {
    getLpFeeUnderlying,
    getPoolLiquidityInUnderlying,
    updatePoolAdminBalances,
} from "../../entities/Pool"
import { PoolActionType, updatePoolStats } from "../../entities/PoolStats"
import { createTransaction } from "../../entities/Transaction"
import { AssetType, PoolType } from "../../utils"
import { CurveViews } from "../../utils/curveViews"
import { generateTransactionId } from "../../utils/idGenerators"
import { toPrecision } from "../../utils/toPrecision"

const FEES_PRECISION = 10
const FEE_DENOMINATOR = BigInt.fromI32(10).pow(10)
const PRECISION = BigInt.fromI32(10).pow(18)
const N_COINS = BigInt.fromI32(2)

function addLiquidity(
    event: ethereum.Event,
    token_amounts: BigInt[],
    _fee: BigInt,
    fees: BigInt[] | null = null,
    invariant: BigInt | null = null
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

        let valueUnderlying = ZERO_BI
        let feeUnderlying = ZERO_BI
        let feeRatio = ZERO_BI
        let imbalancedVolumeUnderlying = ZERO_BI
        const ibtRate = getIBTRate(Address.fromString(ibtAddress))
        const ptRate = pool.futureVault
            ? getPTRate(Address.fromString(pool.futureVault!))
            : ZERO_BI

        let fee = toPrecision(_fee, FEES_PRECISION, ibtDecimals)

        let adminFee = fee
            .times(toPrecision(pool.adminFeeRate, FEES_PRECISION, ibtDecimals))
            .div(BigInt.fromI32(10).pow(ibtDecimals as u8))

        const spotPrice = getPoolLastPrices(event.address, pool.type)
        pool.spotPrice = spotPrice

        let adminFees = updatePoolAdminBalances(pool)
        let ibtAdminFee = adminFees[0]
        let ptAdminFee = adminFees[1]
        let adminFeeUnderlying = ibtAdminFee
            .plus(ptAdminFee.times(spotPrice).div(CURVE_UNIT))
            .times(ibtRate)
            .div(BigInt.fromString("10").pow(ibtDecimals as u8))

        // Calculate imbalanced volume by reverse engineering from fees
        //   ideal_balance = D1 * old_balances[i] / D0
        //   difference = |ideal_balance - new_balance|
        //   fees[i] = dynamic_fee_i * difference / FEE_DENOMINATOR for i in {0,1} for which fees[i] > 0
        //   difference = fees[i] * FEE_DENOMINATOR / dynamic_fee_i
        let direction: i32 = -1 // -1 = not set, 0 = BUY_PT, 1 = SELL_PT
        if (
            fees !== null &&
            fees.length >= 2 &&
            invariant !== null &&
            pool.feeRate.gt(ZERO_BI)
        ) {
            // Get pool parameters
            const rates = getPoolStoredRates(
                Address.fromBytes(pool.address),
                pool.type
            )
            const amp = getPoolA(Address.fromBytes(pool.address), pool.type)
            const offpegFeeMultiplier = getPoolOffpegFeeMultiplier(
                Address.fromBytes(pool.address),
                pool.type
            )

            // Old balances (before deposit)
            const oldBalances: BigInt[] = [
                poolIBTAssetAmount.amount,
                poolPTAssetAmount.amount,
            ]

            // New balances (after deposit, before fees)
            const newBalances: BigInt[] = [
                oldBalances[0].plus(token_amounts[0]),
                oldBalances[1].plus(token_amounts[1]),
            ]

            // Calculate D0 using old balances
            // xp = balances * rates / PRECISION
            const xpOld: BigInt[] = [
                oldBalances[0].times(rates[0]).div(PRECISION),
                oldBalances[1].times(rates[1]).div(PRECISION),
            ]

            // Only calculate if pool has liquidity
            if (xpOld[0].gt(ZERO_BI) && xpOld[1].gt(ZERO_BI)) {
                const D0 = CurveViews.getD(xpOld, amp)
                const D1 = invariant

                if (D0.gt(ZERO_BI)) {
                    // ys = (D0 + D1) / N_COINS
                    const ys = D0.plus(D1).div(N_COINS)

                    // base_fee = fee * N_COINS / (4 * (N_COINS - 1))
                    const baseFee = pool.feeRate
                        .times(N_COINS)
                        .div(
                            BigInt.fromI32(4).times(
                                N_COINS.minus(BigInt.fromI32(1))
                            )
                        )

                    for (let i = 0; i < 2; i++) {
                        if (fees[i].gt(ZERO_BI)) {
                            // xs = rates[i] * (old_balances[i] + new_balance) / PRECISION
                            const xs = rates[i]
                                .times(oldBalances[i].plus(newBalances[i]))
                                .div(PRECISION)

                            const dynamicFee = CurveViews.dynamicFee(
                                xs,
                                ys,
                                baseFee,
                                offpegFeeMultiplier
                            )

                            // Back-calculate the difference (imbalanced amount)
                            if (dynamicFee.gt(ZERO_BI)) {
                                const difference = fees[i]
                                    .times(FEE_DENOMINATOR)
                                    .div(dynamicFee)

                                // Convert to underlying value
                                if (i == 0) {
                                    direction = 0
                                    imbalancedVolumeUnderlying =
                                        imbalancedVolumeUnderlying.plus(
                                            difference
                                                .times(ibtRate)
                                                .div(
                                                    BigInt.fromI32(10).pow(
                                                        ibtDecimals as u8
                                                    )
                                                )
                                        )
                                } else {
                                    direction = 1
                                    imbalancedVolumeUnderlying =
                                        imbalancedVolumeUnderlying.plus(
                                            difference
                                                .times(spotPrice)
                                                .div(CURVE_UNIT)
                                                .times(ibtRate)
                                                .div(
                                                    BigInt.fromI32(10).pow(
                                                        ibtDecimals as u8
                                                    )
                                                )
                                        )
                                }
                            }
                        }
                    }
                }
            }
        }

        if (pool.futureVault && spotPrice.gt(ZERO_BI)) {
            const ibtAmount = token_amounts[0]
            const ptAmountInIbt = token_amounts[1]
                .times(spotPrice)
                .div(CURVE_UNIT)
            valueUnderlying = ibtAmount
                .plus(ptAmountInIbt)
                .times(ibtRate)
                .div(BigInt.fromString("10").pow(ibtDecimals as u8))
            feeUnderlying = getLpFeeUnderlying(
                pool,
                ZERO_BI, // for CURVE pools we skip this fee
                ibtAdminFee,
                ptAdminFee,
                ibtRate,
                ibtDecimals
            )
            const liquidityInUnderlying = getPoolLiquidityInUnderlying(
                poolIBTAssetAmount.amount.plus(token_amounts[0]),
                poolPTAssetAmount.amount.plus(token_amounts[1]),
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
            pool,
            SECONDS_PER_HOUR,
            PoolActionType.ADD_LIQUIDITY,
            valueUnderlying,
            feeUnderlying,
            feeRatio
        )
        updatePoolStats(
            event,
            pool,
            SECONDS_PER_DAY,
            PoolActionType.ADD_LIQUIDITY,
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
            poolInTransaction: event.address,
            metavaultInTransaction: ZERO_ADDRESS,

            amountsIn: [ibtAmountIn.id, ptAmountIn.id],
            amountsOut: [lpAmountOut.id],
            valueUnderlying,
            feeUnderlying,
            feeRatio,

            transaction: {
                timestamp: event.block.timestamp,
                block: event.block.number,

                gas: event.block.gasUsed,
                gasPrice: event.transaction.gasPrice,
                type: "AMM_ADD_LIQUIDITY",

                fee,
                adminFee,
            },

            ibtRate,
            ptRate,
            metavaultEpochId: ZERO_BI,
            metavaultShares: ZERO_BI,
            metavaultAssets: ZERO_BI,
        })

        // Track imbalanced add liquidity as a swap (AMM_EXCHANGE)
        if (imbalancedVolumeUnderlying.gt(ZERO_BI) && direction >= 0) {
            const isBuyPt = direction == 0
            const swapActionType = isBuyPt
                ? PoolActionType.BUY_PT
                : PoolActionType.SELL_PT

            // @dev: fee and fee ratio are accounted for in the main ADD_LIQUIDITY transaction
            updatePoolStats(
                event,
                pool,
                SECONDS_PER_HOUR,
                swapActionType,
                imbalancedVolumeUnderlying,
                ZERO_BI,
                ZERO_BI
            )
            // @dev: fee and fee ratio are accounted for in the main ADD_LIQUIDITY transaction
            updatePoolStats(
                event,
                pool,
                SECONDS_PER_DAY,
                swapActionType,
                imbalancedVolumeUnderlying,
                ZERO_BI,
                ZERO_BI
            )
        }

        pool.totalFees = pool.totalFees.plus(feeUnderlying)
        pool.totalFeeRatio = pool.totalFeeRatio.plus(feeRatio)
        pool.totalAdminFees = pool.totalAdminFees.plus(adminFeeUnderlying)
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

        let adminBalances = getPoolAdminBalances(
            Address.fromBytes(pool.address),
            pool.type
        )
        if (pool.type == PoolType.CURVE_SNG) {
            createFeeClaim({
                admin: ZERO_ADDRESS,
                timestamp: event.block.timestamp,
                poolId: pool.id,
                amount: ZERO_BI,
                ibtAmount: pool.ibtAdminBalance.minus(adminBalances[0]),
                ptAmount: pool.ptAdminBalance.minus(adminBalances[1]),
            })
        }
        pool.ibtAdminBalance = adminBalances[0]
        pool.ptAdminBalance = adminBalances[1]

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
    }
}

export function handleAddLiquidity(event: AddLiquidity): void {
    addLiquidity(
        event,
        event.params.token_amounts,
        event.params.fee,
        null,
        null
    )
}

export function handleAddLiquidityNG(event: AddLiquidityNG): void {
    addLiquidity(
        event,
        event.params.token_amounts,
        event.params.fee,
        null,
        null
    )
}

export function handleAddLiquiditySNG(event: AddLiquiditySNG): void {
    addLiquidity(
        event,
        event.params.token_amounts,
        BigInt.fromI32(0),
        event.params.fees,
        event.params.invariant // D1 from the event
    )
}
