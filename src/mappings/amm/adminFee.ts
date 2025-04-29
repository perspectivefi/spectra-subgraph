import { FeeClaim, Pool } from "../../../generated/schema"
import { ClaimAdminFee } from "../../../generated/templates/CurvePool/CurvePool"
import { ClaimAdminFee as ClaimAdminFeeNG } from "../../../generated/templates/CurvePool/CurvePoolNG"
import { getAccount } from "../../entities/Account"
import { generateFeeClaimId } from "../../utils"

export function handleClaimAdminFee(event: ClaimAdminFee): void {
    let pool = Pool.load(event.address.toHex())

    if (pool) {
        let feeClaim = new FeeClaim(
            generateFeeClaimId(
                event.params.admin.toHex(),
                event.block.timestamp.toString()
            )
        )

        let account = getAccount(
            event.params.admin.toHex(),
            event.block.timestamp
        )

        feeClaim.createdAtTimestamp = event.block.timestamp
        feeClaim.pool = pool.id
        feeClaim.feeCollector = account.id
        feeClaim.amount = event.params.tokens
        feeClaim.save()

        pool.totalClaimedAdminFees = pool.totalClaimedAdminFees.plus(
            event.params.tokens
        )
        pool.save()
    }
}

export function handleClaimAdminFeeNG(event: ClaimAdminFeeNG): void {
    // TODO:
}
