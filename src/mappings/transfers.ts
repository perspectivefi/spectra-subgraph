import { Asset, Transfer } from "../../generated/schema"
import { Transfer as TransferEvent } from "../../generated/templates/ERC20/ERC20"
import { ZERO_ADDRESS } from "../constants"
import { getAccount } from "../entities/Account"
import {
    updateAccountAssetBalance,
    updateAccountAssetYTBalance,
} from "../entities/AccountAsset"
import { getAssetAmount } from "../entities/AssetAmount"
import { updateIBTRates } from "../entities/IBTAsset"
import { updateYieldForAll } from "../entities/Yield"
import { AssetType, logWarning } from "../utils"
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
            event.logIndex.toString(),
            eventTimestamp
        )

        transfer.amountOut = amountOut.id

        transfer.save()

        if (asset.type == AssetType.YT) {
            updateAccountAssetYTBalance(
                accountFrom.address.toHex(),
                event.address.toHex(),
                eventTimestamp,
                asset.type,
                ZERO_ADDRESS
            )

            updateAccountAssetYTBalance(
                accountTo.address.toHex(),
                event.address.toHex(),
                eventTimestamp,
                asset.type,
                ZERO_ADDRESS
            )
        } else {
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
        }

        updateYieldForAll(event.address, event.block.timestamp)
    } else {
        logWarning("Transfer event call for not existing Asset {}", [
            event.address.toHex(),
        ])
    }
}

/** @dev Handles the Transfer event for IBT tokens.
 * @param event The Transfer event.
 * @notice We use a separate function for IBT tokens because to limit the number of entities stored we won't store all IBT transfer entities. We will simply update the IBT entity to update its IBTRate.
 * @returns void
 */
export function handleIBTTransfer(event: TransferEvent): void {
    updateIBTRates(event.address, event.block.timestamp)
}
