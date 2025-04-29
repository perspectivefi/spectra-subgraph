import { Pool } from "../../../generated/schema"
import {
    CommitNewParameters,
    NewParameters,
} from "../../../generated/templates/CurvePool/CurvePool"
import { NewParameters as NewParametersNG } from "../../../generated/templates/CurvePool/CurvePoolNG"
import { getPoolFee } from "../../entities/CurvePool"

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
        pool.feeRate = getPoolFee(event.address)
        pool.adminFeeRate = event.params.admin_fee
        pool.save()
    }
}

export function handleNewParametersNG(event: NewParametersNG): void {
    //TODO:
}
