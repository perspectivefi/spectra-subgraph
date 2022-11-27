import { Address, BigInt } from "@graphprotocol/graph-ts"

import { Account } from "../../generated/schema"

export function getAccount(accountAddress: string, timestamp: BigInt): Account {
    let account = Account.load(accountAddress)

    if (account) {
        return account
    }

    account = new Account(accountAddress)
    account.address = Address.fromString(accountAddress)
    account.createdAtTimestamp = timestamp

    account.save()
    return account
}
