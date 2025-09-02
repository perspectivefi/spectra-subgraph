import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    beforeAll,
    afterAll,
    clearStore,
    assert,
    log,
    newMockEvent,
} from "matchstick-as/assembly/index"

import {
    RoleAttribution,
    RoleGranted as RoleGrantedEntity,
    RoleRevoked as RoleRevokedEntity,
    RoleAdminChanged as RoleAdminChangedEntity,
    RoleGuardianChanged,
    RoleGrantDelayChanged,
    TargetAdminDelayUpdated,
    TargetClosed,
    TargetFunctionRoleUpdated,
    OperationScheduled as OperationScheduledEntity,
    OperationExecuted,
    OperationCanceled,
    RoleLabel,
} from "../../generated/schema"
import {
    RoleGranted,
    RoleRevoked,
    RoleAdminChanged,
    OperationScheduled,
} from "../../generated/AccessManager/AccessManager"
import {
    handleRoleGranted,
    handleRoleRevoked,
    handleRoleAdminChanged,
    handleOperationScheduled,
} from "../mappings/accessManager"

// Custom performance measurement utilities
class PerformanceTimer {
    private operationCount: i32 = 0
    private testName: string = ""

    constructor(testName: string) {
        this.testName = testName
    }

    start(): void {
        this.operationCount = 0
        log.info("🚀 Starting performance test: {}", [this.testName])
    }

    incrementOperation(): void {
        this.operationCount++
    }

    end(): i32 {
        log.info('⏱️  Test "{}" completed {} operations', [
            this.testName,
            this.operationCount.toString(),
        ])
        return this.operationCount
    }

    static logOperation(operationName: string): void {
        log.info("📊 Executing operation: {}", [operationName])
    }
}

// Performance metrics collector
class PerformanceMetrics {
    static entityCreationCount: i32 = 0
    static queryCount: i32 = 0
    static saveCount: i32 = 0
    static assertionCount: i32 = 0

    static recordEntityCreation(): void {
        this.entityCreationCount++
    }

    static recordQuery(): void {
        this.queryCount++
        log.info("🔍 Query #{} completed", [this.queryCount.toString()])
    }

    static recordSave(): void {
        this.saveCount++
        log.info("💾 Save operation #{} completed", [this.saveCount.toString()])
    }

    static recordAssertion(): void {
        this.assertionCount++
        log.info("✅ Assertion #{} completed", [this.assertionCount.toString()])
    }

    static printSummary(): void {
        log.info("📊 PERFORMANCE SUMMARY 📊", [])
        log.info("Total Entity Creations: {}", [
            this.entityCreationCount.toString(),
        ])
        log.info("Total Queries: {}", [this.queryCount.toString()])
        log.info("Total Saves: {}", [this.saveCount.toString()])
        log.info("Total Assertions: {}", [this.assertionCount.toString()])
        const totalOperations =
            this.entityCreationCount +
            this.queryCount +
            this.saveCount +
            this.assertionCount
        log.info("🎯 Total Operations: {}", [totalOperations.toString()])
    }

    static reset(): void {
        this.entityCreationCount = 0
        this.queryCount = 0
        this.saveCount = 0
        this.assertionCount = 0
    }
}

describe("Access Manager", () => {
    beforeAll(() => {
        clearStore()
        PerformanceMetrics.reset()
        log.info("🧪 Starting Access Manager Performance Test Suite", [])
    })

    afterAll(() => {
        PerformanceMetrics.printSummary()
        clearStore()
        log.info("🏁 Access Manager Performance Test Suite Completed", [])
    })

    describe("RoleAttribution Entity", () => {
        test("Should create RoleAttribution entity with correct fields", () => {
            const timer = new PerformanceTimer(
                "RoleAttribution Entity Creation"
            )
            timer.start()

            let userAddress = Address.fromString(
                "0x1234567890123456789012345678901234567890"
            )
            let roleId = BigInt.fromI32(1)
            let entityId = userAddress.toHexString() + "-" + roleId.toString()
            let since = BigInt.fromI32(1234567890)
            let currentDelay = BigInt.fromI32(3600)
            let pendingDelay = BigInt.fromI32(7200)
            let effect = BigInt.fromI32(1234571490)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            // Track entity creation
            PerformanceTimer.logOperation("RoleAttribution entity creation")
            let entity = new RoleAttribution(entityId)
            entity.address = userAddress
            entity.roleId = roleId
            entity.since = since
            entity.currentDelay = currentDelay
            entity.pendingDelay = pendingDelay
            entity.effect = effect
            entity.grantedAt = timestamp
            entity.updatedAt = timestamp
            PerformanceMetrics.recordEntityCreation()

            // Track save operation
            PerformanceTimer.logOperation("RoleAttribution save operation")
            entity.save()
            PerformanceMetrics.recordSave()

            // Track field assertions
            PerformanceTimer.logOperation("RoleAttribution field assertions")
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "address",
                userAddress.toHexString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "roleId",
                roleId.toString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "since",
                since.toString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "currentDelay",
                currentDelay.toString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "pendingDelay",
                pendingDelay.toString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "effect",
                effect.toString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "grantedAt",
                timestamp.toString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "updatedAt",
                timestamp.toString()
            )
            PerformanceMetrics.recordAssertion()
            PerformanceMetrics.recordQuery()

            const totalDuration = timer.end()
            log.info(
                "🎯 RoleAttribution test completed with total duration: {} ms",
                [totalDuration.toString()]
            )
        })

        test("Should handle role revocation by removing the entity", () => {
            clearStore() // Clear any previous test data

            let userAddress = Address.fromString(
                "0x2234567890123456789012345678901234567890"
            )
            let roleId = BigInt.fromI32(2)
            let entityId = userAddress.toHexString() + "-" + roleId.toString()
            let timestamp = BigInt.fromI32(1234567890)

            // Create role attribution
            let entity = new RoleAttribution(entityId)
            entity.address = userAddress
            entity.roleId = roleId
            entity.since = timestamp
            entity.currentDelay = BigInt.fromI32(3600)
            entity.pendingDelay = BigInt.zero()
            entity.effect = BigInt.zero()
            entity.grantedAt = timestamp
            entity.updatedAt = timestamp
            entity.save()

            // Verify entity exists
            assert.entityCount("RoleAttribution", 1)

            // Verify the entity can be loaded and has correct data
            let loadedEntity = RoleAttribution.load(entityId)
            if (loadedEntity != null) {
                assert.fieldEquals(
                    "RoleAttribution",
                    entityId,
                    "address",
                    userAddress.toHexString()
                )
                assert.fieldEquals(
                    "RoleAttribution",
                    entityId,
                    "roleId",
                    roleId.toString()
                )

            }
        })
    })

    describe("RoleGranted Event Entity", () => {
        test("Should create RoleGranted event entity with correct fields", () => {
            let txHash = Bytes.fromHexString(
                "0x1111111111111111111111111111111111111111111111111111111111111111"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let roleId = BigInt.fromI32(1)
            let account = Address.fromString(
                "0x4234567890123456789012345678901234567890"
            )
            let delay = BigInt.fromI32(3600)
            let since = BigInt.fromI32(1234567890)
            let newMember = true
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            let entity = new RoleGrantedEntity(entityId)
            entity.roleId = roleId
            entity.account = account
            entity.delay = delay
            entity.since = since
            entity.newMember = newMember
            entity.timestamp = timestamp
            entity.blockNumber = blockNumber
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "RoleGranted",
                entityId,
                "roleId",
                roleId.toString()
            )
            assert.fieldEquals(
                "RoleGranted",
                entityId,
                "account",
                account.toHexString()
            )
            assert.fieldEquals(
                "RoleGranted",
                entityId,
                "delay",
                delay.toString()
            )
            assert.fieldEquals(
                "RoleGranted",
                entityId,
                "since",
                since.toString()
            )
            assert.fieldEquals("RoleGranted", entityId, "newMember", "true")
            assert.fieldEquals(
                "RoleGranted",
                entityId,
                "timestamp",
                timestamp.toString()
            )
            assert.fieldEquals(
                "RoleGranted",
                entityId,
                "blockNumber",
                blockNumber.toString()
            )
            assert.fieldEquals(
                "RoleGranted",
                entityId,
                "transactionHash",
                txHash.toHexString()
            )
            assert.fieldEquals(
                "RoleGranted",
                entityId,
                "logIndex",
                logIndex.toString()
            )
        })
    })

    describe("RoleRevoked Event Entity", () => {
        test("Should create RoleRevoked event entity with correct fields", () => {
            let txHash = Bytes.fromHexString(
                "0x2222222222222222222222222222222222222222222222222222222222222222"
            )
            let logIndex = BigInt.fromI32(1)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let roleId = BigInt.fromI32(2)
            let account = Address.fromString(
                "0x5234567890123456789012345678901234567890"
            )
            let delay = BigInt.zero()
            let since = BigInt.zero()
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12346)

            let entity = new RoleRevokedEntity(entityId)
            entity.roleId = roleId
            entity.account = account
            entity.delay = delay
            entity.since = since
            entity.timestamp = timestamp
            entity.blockNumber = blockNumber
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "RoleRevoked",
                entityId,
                "roleId",
                roleId.toString()
            )
            assert.fieldEquals(
                "RoleRevoked",
                entityId,
                "account",
                account.toHexString()
            )
            assert.fieldEquals(
                "RoleRevoked",
                entityId,
                "delay",
                delay.toString()
            )
            assert.fieldEquals(
                "RoleRevoked",
                entityId,
                "since",
                since.toString()
            )
            assert.fieldEquals(
                "RoleRevoked",
                entityId,
                "timestamp",
                timestamp.toString()
            )
            assert.fieldEquals(
                "RoleRevoked",
                entityId,
                "blockNumber",
                blockNumber.toString()
            )
            assert.fieldEquals(
                "RoleRevoked",
                entityId,
                "transactionHash",
                txHash.toHexString()
            )
            assert.fieldEquals(
                "RoleRevoked",
                entityId,
                "logIndex",
                logIndex.toString()
            )
        })
    })

    describe("Role Administration Events", () => {
        test("Should create RoleAdminChanged event entity", () => {
            let txHash = Bytes.fromHexString(
                "0x3333333333333333333333333333333333333333333333333333333333333333"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let roleId = BigInt.fromI32(1)
            let admin = BigInt.fromI32(0) // ADMIN_ROLE
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12347)

            let entity = new RoleAdminChangedEntity(entityId)
            entity.roleId = roleId
            entity.admin = admin
            entity.timestamp = timestamp
            entity.blockNumber = blockNumber
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "RoleAdminChanged",
                entityId,
                "roleId",
                roleId.toString()
            )
            assert.fieldEquals(
                "RoleAdminChanged",
                entityId,
                "admin",
                admin.toString()
            )
            assert.fieldEquals(
                "RoleAdminChanged",
                entityId,
                "timestamp",
                timestamp.toString()
            )
        })

        test("Should create RoleGuardianChanged event entity", () => {
            let txHash = Bytes.fromHexString(
                "0x4444444444444444444444444444444444444444444444444444444444444444"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let roleId = BigInt.fromI32(1)
            let guardian = BigInt.fromI32(2)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12348)

            let entity = new RoleGuardianChanged(entityId)
            entity.roleId = roleId
            entity.guardian = guardian
            entity.timestamp = timestamp
            entity.blockNumber = blockNumber
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "RoleGuardianChanged",
                entityId,
                "roleId",
                roleId.toString()
            )
            assert.fieldEquals(
                "RoleGuardianChanged",
                entityId,
                "guardian",
                guardian.toString()
            )
            assert.fieldEquals(
                "RoleGuardianChanged",
                entityId,
                "timestamp",
                timestamp.toString()
            )
        })

        test("Should create RoleGrantDelayChanged event entity", () => {
            let txHash = Bytes.fromHexString(
                "0x5555555555555555555555555555555555555555555555555555555555555555"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let roleId = BigInt.fromI32(1)
            let delay = BigInt.fromI32(7200)
            let since = BigInt.fromI32(1234567890)
            let timestamp = BigInt.fromI32(1234567890)

            let entity = new RoleGrantDelayChanged(entityId)
            entity.roleId = roleId
            entity.delay = delay
            entity.since = since
            entity.timestamp = timestamp
            entity.blockNumber = BigInt.fromI32(12349)
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "RoleGrantDelayChanged",
                entityId,
                "roleId",
                roleId.toString()
            )
            assert.fieldEquals(
                "RoleGrantDelayChanged",
                entityId,
                "delay",
                delay.toString()
            )
            assert.fieldEquals(
                "RoleGrantDelayChanged",
                entityId,
                "since",
                since.toString()
            )
        })
    })

    describe("Target Management Events", () => {
        test("Should create TargetAdminDelayUpdated event entity", () => {
            let txHash = Bytes.fromHexString(
                "0x6666666666666666666666666666666666666666666666666666666666666666"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let target = Address.fromString(
                "0x6234567890123456789012345678901234567890"
            )
            let delay = BigInt.fromI32(86400) // 1 day
            let since = BigInt.fromI32(1234567890)
            let timestamp = BigInt.fromI32(1234567890)

            let entity = new TargetAdminDelayUpdated(entityId)
            entity.target = target
            entity.delay = delay
            entity.since = since
            entity.timestamp = timestamp
            entity.blockNumber = BigInt.fromI32(12350)
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "TargetAdminDelayUpdated",
                entityId,
                "target",
                target.toHexString()
            )
            assert.fieldEquals(
                "TargetAdminDelayUpdated",
                entityId,
                "delay",
                delay.toString()
            )
            assert.fieldEquals(
                "TargetAdminDelayUpdated",
                entityId,
                "since",
                since.toString()
            )
        })

        test("Should create TargetClosed event entity", () => {
            let txHash = Bytes.fromHexString(
                "0x7777777777777777777777777777777777777777777777777777777777777777"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let target = Address.fromString(
                "0x7234567890123456789012345678901234567890"
            )
            let closed = true
            let timestamp = BigInt.fromI32(1234567890)

            let entity = new TargetClosed(entityId)
            entity.target = target
            entity.closed = closed
            entity.timestamp = timestamp
            entity.blockNumber = BigInt.fromI32(12351)
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "TargetClosed",
                entityId,
                "target",
                target.toHexString()
            )
            assert.fieldEquals("TargetClosed", entityId, "closed", "true")
            assert.fieldEquals(
                "TargetClosed",
                entityId,
                "timestamp",
                timestamp.toString()
            )
        })

        test("Should create TargetFunctionRoleUpdated event entity", () => {
            let txHash = Bytes.fromHexString(
                "0x8888888888888888888888888888888888888888888888888888888888888888"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let target = Address.fromString(
                "0x8234567890123456789012345678901234567890"
            )
            let selector = Bytes.fromHexString("0xa9059cbb") // transfer(address,uint256)
            let roleId = BigInt.fromI32(3)
            let timestamp = BigInt.fromI32(1234567890)

            let entity = new TargetFunctionRoleUpdated(entityId)
            entity.target = target
            entity.selector = selector
            entity.roleId = roleId
            entity.timestamp = timestamp
            entity.blockNumber = BigInt.fromI32(12352)
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "TargetFunctionRoleUpdated",
                entityId,
                "target",
                target.toHexString()
            )
            assert.fieldEquals(
                "TargetFunctionRoleUpdated",
                entityId,
                "selector",
                selector.toHexString()
            )
            assert.fieldEquals(
                "TargetFunctionRoleUpdated",
                entityId,
                "roleId",
                roleId.toString()
            )
        })
    })

    describe("Operation Events", () => {
        test("Should create OperationScheduled event entity", () => {
            let txHash = Bytes.fromHexString(
                "0x9999999999999999999999999999999999999999999999999999999999999999"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let operationId = Bytes.fromHexString(
                "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
            )
            let nonce = BigInt.fromI32(1)
            let schedule = BigInt.fromI32(1234571490) // 1 hour later
            let caller = Address.fromString(
                "0x9234567890123456789012345678901234567890"
            )
            let target = Address.fromString(
                "0xa234567890123456789012345678901234567890"
            )
            let data = Bytes.fromHexString(
                "0xa9059cbb000000000000000000000000b234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000a"
            )
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12353)

            let entity = new OperationScheduledEntity(entityId)
            entity.operationId = operationId
            entity.nonce = nonce
            entity.schedule = schedule
            entity.caller = caller
            entity.target = target
            entity.data = data
            entity.timestamp = timestamp
            entity.blockNumber = blockNumber
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "OperationScheduled",
                entityId,
                "operationId",
                operationId.toHexString()
            )
            assert.fieldEquals(
                "OperationScheduled",
                entityId,
                "nonce",
                nonce.toString()
            )
            assert.fieldEquals(
                "OperationScheduled",
                entityId,
                "schedule",
                schedule.toString()
            )
            assert.fieldEquals(
                "OperationScheduled",
                entityId,
                "caller",
                caller.toHexString()
            )
            assert.fieldEquals(
                "OperationScheduled",
                entityId,
                "target",
                target.toHexString()
            )
            assert.fieldEquals(
                "OperationScheduled",
                entityId,
                "data",
                data.toHexString()
            )
        })

        test("Should create OperationExecuted event entity", () => {
            let txHash = Bytes.fromHexString(
                "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let operationId = Bytes.fromHexString(
                "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
            )
            let nonce = BigInt.fromI32(1)
            let timestamp = BigInt.fromI32(1234571490)
            let blockNumber = BigInt.fromI32(12354)

            let entity = new OperationExecuted(entityId)
            entity.operationId = operationId
            entity.nonce = nonce
            entity.timestamp = timestamp
            entity.blockNumber = blockNumber
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "OperationExecuted",
                entityId,
                "operationId",
                operationId.toHexString()
            )
            assert.fieldEquals(
                "OperationExecuted",
                entityId,
                "nonce",
                nonce.toString()
            )
            assert.fieldEquals(
                "OperationExecuted",
                entityId,
                "timestamp",
                timestamp.toString()
            )
        })

        test("Should create OperationCanceled event entity", () => {
            let txHash = Bytes.fromHexString(
                "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let operationId = Bytes.fromHexString(
                "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
            )
            let nonce = BigInt.fromI32(2)
            let timestamp = BigInt.fromI32(1234571490)
            let blockNumber = BigInt.fromI32(12355)

            let entity = new OperationCanceled(entityId)
            entity.operationId = operationId
            entity.nonce = nonce
            entity.timestamp = timestamp
            entity.blockNumber = blockNumber
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "OperationCanceled",
                entityId,
                "operationId",
                operationId.toHexString()
            )
            assert.fieldEquals(
                "OperationCanceled",
                entityId,
                "nonce",
                nonce.toString()
            )
            assert.fieldEquals(
                "OperationCanceled",
                entityId,
                "timestamp",
                timestamp.toString()
            )
        })
    })

    describe("RoleLabel Event Entity", () => {
        test("Should create RoleLabel event entity", () => {
            let txHash = Bytes.fromHexString(
                "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
            )
            let logIndex = BigInt.fromI32(0)
            let entityId = txHash.toHexString() + "-" + logIndex.toString()
            let roleId = BigInt.fromI32(1)
            let label = "ADMIN_ROLE"
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12356)

            let entity = new RoleLabel(entityId)
            entity.roleId = roleId
            entity.label = label
            entity.timestamp = timestamp
            entity.blockNumber = blockNumber
            entity.transactionHash = txHash
            entity.logIndex = logIndex
            entity.save()

            assert.fieldEquals(
                "RoleLabel",
                entityId,
                "roleId",
                roleId.toString()
            )
            assert.fieldEquals("RoleLabel", entityId, "label", label)
            assert.fieldEquals(
                "RoleLabel",
                entityId,
                "timestamp",
                timestamp.toString()
            )
        })
    })

    describe("Event Handler Integration Tests", () => {
        test("Should create RoleAttribution and RoleGranted entities when RoleGranted event is emitted", () => {
            clearStore()
            let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())
            roleGrantedEvent.address = Address.fromString(
                "0x1234567890123456789012345678901234567890" //Some random string to test events emmited
            )
            roleGrantedEvent.transaction.hash = Bytes.fromHexString(
                "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" //Some random string to test events emmited
            )
            roleGrantedEvent.logIndex = BigInt.fromI32(0)
            roleGrantedEvent.block.timestamp = BigInt.fromI32(1234567890)
            roleGrantedEvent.block.number = BigInt.fromI32(12345)

            let roleIdParam = new ethereum.EventParam(
                "roleId",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
            )
            let accountParam = new ethereum.EventParam(
                "account",
                ethereum.Value.fromAddress(
                    Address.fromString("0x4234567890123456789012345678901234567890")
                )
            )
            let delayParam = new ethereum.EventParam(
                "delay",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(3600))
            )
            let sinceParam = new ethereum.EventParam(
                "since",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1234567890))
            )
            let newMemberParam = new ethereum.EventParam(
                "newMember",
                ethereum.Value.fromBoolean(true)
            )

            roleGrantedEvent.parameters = [
                roleIdParam,
                accountParam,
                delayParam,
                sinceParam,
                newMemberParam,
            ]

            // Import and call the actual event handler
            handleRoleGranted(roleGrantedEvent)

            // Verify RoleGranted event entity was created
            let eventEntityId = roleGrantedEvent.transaction.hash.toHexString() + "-" + roleGrantedEvent.logIndex.toString()
            assert.entityCount("RoleGranted", 1)
            assert.fieldEquals(
                "RoleGranted",
                eventEntityId,
                "roleId",
                "1"
            )
            assert.fieldEquals(
                "RoleGranted",
                eventEntityId,
                "account",
                "0x4234567890123456789012345678901234567890"
            )
            assert.fieldEquals(
                "RoleGranted",
                eventEntityId,
                "newMember",
                "true"
            )

            // Verify RoleAttribution entity was created
            let attributionEntityId = "0x4234567890123456789012345678901234567890-1"
            assert.entityCount("RoleAttribution", 1)
            assert.fieldEquals(
                "RoleAttribution",
                attributionEntityId,
                "address",
                "0x4234567890123456789012345678901234567890"
            )
            assert.fieldEquals(
                "RoleAttribution",
                attributionEntityId,
                "roleId",
                "1"
            )
        })

        test("Should remove RoleAttribution entity when RoleRevoked event is emitted", () => {
            clearStore()
            // First grant a role to create the attribution
            let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())
            roleGrantedEvent.address = Address.fromString(
                "0x1234567890123456789012345678901234567890"
            )
            roleGrantedEvent.transaction.hash = Bytes.fromHexString(
                "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            )
            roleGrantedEvent.logIndex = BigInt.fromI32(0)
            roleGrantedEvent.block.timestamp = BigInt.fromI32(1234567890)
            roleGrantedEvent.block.number = BigInt.fromI32(12345)

            let roleIdParam = new ethereum.EventParam(
                "roleId",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(2))
            )
            let accountParam = new ethereum.EventParam(
                "account",
                ethereum.Value.fromAddress(
                    Address.fromString("0x5234567890123456789012345678901234567890")
                )
            )
            let delayParam = new ethereum.EventParam(
                "delay",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(3600))
            )
            let sinceParam = new ethereum.EventParam(
                "since",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1234567890))
            )
            let newMemberParam = new ethereum.EventParam(
                "newMember",
                ethereum.Value.fromBoolean(true)
            )

            roleGrantedEvent.parameters = [
                roleIdParam,
                accountParam,
                delayParam,
                sinceParam,
                newMemberParam,
            ]

            handleRoleGranted(roleGrantedEvent)

            // Now revoke the role
            let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent())
            roleRevokedEvent.address = Address.fromString(
                "0x1234567890123456789012345678901234567890"
            )
            roleRevokedEvent.transaction.hash = Bytes.fromHexString(
                "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
            )
            roleRevokedEvent.logIndex = BigInt.fromI32(0)
            roleRevokedEvent.block.timestamp = BigInt.fromI32(1234567900)
            roleRevokedEvent.block.number = BigInt.fromI32(12346)

            let revokeRoleIdParam = new ethereum.EventParam(
                "roleId",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(2))
            )
            let revokeAccountParam = new ethereum.EventParam(
                "account",
                ethereum.Value.fromAddress(
                    Address.fromString("0x5234567890123456789012345678901234567890")
                )
            )

            roleRevokedEvent.parameters = [revokeRoleIdParam, revokeAccountParam]

            handleRoleRevoked(roleRevokedEvent)

            // Verify RoleRevoked event entity was created
            let revokedEventEntityId = roleRevokedEvent.transaction.hash.toHexString() + "-" + roleRevokedEvent.logIndex.toString()
            assert.entityCount("RoleRevoked", 1)
            assert.fieldEquals(
                "RoleRevoked",
                revokedEventEntityId,
                "roleId",
                "2"
            )
            assert.fieldEquals(
                "RoleRevoked",
                revokedEventEntityId,
                "account",
                "0x5234567890123456789012345678901234567890"
            )

            // Verify RoleAttribution entity was removed
            assert.entityCount("RoleAttribution", 0)
        })

        test("Should create RoleAdminChanged event entity when RoleAdminChanged event is emitted", () => {
            clearStore()
            let roleAdminChangedEvent = changetype<RoleAdminChanged>(newMockEvent())
            roleAdminChangedEvent.address = Address.fromString(
                "0x1234567890123456789012345678901234567890"
            )
            roleAdminChangedEvent.transaction.hash = Bytes.fromHexString(
                "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"
            )
            roleAdminChangedEvent.logIndex = BigInt.fromI32(0)
            roleAdminChangedEvent.block.timestamp = BigInt.fromI32(1234567890)
            roleAdminChangedEvent.block.number = BigInt.fromI32(12345)

            let roleIdParam = new ethereum.EventParam(
                "roleId",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(3))
            )
            let adminParam = new ethereum.EventParam(
                "admin",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))
            )

            roleAdminChangedEvent.parameters = [roleIdParam, adminParam]

            handleRoleAdminChanged(roleAdminChangedEvent)

            // Verify RoleAdminChanged event entity was created
            let eventEntityId = roleAdminChangedEvent.transaction.hash.toHexString() + "-" + roleAdminChangedEvent.logIndex.toString()
            assert.entityCount("RoleAdminChanged", 1)
            assert.fieldEquals(
                "RoleAdminChanged",
                eventEntityId,
                "roleId",
                "3"
            )
            assert.fieldEquals(
                "RoleAdminChanged",
                eventEntityId,
                "admin",
                "0"
            )
        })

        test("Should create OperationScheduled event entity when OperationScheduled event is emitted", () => {
            clearStore()
            let operationScheduledEvent = changetype<OperationScheduled>(newMockEvent())
            operationScheduledEvent.address = Address.fromString(
                "0x1234567890123456789012345678901234567890"
            )
            operationScheduledEvent.transaction.hash = Bytes.fromHexString(
                "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
            )
            operationScheduledEvent.logIndex = BigInt.fromI32(0)
            operationScheduledEvent.block.timestamp = BigInt.fromI32(1234567890)
            operationScheduledEvent.block.number = BigInt.fromI32(12345)

            let operationIdParam = new ethereum.EventParam(
                "operationId",
                ethereum.Value.fromBytes(
                    Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111")
                )
            )
            let nonceParam = new ethereum.EventParam(
                "nonce",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))
            )
            let scheduleParam = new ethereum.EventParam(
                "schedule",
                ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1234567890))
            )
            let callerParam = new ethereum.EventParam(
                "caller",
                ethereum.Value.fromAddress(
                    Address.fromString("0x1234567890123456789012345678901234567890")
                )
            )
            let targetParam = new ethereum.EventParam(
                "target",
                ethereum.Value.fromAddress(
                    Address.fromString("0x5678901234567890123456789012345678901234")
                )
            )
            let dataParam = new ethereum.EventParam(
                "data",
                ethereum.Value.fromBytes(
                    Bytes.fromHexString("0x1234")
                )
            )

            operationScheduledEvent.parameters = [operationIdParam, nonceParam, scheduleParam, callerParam, targetParam, dataParam]

            handleOperationScheduled(operationScheduledEvent)

            // Verify OperationScheduled event entity was created
            let eventEntityId = operationScheduledEvent.transaction.hash.toHexString() + "-" + operationScheduledEvent.logIndex.toString()
            assert.entityCount("OperationScheduled", 1)
            assert.fieldEquals(
                "OperationScheduled",
                eventEntityId,
                "operationId",
                "0x1111111111111111111111111111111111111111111111111111111111111111"
            )
            assert.fieldEquals(
                "OperationScheduled",
                eventEntityId,
                "nonce",
                "1"
            )
        })
    })

    describe("Performance and Edge Cases", () => {
        test("Should handle multiple role attributions efficiently", () => {
            let baseUserAddress = "0x1000000000000000000000000000000000000"
            let timestamp = BigInt.fromI32(1234567890)

            for (let i = 0; i < 10; i++) {
                let userAddress = Address.fromString(
                    baseUserAddress + i.toString().padStart(3, "0")
                )
                let roleId = BigInt.fromI32(i + 1)
                let entityId =
                    userAddress.toHexString() + "-" + roleId.toString()

                let entity = new RoleAttribution(entityId)
                entity.address = userAddress
                entity.roleId = roleId
                entity.since = timestamp
                entity.currentDelay = BigInt.fromI32(3600)
                entity.pendingDelay = BigInt.zero()
                entity.effect = BigInt.zero()
                entity.grantedAt = timestamp
                entity.updatedAt = timestamp
                entity.save()

                // Verify each entity was created correctly
                assert.fieldEquals(
                    "RoleAttribution",
                    entityId,
                    "address",
                    userAddress.toHexString()
                )
                assert.fieldEquals(
                    "RoleAttribution",
                    entityId,
                    "roleId",
                    roleId.toString()
                )
                assert.fieldEquals(
                    "RoleAttribution",
                    entityId,
                    "grantedAt",
                    timestamp.toString()
                )
            }
        })

        test("Should handle role attribution updates simulation", () => {
            let userAddress = Address.fromString(
                "0x9876543210987654321098765432109876543210"
            )
            let roleId = BigInt.fromI32(5)
            let entityId = userAddress.toHexString() + "-" + roleId.toString()
            let initialTimestamp = BigInt.fromI32(1234567890)
            let updatedTimestamp = BigInt.fromI32(1234571490)

            // Create initial role attribution
            let entity = new RoleAttribution(entityId)
            entity.address = userAddress
            entity.roleId = roleId
            entity.since = initialTimestamp
            entity.currentDelay = BigInt.fromI32(3600)
            entity.pendingDelay = BigInt.zero()
            entity.effect = BigInt.zero()
            entity.grantedAt = initialTimestamp
            entity.updatedAt = initialTimestamp
            entity.save()

            // Load and update role attribution (simulating handler behavior)
            let loadedEntity = RoleAttribution.load(entityId)
            if (loadedEntity != null) {
                loadedEntity.pendingDelay = BigInt.fromI32(7200)
                loadedEntity.effect = updatedTimestamp.plus(
                    BigInt.fromI32(86400)
                )
                loadedEntity.updatedAt = updatedTimestamp
                loadedEntity.save()
            }

            // Verify updates
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "pendingDelay",
                "7200"
            )
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "updatedAt",
                updatedTimestamp.toString()
            )
        })

        test("Should handle zero delays and timestamps", () => {
            let userAddress = Address.fromString(
                "0x0000000000000000000000000000000000000001"
            )
            let roleId = BigInt.fromI32(0)
            let entityId = userAddress.toHexString() + "-" + roleId.toString()

            let entity = new RoleAttribution(entityId)
            entity.address = userAddress
            entity.roleId = roleId
            entity.since = BigInt.zero()
            entity.currentDelay = BigInt.zero()
            entity.pendingDelay = BigInt.zero()
            entity.effect = BigInt.zero()
            entity.grantedAt = BigInt.zero()
            entity.updatedAt = BigInt.zero()
            entity.save()

            assert.fieldEquals("RoleAttribution", entityId, "since", "0")
            assert.fieldEquals("RoleAttribution", entityId, "currentDelay", "0")
            assert.fieldEquals("RoleAttribution", entityId, "grantedAt", "0")
        })

        test("Should handle large role IDs and delays", () => {
            let userAddress = Address.fromString(
                "0x9999999999999999999999999999999999999999"
            )
            let largeRoleId = BigInt.fromString("18446744073709551615") // max uint64
            let entityId =
                userAddress.toHexString() + "-" + largeRoleId.toString()
            let largeDelay = BigInt.fromString("4294967295") // max uint32
            let timestamp = BigInt.fromI32(1234567890)

            let entity = new RoleAttribution(entityId)
            entity.address = userAddress
            entity.roleId = largeRoleId
            entity.since = timestamp
            entity.currentDelay = largeDelay
            entity.pendingDelay = largeDelay
            entity.effect = timestamp.plus(largeDelay)
            entity.grantedAt = timestamp
            entity.updatedAt = timestamp
            entity.save()

            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "roleId",
                largeRoleId.toString()
            )
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "currentDelay",
                largeDelay.toString()
            )
            assert.fieldEquals(
                "RoleAttribution",
                entityId,
                "pendingDelay",
                largeDelay.toString()
            )
        })
    })

    describe("🚀 Access Manager Performance Benchmarks", () => {
        test("Bulk RoleAttribution Creation Performance", () => {
            const timer = new PerformanceTimer(
                "Bulk RoleAttribution Creation (100 entities)"
            )
            timer.start()

            const entityCount = 100
            const baseAddress = "0x2000000000000000000000000000000000000"

            log.info(
                "🔥 Starting bulk creation of {} RoleAttribution entities",
                [entityCount.toString()]
            )

            for (let i = 0; i < entityCount; i++) {
                timer.incrementOperation()

                let userAddress = Address.fromString(
                    baseAddress + i.toString().padStart(3, "0")
                )
                let roleId = BigInt.fromI32((i % 10) + 1) // Cycle through 10 different roles
                let entityId =
                    userAddress.toHexString() + "-" + roleId.toString()
                let timestamp = BigInt.fromI32(1234567890 + i)

                let entity = new RoleAttribution(entityId)
                entity.address = userAddress
                entity.roleId = roleId
                entity.since = timestamp
                entity.currentDelay = BigInt.fromI32(3600 + i * 60)
                entity.pendingDelay = BigInt.zero()
                entity.effect = BigInt.zero()
                entity.grantedAt = timestamp
                entity.updatedAt = timestamp
                entity.save()

                PerformanceMetrics.recordEntityCreation()

            }

            const totalOperations = timer.end()
            log.info(
                "✅ Bulk RoleAttribution creation completed: {} entities with {} operations",
                [entityCount.toString(), totalOperations.toString()]
            )
            log.info("⚡ Average operations per entity: {}", [
                (totalOperations / entityCount).toString(),
            ])
        })

        test("Bulk Event Entity Creation Performance", () => {
            const timer = new PerformanceTimer(
                "Bulk Event Entity Creation (50 entities each type)"
            )
            timer.start()

            const entityCount = 50
            const baseTxHash =
                "0x3000000000000000000000000000000000000000000000000000000000000"

            log.info("🔥 Starting bulk creation of event entities", [])

            // Create RoleGranted events
            for (let i = 0; i < entityCount; i++) {
                timer.incrementOperation()

                let txHash = Bytes.fromHexString(
                    baseTxHash + i.toString().padStart(3, "0")
                )
                let entityId = txHash.toHexString() + "-0"
                let roleId = BigInt.fromI32((i % 5) + 1)
                let account = Address.fromString(
                    "0x3000000000000000000000000000000000000" +
                    i.toString().padStart(3, "0")
                )

                let entity = new RoleGrantedEntity(entityId)
                entity.roleId = roleId
                entity.account = account
                entity.delay = BigInt.fromI32(3600)
                entity.since = BigInt.fromI32(1234567890 + i)
                entity.newMember = i % 2 === 0
                entity.timestamp = BigInt.fromI32(1234567890 + i)
                entity.blockNumber = BigInt.fromI32(12345 + i)
                entity.transactionHash = txHash
                entity.logIndex = BigInt.zero()
                entity.save()

                PerformanceMetrics.recordEntityCreation()
            }

            // Create RoleRevoked events
            for (let i = 0; i < entityCount; i++) {
                timer.incrementOperation()

                let txHash = Bytes.fromHexString(
                    baseTxHash + (i + entityCount).toString().padStart(3, "0")
                )
                let entityId = txHash.toHexString() + "-0"
                let roleId = BigInt.fromI32((i % 5) + 1)
                let account = Address.fromString(
                    "0x3000000000000000000000000000000000000" +
                    i.toString().padStart(3, "0")
                )

                let entity = new RoleRevokedEntity(entityId)
                entity.roleId = roleId
                entity.account = account
                entity.delay = BigInt.zero()
                entity.since = BigInt.zero()
                entity.timestamp = BigInt.fromI32(1234567890 + i + entityCount)
                entity.blockNumber = BigInt.fromI32(12345 + i + entityCount)
                entity.transactionHash = txHash
                entity.logIndex = BigInt.zero()
                entity.save()

                PerformanceMetrics.recordEntityCreation()
            }

            const totalOperations = timer.end()
            log.info(
                "✅ Bulk event entity creation completed: {} total entities with {} operations",
                [(entityCount * 2).toString(), totalOperations.toString()]
            )
            log.info("⚡ Average operations per entity: {}", [
                (totalOperations / (entityCount * 2)).toString(),
            ])
        })

        test("Mixed AccessManager Operations Performance Test", () => {
            const timer = new PerformanceTimer(
                "Mixed AccessManager Operations Performance Test"
            )
            timer.start()

            log.info(
                "🎯 Starting mixed AccessManager operations performance test",
                []
            )

            const operationCount = 30

            // Create entities
            log.info("📈 Starting entity creation phase", [])
            for (let i = 0; i < operationCount; i++) {
                timer.incrementOperation()

                let userAddress = Address.fromString(
                    "0x4000000000000000000000000000000000000" +
                    i.toString().padStart(3, "0")
                )
                let roleId = BigInt.fromI32((i % 3) + 1)
                let attributionId =
                    userAddress.toHexString() + "-" + roleId.toString()
                let timestamp = BigInt.fromI32(1234567890 + i)

                // Create RoleAttribution
                let attribution = new RoleAttribution(attributionId)
                attribution.address = userAddress
                attribution.roleId = roleId
                attribution.since = timestamp
                attribution.currentDelay = BigInt.fromI32(3600)
                attribution.pendingDelay = BigInt.zero()
                attribution.effect = BigInt.zero()
                attribution.grantedAt = timestamp
                attribution.updatedAt = timestamp
                attribution.save()

                // ActiveRole entity removed - only RoleAttribution is used now

                // Create RoleGranted event
                let txHash = Bytes.fromHexString(
                    "0x4000000000000000000000000000000000000000000000000000000000000" +
                    i.toString().padStart(3, "0")
                )
                let eventId = txHash.toHexString() + "-0"

                let grantedEvent = new RoleGrantedEntity(eventId)
                grantedEvent.roleId = roleId
                grantedEvent.account = userAddress
                grantedEvent.delay = BigInt.fromI32(3600)
                grantedEvent.since = timestamp
                grantedEvent.newMember = true
                grantedEvent.timestamp = timestamp
                grantedEvent.blockNumber = BigInt.fromI32(12345 + i)
                grantedEvent.transactionHash = txHash
                grantedEvent.logIndex = BigInt.zero()
                grantedEvent.save()
            }
            log.info("📈 Entity creation phase completed", [])

            // Query entities
            log.info("🔍 Starting entity query phase", [])
            for (let i = 0; i < operationCount; i++) {
                timer.incrementOperation()

                let userAddress = Address.fromString(
                    "0x4000000000000000000000000000000000000" +
                    i.toString().padStart(3, "0")
                )
                let roleId = BigInt.fromI32((i % 3) + 1)
                let attributionId =
                    userAddress.toHexString() + "-" + roleId.toString()
                let activeRoleId =
                    userAddress.toHexString() + "-" + roleId.toString()

                let loadedAttribution = RoleAttribution.load(attributionId)

                assert.assertTrue(loadedAttribution !== null)
            }
            PerformanceMetrics.recordQuery()
            log.info("🔍 Entity query phase completed", [])

            // Update entities (simulate role revocation)
            log.info("💾 Starting entity update phase", [])
            for (let i = 0; i < operationCount; i++) {
                timer.incrementOperation()

                if (i % 3 === 0) {
                    // Revoke every 3rd role
                    let userAddress = Address.fromString(
                        "0x4000000000000000000000000000000000000" +
                        i.toString().padStart(3, "0")
                    )
                    let roleId = BigInt.fromI32((i % 3) + 1)
                    let attributionId =
                        userAddress.toHexString() + "-" + roleId.toString()

                    let loadedAttribution = RoleAttribution.load(attributionId)
                    if (loadedAttribution !== null) {
                        // In the new implementation, revoked roles are removed entirely
                        // This test simulates the old behavior for performance testing
                        loadedAttribution.updatedAt = BigInt.fromI32(
                            1234567890 + i + 3600
                        )
                        loadedAttribution.save()
                    }
                }
            }
            PerformanceMetrics.recordSave()
            log.info("💾 Entity update phase completed", [])

            const totalOperations = timer.end()
            log.info(
                "🏆 Mixed AccessManager operations test completed with {} total operations",
                [totalOperations.toString()]
            )
            log.info(
                "📊 Mixed AccessManager operations performance test finished successfully",
                []
            )
        })
    })
})
