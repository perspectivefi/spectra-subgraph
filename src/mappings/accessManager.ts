import { BigInt, Bytes, store } from "@graphprotocol/graph-ts"

import {
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
} from "../../generated/AccessManager/AccessManager"
import { RoleAttribution } from "../../generated/schema"
import {
    getRoleAttribution,
    createRoleGrantedEvent,
    createRoleRevokedEvent,
    createRoleAdminChangedEvent,
    createRoleGuardianChangedEvent,
    createRoleGrantDelayChangedEvent,
    createTargetAdminDelayUpdatedEvent,
    createTargetClosedEvent,
    createTargetFunctionRoleUpdatedEvent,
    createOperationScheduledEvent,
    createOperationExecutedEvent,
    createOperationCanceledEvent,
    createRoleLabelEvent,
} from "../entities/AccessManager"

/**
 * Handle RoleGranted event
 * Creates event entity and updates/creates RoleAttribution
 */
export function handleRoleGranted(event: RoleGranted): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    // Create event entity
    createRoleGrantedEvent(
        id,
        event.params.roleId,
        event.params.account,
        event.params.delay,
        event.params.since,
        event.params.newMember,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )

    // Update or create RoleAttribution
    let attribution = getRoleAttribution(
        event.params.account,
        event.params.roleId,
        event.block.timestamp
    )

    attribution.since = event.params.since
    attribution.currentDelay = event.params.delay
    attribution.updatedAt = event.block.timestamp
    attribution.save()
}

/**
 * Handle RoleRevoked event
 * Creates event entity and removes RoleAttribution
 */
export function handleRoleRevoked(event: RoleRevoked): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    // Create event entity
    createRoleRevokedEvent(
        id,
        event.params.roleId,
        event.params.account,
        BigInt.zero(), // RoleRevoked doesn't have delay parameter
        BigInt.zero(), // RoleRevoked doesn't have since parameter
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )

    let attributionId =
        event.params.account.toHexString() +
        "-" +
        event.params.roleId.toString()
    store.remove("RoleAttribution", attributionId)
}

/**
 * Handle RoleAdminChanged event
 */
export function handleRoleAdminChanged(event: RoleAdminChanged): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createRoleAdminChangedEvent(
        id,
        event.params.roleId,
        event.params.admin,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle RoleGuardianChanged event
 */
export function handleRoleGuardianChanged(event: RoleGuardianChanged): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createRoleGuardianChangedEvent(
        id,
        event.params.roleId,
        event.params.guardian,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle RoleGrantDelayChanged event
 */
export function handleRoleGrantDelayChanged(
    event: RoleGrantDelayChanged
): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createRoleGrantDelayChangedEvent(
        id,
        event.params.roleId,
        event.params.delay,
        event.params.since,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle TargetAdminDelayUpdated event
 */
export function handleTargetAdminDelayUpdated(
    event: TargetAdminDelayUpdated
): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createTargetAdminDelayUpdatedEvent(
        id,
        event.params.target,
        event.params.delay,
        event.params.since,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle TargetClosed event
 */
export function handleTargetClosed(event: TargetClosed): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createTargetClosedEvent(
        id,
        event.params.target,
        event.params.closed,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle TargetFunctionRoleUpdated event
 */
export function handleTargetFunctionRoleUpdated(
    event: TargetFunctionRoleUpdated
): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createTargetFunctionRoleUpdatedEvent(
        id,
        event.params.target,
        event.params.selector,
        event.params.roleId,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle OperationScheduled event
 */
export function handleOperationScheduled(event: OperationScheduled): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createOperationScheduledEvent(
        id,
        event.params.operationId,
        event.params.nonce,
        event.params.schedule,
        event.params.caller,
        event.params.target,
        event.params.data,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle OperationExecuted event
 */
export function handleOperationExecuted(event: OperationExecuted): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createOperationExecutedEvent(
        id,
        event.params.operationId,
        event.params.nonce,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle OperationCanceled event
 */
export function handleOperationCanceled(event: OperationCanceled): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createOperationCanceledEvent(
        id,
        event.params.operationId,
        event.params.nonce,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}

/**
 * Handle RoleLabel event
 */
export function handleRoleLabel(event: RoleLabel): void {
    let id =
        event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

    createRoleLabelEvent(
        id,
        event.params.roleId,
        event.params.label,
        event.block.timestamp,
        event.block.number,
        event.transaction.hash,
        event.logIndex
    )
}
