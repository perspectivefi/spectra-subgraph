import { Address, BigInt } from "@graphprotocol/graph-ts"

import { Yield } from "../../generated/schema"

export function updateYield(
    principalToken: Address,
    account: Address,
    timestamp: BigInt,
    amount: BigInt
): Yield {
    let yieldEntity = Yield.load()
    if (yieldEntity) {
        yieldEntity.amount = amount
        yieldEntity.save()
        return yieldEntity
    }

    yieldEntity = new Yield()

    return yieldEntity
}
