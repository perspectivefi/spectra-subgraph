import { Pool } from "../../../generated/schema"
import { ClaimAdminFee } from "../../../generated/templates/CurvePool/CurvePool"
import { ClaimAdminFee as ClaimAdminFeeNG } from "../../../generated/templates/CurvePool/CurvePoolNG"
import { ZERO_BI } from "../../constants"
import { createFeeClaim } from "../../entities/FeeClaim"

export function handleClaimAdminFee(event: ClaimAdminFee): void {
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        createFeeClaim({
            admin: event.params.admin,
            timestamp: event.block.timestamp,
            poolId: pool.id,
            amount: event.params.tokens,
            ibtAmount: ZERO_BI,
            ptAmount: ZERO_BI,
        })

        pool.totalClaimedAdminFees = pool.totalClaimedAdminFees.plus(
            event.params.tokens
        )
        pool.save()
    }
}

export function handleClaimAdminFeeNG(event: ClaimAdminFeeNG): void {
    // TODO:
}
