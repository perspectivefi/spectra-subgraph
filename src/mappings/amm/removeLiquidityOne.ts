import { BigInt, ethereum } from "@graphprotocol/graph-ts"

import { Pool } from "../../../generated/schema"
import { RemoveLiquidityOne } from "../../../generated/templates/CurvePool/CurvePool"
import { RemoveLiquidityOne as RemoveLiquidityOneNG } from "../../../generated/templates/CurvePool/CurvePoolNG"
import { RemoveLiquidityOne as RemoveLiquidityOneSNG } from "../../../generated/templates/CurvePool/CurvePoolSNG"
import { ZERO_BI } from "../../constants"
import { removeLiquidity } from "./removeLiquidity"

function removeLiquidityOne(
    event: ethereum.Event,
    coin_amount: BigInt,
    coin_index: BigInt,
    token_amount: BigInt
): void {
    const pool = Pool.load(event.address.toHex())
    if (pool) {
        const token_amounts = [
            coin_index.equals(BigInt.fromI32(0)) ? coin_amount : ZERO_BI,
            coin_index.equals(BigInt.fromI32(1)) ? coin_amount : ZERO_BI,
        ]
        const token_supply = pool.lpTotalSupply.minus(token_amount)
        removeLiquidity(event, token_amounts, token_supply)
    }
}

export function handleRemoveLiquidityOne(event: RemoveLiquidityOne): void {
    removeLiquidityOne(
        event,
        event.params.coin_amount,
        event.params.coin_index,
        event.params.token_amount
    )
}

export function handleRemoveLiquidityOneNG(event: RemoveLiquidityOneNG): void {
    removeLiquidityOne(
        event,
        event.params.coin_amount,
        event.params.coin_index,
        event.params.token_amount
    )
}

export function handleRemoveLiquidityOneSNG(
    event: RemoveLiquidityOneSNG
): void {
    removeLiquidityOne(
        event,
        event.params.coin_amount,
        event.params.token_id,
        event.params.token_amount
    )
}
