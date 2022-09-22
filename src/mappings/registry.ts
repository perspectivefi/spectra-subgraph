import {
    Deposit,
    Initialized,
} from "../../generated/APWineProtocol/FutureVault"
import { RegistryUpdate } from "../../generated/APWineProtocol/Registry"
import { Test } from "../../generated/schema"
import { ethereum } from "@graphprotocol/graph-ts";

// export function handleRegistryUpdate(event: RegistryUpdate): void {
//     let newContract = new Test("elotest")
//
//     newContract.save()
// }
//
// export function handleDeposit(event: Deposit): void {
//     let newContract = new Test("elotest")
//
//     newContract.save()
// }
//
// export function handleInitialized(event: Initialized): void {
//     let newContract = new Test("elotest")
//
//     newContract.save()
// }

export function handleBlock(block: ethereum.Block): void {
    let newContract = new Test("elotest" + block.number.toString())

    newContract.save()
}