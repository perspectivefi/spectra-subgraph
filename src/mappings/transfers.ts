import { Address } from "@graphprotocol/graph-ts"

import { Asset, Future, Transfer } from "../../generated/schema"
import { Transfer as TransferEvent } from "../../generated/templates/ERC20/ERC20"
import { getAccount } from "../entities/Account"
import { updateAccountAssetBalance } from "../entities/AccountAsset"
import { getAssetAmount } from "../entities/AssetAmount"
import { updateYield } from "../entities/Yield"
import { logWarning } from "../utils"
import { generateTransferId } from "../utils/idGenerators"

export function handleTransfer(event: TransferEvent): void {
    let eventTimestamp = event.block.timestamp

    let transfer = new Transfer(
        generateTransferId(
            event.transaction.hash.toHex(),
            eventTimestamp.toString()
        )
    )

    transfer.createdAtTimestamp = eventTimestamp
    transfer.address = event.transaction.hash
    transfer.block = event.block.number

    let accountFrom = getAccount(event.params.from.toHex(), eventTimestamp)
    let accountTo = getAccount(event.params.to.toHex(), eventTimestamp)

    transfer.from = accountFrom.id
    transfer.to = accountTo.id

    transfer.gasLimit = event.transaction.gasLimit
    transfer.gasPrice = event.transaction.gasPrice

    let asset = Asset.load(event.address.toHex())

    if (asset) {
        let amountOut = getAssetAmount(
            event.transaction.hash,
            event.address,
            event.params.value,
            asset.type,
            eventTimestamp
        )

        transfer.amountOut = amountOut.id

        transfer.save()

        updateAccountAssetBalance(
            accountFrom.address.toHex(),
            event.address.toHex(),
            eventTimestamp,
            asset.type
        )

        updateAccountAssetBalance(
            accountTo.address.toHex(),
            event.address.toHex(),
            eventTimestamp,
            asset.type
        )

        const principalToken = Future.load(event.address.toHex())

        if (principalToken) {
            // Update yield on principal token transfer
            updateYield(
                Address.fromBytes(principalToken.address),
                Address.fromString(accountFrom.id),
                event.block.timestamp
            )
            updateYield(
                Address.fromBytes(principalToken.address),
                Address.fromString(accountTo.id),
                event.block.timestamp
            )
        }
    } else {
        logWarning("Transfer event call for not existing Asset {}", [
            event.address.toHex(),
        ])
    }
}
