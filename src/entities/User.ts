import { BigInt } from "@graphprotocol/graph-ts"

import { User } from "../../generated/schema"

export function getUser(userAddress: string, timestamp: BigInt): User {
    let user = User.load(userAddress)

    if (user) {
        return user
    }

    user = new User(userAddress)
    user.createdAtTimestamp = timestamp
    user.collectedFees = []

    user.save()
    return user
}
