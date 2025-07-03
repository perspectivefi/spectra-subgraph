import { Address, BigInt, log } from "@graphprotocol/graph-ts"

import { FeeClaim } from "../../generated/schema"
import { CurvePoolSNG } from "../../generated/templates/CurvePool/CurvePoolSNG"
import { ZERO_BI } from "../constants"
import { generateFeeClaimId, PoolType } from "../utils"
import { getAccount } from "./Account"

class CreateFeeClaimParams {
    admin: Address
    timestamp: BigInt
    poolId: string
    amount: BigInt
    ibtAmount: BigInt
    ptAmount: BigInt
}

export function createFeeClaim(params: CreateFeeClaimParams): FeeClaim {
    let feeClaim = new FeeClaim(
        generateFeeClaimId(params.admin.toHex(), params.timestamp.toString())
    )

    let account = getAccount(params.admin.toHex(), params.timestamp)

    feeClaim.createdAtTimestamp = params.timestamp
    feeClaim.pool = params.poolId
    feeClaim.feeCollector = account.id
    feeClaim.amount = params.amount
    feeClaim.ibtAmount = params.ibtAmount
    feeClaim.ptAmount = params.ptAmount
    feeClaim.save()
    return feeClaim
}

export const getPoolAdminBalances = (
    poolAddress: Address,
    poolType: string
): BigInt[] => {
    // if pool isn't SNG, skip for now TODO:
    if (poolType != PoolType.CURVE_SNG) {
        return [ZERO_BI, ZERO_BI]
    } else {
        let curvePoolContract = CurvePoolSNG.bind(poolAddress)
        let ibtAdminBalanceCall = curvePoolContract.try_admin_balances(
            BigInt.fromI32(0)
        )
        let ptAdminBalanceCall = curvePoolContract.try_admin_balances(
            BigInt.fromI32(1)
        )
        if (!ibtAdminBalanceCall.reverted && !ptAdminBalanceCall.reverted) {
            return [ibtAdminBalanceCall.value, ptAdminBalanceCall.value]
        }
        log.warning("admin_balances call reverted for pool: {}", [
            poolAddress.toHex(),
        ])
        return [ZERO_BI, ZERO_BI]
    }
}
