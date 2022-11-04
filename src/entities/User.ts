import { Address, BigInt } from "@graphprotocol/graph-ts"

import { User } from "../../generated/schema"

export function getUser(userAddress: string, timestamp: BigInt): User {
    let user = User.load(userAddress)

    if (user) {
        return user
    }

    user = new User(userAddress)
    user.address = Address.fromString(userAddress)
    user.createdAtTimestamp = timestamp

    user.save()
    return user
}
