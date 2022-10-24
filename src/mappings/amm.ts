import { Address } from "@graphprotocol/graph-ts/index"

import { AddLiquidity, RemoveLiquidity } from "../../generated/AMM/MetaPoolZap"
import { Pool } from "../../generated/schema"
import { ZERO_ADDRESS, ZERO_BI } from "../constants"
import { getAssetAmount } from "../entities/AssetAmount"
import { createTransaction } from "../entities/Transaction"
import { getUser } from "../entities/User"
import { updateUserAssetBalance } from "../entities/UserAsset"

export function handleAddLiquidity(event: AddLiquidity): void {
    let eventTimestamp = event.block.timestamp

    let user = getUser(event.params.provider.toHex(), eventTimestamp)
    let pool = Pool.load(event.address.toHex())!

    let firstAmountIn = getAssetAmount(
        event.transaction.hash,
        Address.fromString(pool.assets[0]),
        event.params.token_amounts[0],
        "IBT",
        eventTimestamp
    )

    updateUserAssetBalance(
        user.address.toHex(),
        pool.assets[0],
        ZERO_BI.minus(event.params.token_amounts[0]),
        event.block.timestamp,
        "IBT"
    )

    let secondAmountIn = getAssetAmount(
        event.transaction.hash,
        Address.fromString(pool.assets[1]),
        event.params.token_amounts[1],
        "PT",
        eventTimestamp
    )

    updateUserAssetBalance(
        user.address.toHex(),
        pool.assets[1],
        ZERO_BI.minus(event.params.token_amounts[1]),
        event.block.timestamp,
        "PT"
    )

    // event.params.token_supply
    // event.transaction.

    let newTransaction = createTransaction({
        transactionAddress: Address.fromBytes(event.transaction.hash),

        futureInTransaction: ZERO_ADDRESS,
        userInTransaction: user.address,
        poolInTransaction: event.address,

        amountsIn: [firstAmountIn.id, secondAmountIn.id],
        amountsOut: [],

        transaction: {
            timestamp: event.block.timestamp,
            block: event.block.number,

            gas: event.block.gasUsed,
            gasPrice: event.transaction.gasPrice,
            type: "AMM_DEPOSIT",

            fee: event.params.fees[0],
            adminFee: event.params.fees[1],
        },
    })
}

export function handleRemoveLiquidity(event: RemoveLiquidity): void {}
