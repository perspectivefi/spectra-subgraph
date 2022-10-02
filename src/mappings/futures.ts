import { log } from "@graphprotocol/graph-ts"

import {
    FeeClaimed,
    Paused,
    Unpaused,
} from "../../generated/FutureVault/FutureVault"
import { FutureVaultDeployed } from "../../generated/FutureVaultFactory/FutureVaultFactory"
import { FeeClaim, Future } from "../../generated/schema"
import { ZERO_BD } from "../constants"
import { getAsset } from "../entities/Asset"
import {
    getExpirationTimestamp,
    getMaxFeeRate,
    getName,
    getSymbol,
    getIBT,
    getUnderlying,
    getTotalAssets,
} from "../entities/FutureVault"
import { getUser } from "../entities/User"
import { generateFeeClaimId } from "../utils/idGenerators"

export function handleFutureVaultDeployed(event: FutureVaultDeployed): void {
    let futureVaultAddress = event.params._futureVault
    const newFuture = new Future(futureVaultAddress.toHex())
    newFuture.address = futureVaultAddress

    newFuture.state = "ACTIVE"
    newFuture.createdAtTimestamp = event.block.timestamp
    newFuture.expirationAtTimestamp = getExpirationTimestamp(futureVaultAddress)

    newFuture.daoFeeRate = getMaxFeeRate(futureVaultAddress)
    newFuture.totalFees = ZERO_BD

    newFuture.name = getName(futureVaultAddress)
    newFuture.symbol = getSymbol(futureVaultAddress)
    newFuture.totalAssets = getTotalAssets(futureVaultAddress)

    let underlyingAddress = getUnderlying(futureVaultAddress)
    let underlyingAsset = getAsset(
        underlyingAddress.toHex(),
        event.block.timestamp,
        "UNDERLYING"
    )
    underlyingAsset.save()

    let ibtAddress = getIBT(futureVaultAddress)
    let ibtAsset = getAsset(ibtAddress.toHex(), event.block.timestamp, "IBT")
    ibtAsset.underlying = underlyingAsset.id
    ibtAsset.save()

    newFuture.underlyingAsset = underlyingAddress.toHex()
    newFuture.ibtAsset = ibtAddress.toHex()

    newFuture.save()
}

export function handlePaused(event: Paused): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        future.state = "PAUSED"
        future.save()
    } else {
        log.warning("Paused event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleUnpaused(event: Unpaused): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        future.state = "ACTIVE"
        future.save()
    } else {
        log.warning("Unpaused event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}

export function handleFeeClaimed(event: FeeClaimed): void {
    let future = Future.load(event.address.toHex())

    if (future) {
        let claim = new FeeClaim(
            generateFeeClaimId(
                event.params._feeCollector.toHex(),
                event.block.timestamp.toString()
            )
        )

        let feeCollector = getUser(
            event.params._feeCollector.toHex(),
            event.block.timestamp
        )

        claim.createdAtTimestamp = event.block.timestamp
        claim.feeCollector = feeCollector.id
        claim.future = future.id
        claim.amount = event.params._fees

        claim.save()
    } else {
        log.warning("FeeClaimed event call for not existing Future {}", [
            event.address.toHex(),
        ])
    }
}
