import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"

import {
    RoleAttribution,
    RoleGranted,
    RoleRevoked,
    RoleAdminChanged,
    RoleGuardianChanged,
    RoleGrantDelayChanged,
    TargetAdminDelayUpdated,
    TargetClosed,
    TargetFunctionRoleUpdated,
    OperationScheduled,
    OperationExecuted,
    OperationCanceled,
    RoleLabel,
} from "../../generated/schema"

/**
 * Get or create RoleAttribution entity for tracking active roles
 * ID format: address-roleId
 */
export function getRoleAttribution(
    address: Address,
    roleId: BigInt,
    timestamp: BigInt
): RoleAttribution {
    let id = address.toHexString() + "-" + roleId.toString()
    let attribution = RoleAttribution.load(id)

    if (attribution) {
        return attribution
    }

    attribution = new RoleAttribution(id)
    attribution.address = address
    attribution.roleId = roleId
    attribution.since = BigInt.zero()
    attribution.currentDelay = BigInt.zero()
    attribution.pendingDelay = BigInt.zero()
    attribution.effect = BigInt.zero()
    attribution.grantedAt = timestamp
    attribution.updatedAt = timestamp

    attribution.save()
    return attribution
}

/**
 * Create RoleGranted event entity
 */
export function createRoleGrantedEvent(
    id: string,
    roleId: BigInt,
    account: Address,
    delay: BigInt,
    since: BigInt,
    newMember: boolean,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): RoleGranted {
    let event = new RoleGranted(id)
    event.roleId = roleId
    event.account = account
    event.delay = delay
    event.since = since
    event.newMember = newMember
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create RoleRevoked event entity
 */
export function createRoleRevokedEvent(
    id: string,
    roleId: BigInt,
    account: Address,
    delay: BigInt,
    since: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): RoleRevoked {
    let event = new RoleRevoked(id)
    event.roleId = roleId
    event.account = account
    event.delay = delay
    event.since = since
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create RoleAdminChanged event entity
 */
export function createRoleAdminChangedEvent(
    id: string,
    roleId: BigInt,
    admin: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): RoleAdminChanged {
    let event = new RoleAdminChanged(id)
    event.roleId = roleId
    event.admin = admin
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create RoleGuardianChanged event entity
 */
export function createRoleGuardianChangedEvent(
    id: string,
    roleId: BigInt,
    guardian: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): RoleGuardianChanged {
    let event = new RoleGuardianChanged(id)
    event.roleId = roleId
    event.guardian = guardian
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create RoleGrantDelayChanged event entity
 */
export function createRoleGrantDelayChangedEvent(
    id: string,
    roleId: BigInt,
    delay: BigInt,
    since: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): RoleGrantDelayChanged {
    let event = new RoleGrantDelayChanged(id)
    event.roleId = roleId
    event.delay = delay
    event.since = since
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create TargetAdminDelayUpdated event entity
 */
export function createTargetAdminDelayUpdatedEvent(
    id: string,
    target: Address,
    delay: BigInt,
    since: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): TargetAdminDelayUpdated {
    let event = new TargetAdminDelayUpdated(id)
    event.target = target
    event.delay = delay
    event.since = since
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create TargetClosed event entity
 */
export function createTargetClosedEvent(
    id: string,
    target: Address,
    closed: boolean,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): TargetClosed {
    let event = new TargetClosed(id)
    event.target = target
    event.closed = closed
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create TargetFunctionRoleUpdated event entity
 */
export function createTargetFunctionRoleUpdatedEvent(
    id: string,
    target: Address,
    selector: Bytes,
    roleId: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): TargetFunctionRoleUpdated {
    let event = new TargetFunctionRoleUpdated(id)
    event.target = target
    event.selector = selector
    event.roleId = roleId
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create OperationScheduled event entity
 */
export function createOperationScheduledEvent(
    id: string,
    operationId: Bytes,
    nonce: BigInt,
    schedule: BigInt,
    caller: Address,
    target: Address,
    data: Bytes,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): OperationScheduled {
    let event = new OperationScheduled(id)
    event.operationId = operationId
    event.nonce = nonce
    event.schedule = schedule
    event.caller = caller
    event.target = target
    event.data = data
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create OperationExecuted event entity
 */
export function createOperationExecutedEvent(
    id: string,
    operationId: Bytes,
    nonce: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): OperationExecuted {
    let event = new OperationExecuted(id)
    event.operationId = operationId
    event.nonce = nonce
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create OperationCanceled event entity
 */
export function createOperationCanceledEvent(
    id: string,
    operationId: Bytes,
    nonce: BigInt,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): OperationCanceled {
    let event = new OperationCanceled(id)
    event.operationId = operationId
    event.nonce = nonce
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}

/**
 * Create RoleLabel event entity
 */
export function createRoleLabelEvent(
    id: string,
    roleId: BigInt,
    label: string,
    timestamp: BigInt,
    blockNumber: BigInt,
    transactionHash: Bytes,
    logIndex: BigInt
): RoleLabel {
    let event = new RoleLabel(id)
    event.roleId = roleId
    event.label = label
    event.timestamp = timestamp
    event.blockNumber = blockNumber
    event.transactionHash = transactionHash
    event.logIndex = logIndex

    event.save()
    return event
}
