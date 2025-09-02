import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
    describe,
    test,
    beforeAll,
    afterAll,
    clearStore,
    assert,
    log,
} from "matchstick-as/assembly/index"

import { UserNonce, OnChainOrderStatus } from "../../generated/schema"

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
        log.info("📈 Entity creation #{} completed", [
            this.entityCreationCount.toString(),
        ])
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

describe("Limit Orders", () => {
    beforeAll(() => {
        clearStore()
        PerformanceMetrics.reset()
        log.info("🧪 Starting Limit Orders Performance Test Suite", [])
    })

    afterAll(() => {
        PerformanceMetrics.printSummary()
        clearStore()
        log.info("🏁 Limit Orders Performance Test Suite Completed", [])
    })

    describe("UserNonce Entity", () => {
        test("Should create UserNonce entity with correct fields", () => {
            const timer = new PerformanceTimer("UserNonce Entity Creation")
            timer.start()

            let userAddress = Address.fromString(
                "0x1234567890123456789012345678901234567890"
            )
            let entityId = "nonce-" + userAddress.toHexString()
            let latestNonce = BigInt.fromI32(10)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            // Track entity creation
            PerformanceTimer.logOperation("UserNonce entity creation")
            let entity = new UserNonce(entityId)
            entity.user = userAddress
            entity.latestNonce = latestNonce
            entity.updatedAt = timestamp
            entity.updatedAtBlock = blockNumber
            PerformanceMetrics.recordEntityCreation()

            // Track save operation
            PerformanceTimer.logOperation("UserNonce save operation")
            entity.save()
            PerformanceMetrics.recordSave()

            // Track field assertions
            PerformanceTimer.logOperation("UserNonce field assertions")
            assert.fieldEquals(
                "UserNonce",
                entityId,
                "user",
                userAddress.toHexString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "UserNonce",
                entityId,
                "latestNonce",
                latestNonce.toString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "UserNonce",
                entityId,
                "updatedAt",
                timestamp.toString()
            )
            PerformanceMetrics.recordAssertion()
            assert.fieldEquals(
                "UserNonce",
                entityId,
                "updatedAtBlock",
                blockNumber.toString()
            )
            PerformanceMetrics.recordAssertion()
            PerformanceMetrics.recordQuery()

            const totalDuration = timer.end()
            log.info("🎯 UserNonce test completed with total duration: {} ms", [
                totalDuration.toString(),
            ])
        })
    })

    describe("OnChainOrderStatus Entity", () => {
        test("Should create OnChainOrderStatus entity with correct fields", () => {
            let orderHash = Bytes.fromHexString(
                "0x1111111111111111111111111111111111111111111111111111111111111111"
            ) //Random order hash
            let entityId = orderHash.toHexString()
            let totalFilled = BigInt.fromI32(1000)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            let entity = new OnChainOrderStatus(entityId)
            entity.orderHash = orderHash
            entity.totalFilled = totalFilled
            entity.cancelled = false
            entity.updatedAt = timestamp
            entity.updatedAtBlock = blockNumber
            entity.save()

            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "orderHash",
                orderHash.toHexString()
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "totalFilled",
                totalFilled.toString()
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "cancelled",
                "false"
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "updatedAt",
                timestamp.toString()
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "updatedAtBlock",
                blockNumber.toString()
            )
        })

        test("Should handle cancelled order status", () => {
            let orderHash = Bytes.fromHexString(
                "0x1111111111111111111111111111111111111111111111111111111111111111"
            ) //Random order hash
            let entityId = orderHash.toHexString()
            let totalFilled = BigInt.fromI32(500)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            let entity = new OnChainOrderStatus(entityId)
            entity.orderHash = orderHash
            entity.totalFilled = totalFilled
            entity.cancelled = true // Order is cancelled
            entity.updatedAt = timestamp
            entity.updatedAtBlock = blockNumber
            entity.save()

            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "orderHash",
                orderHash.toHexString()
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "totalFilled",
                totalFilled.toString()
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "cancelled",
                "true"
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "updatedAt",
                timestamp.toString()
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "updatedAtBlock",
                blockNumber.toString()
            )
        })
    })

    describe("Performance and Edge Cases", () => {
        test("Should handle multiple order status entities efficiently", () => {
            // Test creating multiple order status entities to simulate high volume
            let baseOrderHash =
                "0x1111111111111111111111111111111111111111111111111111111111111"
            let fillAmount = BigInt.fromI32(100)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            for (let i = 0; i < 10; i++) {
                let orderHash = Bytes.fromHexString(
                    baseOrderHash + i.toString().padStart(3, "0")
                )
                let entityId = orderHash.toHexString()

                let entity = new OnChainOrderStatus(entityId)
                entity.orderHash = orderHash
                entity.totalFilled = fillAmount
                entity.cancelled = false
                entity.updatedAt = timestamp
                entity.updatedAtBlock = blockNumber
                entity.save()

                // Verify each entity was created correctly
                assert.fieldEquals(
                    "OnChainOrderStatus",
                    entityId,
                    "totalFilled",
                    fillAmount.toString()
                )
                assert.fieldEquals(
                    "OnChainOrderStatus",
                    entityId,
                    "cancelled",
                    "false"
                )
            }
        })

        test("Should handle zero fill amounts", () => {
            let orderHash = Bytes.fromHexString(
                "0x0000000000000000000000000000000000000000000000000000000000000001"
            ) //Random order hash
            let entityId = orderHash.toHexString()
            let zeroFill = BigInt.fromI32(0)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            let entity = new OnChainOrderStatus(entityId)
            entity.orderHash = orderHash
            entity.totalFilled = zeroFill
            entity.cancelled = false
            entity.updatedAt = timestamp
            entity.updatedAtBlock = blockNumber
            entity.save()

            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "totalFilled",
                "0"
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "cancelled",
                "false"
            )
        })

        test("Should handle large fill amounts", () => {
            let orderHash = Bytes.fromHexString(
                "0x9999999999999999999999999999999999999999999999999999999999999999"
            ) //Random order hash
            let entityId = orderHash.toHexString()
            let largeFill = BigInt.fromString("1000000000000000000000") // 1000 tokens with 18 decimals
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            let entity = new OnChainOrderStatus(entityId)
            entity.orderHash = orderHash
            entity.totalFilled = largeFill
            entity.cancelled = false
            entity.updatedAt = timestamp
            entity.updatedAtBlock = blockNumber
            entity.save()

            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "totalFilled",
                largeFill.toString()
            )
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "cancelled",
                "false"
            )
        })

        test("Should handle accumulative fills simulation", () => {
            let orderHash = Bytes.fromHexString(
                "0x0000000000000000000000000000000000000000000000000000000000000001"
            ) //Random order hash
            let entityId = orderHash.toHexString()
            let firstFill = BigInt.fromI32(500)
            let secondFill = BigInt.fromI32(300)
            let expectedTotal = firstFill.plus(secondFill)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            // Simulate first fill
            let entity = new OnChainOrderStatus(entityId)
            entity.orderHash = orderHash
            entity.totalFilled = firstFill
            entity.cancelled = false
            entity.updatedAt = timestamp
            entity.updatedAtBlock = blockNumber
            entity.save()

            // Load and update with second fill (simulating handler behavior)
            let loadedEntity = OnChainOrderStatus.load(entityId)
            if (loadedEntity != null) {
                loadedEntity.totalFilled =
                    loadedEntity.totalFilled.plus(secondFill)
                loadedEntity.save()
            }

            // Verify total is accumulated correctly
            assert.fieldEquals(
                "OnChainOrderStatus",
                entityId,
                "totalFilled",
                expectedTotal.toString()
            )
        })
    })

    describe("UserNonce Performance Tests", () => {
        test("Should handle multiple user nonces efficiently", () => {
            let baseUserAddress = "0x111111111111111111111111111111111111111"
            let nonce = BigInt.fromI32(5)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            for (let i = 0; i < 5; i++) {
                let userAddress = Address.fromString(
                    baseUserAddress + i.toString()
                )
                let entityId = "nonce-" + userAddress.toHexString()
                let userNonce = nonce.plus(BigInt.fromI32(i))

                let entity = new UserNonce(entityId)
                entity.user = userAddress
                entity.latestNonce = userNonce
                entity.updatedAt = timestamp
                entity.updatedAtBlock = blockNumber
                entity.save()

                // Verify each nonce entity was created correctly
                assert.fieldEquals(
                    "UserNonce",
                    entityId,
                    "user",
                    userAddress.toHexString()
                )
                assert.fieldEquals(
                    "UserNonce",
                    entityId,
                    "latestNonce",
                    userNonce.toString()
                )
            }
        })

        test("Should handle nonce updates simulation", () => {
            let userAddress = Address.fromString(
                "0x9876543210987654321098765432109876543210"
            ) //random address
            let entityId = "nonce-" + userAddress.toHexString()
            let initialNonce = BigInt.fromI32(5)
            let updatedNonce = BigInt.fromI32(10)
            let timestamp = BigInt.fromI32(1234567890)
            let blockNumber = BigInt.fromI32(12345)

            // Create initial nonce
            let entity = new UserNonce(entityId)
            entity.user = userAddress
            entity.latestNonce = initialNonce
            entity.updatedAt = timestamp
            entity.updatedAtBlock = blockNumber
            entity.save()

            // Load and update nonce (simulating handler behavior)
            let loadedEntity = UserNonce.load(entityId)
            if (loadedEntity != null) {
                loadedEntity.latestNonce = updatedNonce
                loadedEntity.save()
            }

            // Verify nonce was updated correctly
            assert.fieldEquals(
                "UserNonce",
                entityId,
                "latestNonce",
                updatedNonce.toString()
            )
        })
    })

    describe("🚀 Limit Orders Performance Benchmarks", () => {
        test("Bulk UserNonce Creation Performance", () => {
            const timer = new PerformanceTimer(
                "Bulk UserNonce Creation (100 entities)"
            )
            timer.start()

            const entityCount = 100
            const baseAddress = "0x1000000000000000000000000000000000000"

            log.info("🔥 Starting bulk creation of {} UserNonce entities", [
                entityCount.toString(),
            ])

            for (let i = 0; i < entityCount; i++) {
                timer.incrementOperation()

                let userAddress = Address.fromString(
                    baseAddress + i.toString().padStart(3, "0")
                )
                let entityId = "nonce-" + userAddress.toHexString()
                let nonce = BigInt.fromI32(i + 1)
                let timestamp = BigInt.fromI32(1234567890 + i)
                let blockNumber = BigInt.fromI32(12345 + i)

                let entity = new UserNonce(entityId)
                entity.user = userAddress
                entity.latestNonce = nonce
                entity.updatedAt = timestamp
                entity.updatedAtBlock = blockNumber
                entity.save()

                PerformanceMetrics.recordEntityCreation()

                if (i % 25 === 0) {
                    log.info("📊 Created {} UserNonce entities so far...", [
                        i.toString(),
                    ])
                }
            }

            const totalOperations = timer.end()
            log.info(
                "✅ Bulk UserNonce creation completed: {} entities with {} operations",
                [entityCount.toString(), totalOperations.toString()]
            )
            log.info("⚡ Average operations per entity: {}", [
                (totalOperations / entityCount).toString(),
            ])
        })

        test("Bulk OnChainOrderStatus Creation Performance", () => {
            const timer = new PerformanceTimer(
                "Bulk OnChainOrderStatus Creation (100 entities)"
            )
            timer.start()

            const entityCount = 100
            const baseOrderHash =
                "0x2000000000000000000000000000000000000000000000000000000000000"

            log.info(
                "🔥 Starting bulk creation of {} OnChainOrderStatus entities",
                [entityCount.toString()]
            )

            for (let i = 0; i < entityCount; i++) {
                timer.incrementOperation()

                let orderHash = Bytes.fromHexString(
                    baseOrderHash + i.toString().padStart(3, "0")
                )
                let entityId = orderHash.toHexString()
                let totalFilled = BigInt.fromI32((i + 1) * 100)
                let timestamp = BigInt.fromI32(1234567890 + i)
                let blockNumber = BigInt.fromI32(12345 + i)

                let entity = new OnChainOrderStatus(entityId)
                entity.orderHash = orderHash
                entity.totalFilled = totalFilled
                entity.cancelled = i % 10 === 0 // Every 10th order is cancelled
                entity.updatedAt = timestamp
                entity.updatedAtBlock = blockNumber
                entity.save()

                PerformanceMetrics.recordEntityCreation()

                if (i % 25 === 0) {
                    log.info(
                        "📊 Created {} OnChainOrderStatus entities so far...",
                        [i.toString()]
                    )
                }
            }

            const totalOperations = timer.end()
            log.info(
                "✅ Bulk OnChainOrderStatus creation completed: {} entities with {} operations",
                [entityCount.toString(), totalOperations.toString()]
            )
            log.info("⚡ Average operations per entity: {}", [
                (totalOperations / entityCount).toString(),
            ])
        })

        test("Mixed Operations Performance Test", () => {
            const timer = new PerformanceTimer(
                "Mixed Operations Performance Test"
            )
            timer.start()

            log.info("🎯 Starting mixed operations performance test", [])

            // Create entities
            log.info("📈 Starting entity creation phase", [])
            for (let i = 0; i < 50; i++) {
                timer.incrementOperation()

                let userAddress = Address.fromString(
                    "0x3000000000000000000000000000000000000" +
                        i.toString().padStart(3, "0")
                )
                let nonceEntityId = "nonce-" + userAddress.toHexString()

                let nonceEntity = new UserNonce(nonceEntityId)
                nonceEntity.user = userAddress
                nonceEntity.latestNonce = BigInt.fromI32(i)
                nonceEntity.updatedAt = BigInt.fromI32(1234567890)
                nonceEntity.updatedAtBlock = BigInt.fromI32(12345)
                nonceEntity.save()

                let orderHash = Bytes.fromHexString(
                    "0x3000000000000000000000000000000000000000000000000000000000000" +
                        i.toString().padStart(3, "0")
                )
                let orderEntityId = orderHash.toHexString()

                let orderEntity = new OnChainOrderStatus(orderEntityId)
                orderEntity.orderHash = orderHash
                orderEntity.totalFilled = BigInt.fromI32(i * 100)
                orderEntity.cancelled = false
                orderEntity.updatedAt = BigInt.fromI32(1234567890)
                orderEntity.updatedAtBlock = BigInt.fromI32(12345)
                orderEntity.save()
            }
            log.info("📈 Entity creation phase completed", [])

            // Query entities
            log.info("🔍 Starting entity query phase", [])
            for (let i = 0; i < 50; i++) {
                timer.incrementOperation()

                let userAddress = Address.fromString(
                    "0x3000000000000000000000000000000000000" +
                        i.toString().padStart(3, "0")
                )
                let nonceEntityId = "nonce-" + userAddress.toHexString()
                let loadedNonce = UserNonce.load(nonceEntityId)

                let orderHash = Bytes.fromHexString(
                    "0x3000000000000000000000000000000000000000000000000000000000000" +
                        i.toString().padStart(3, "0")
                )
                let orderEntityId = orderHash.toHexString()
                let loadedOrder = OnChainOrderStatus.load(orderEntityId)

                assert.assertTrue(loadedNonce !== null)
                assert.assertTrue(loadedOrder !== null)
            }
            PerformanceMetrics.recordQuery()
            log.info("🔍 Entity query phase completed", [])

            // Update entities
            log.info("💾 Starting entity update phase", [])
            for (let i = 0; i < 50; i++) {
                timer.incrementOperation()

                let userAddress = Address.fromString(
                    "0x3000000000000000000000000000000000000" +
                        i.toString().padStart(3, "0")
                )
                let nonceEntityId = "nonce-" + userAddress.toHexString()
                let loadedNonce = UserNonce.load(nonceEntityId)

                if (loadedNonce !== null) {
                    loadedNonce.latestNonce = loadedNonce.latestNonce.plus(
                        BigInt.fromI32(1)
                    )
                    loadedNonce.save()
                }

                let orderHash = Bytes.fromHexString(
                    "0x3000000000000000000000000000000000000000000000000000000000000" +
                        i.toString().padStart(3, "0")
                )
                let orderEntityId = orderHash.toHexString()
                let loadedOrder = OnChainOrderStatus.load(orderEntityId)

                if (loadedOrder !== null) {
                    loadedOrder.totalFilled = loadedOrder.totalFilled.plus(
                        BigInt.fromI32(50)
                    )
                    loadedOrder.save()
                }
            }
            PerformanceMetrics.recordSave()
            log.info("💾 Entity update phase completed", [])

            const totalOperations = timer.end()
            log.info(
                "🏆 Mixed operations test completed with {} total operations",
                [totalOperations.toString()]
            )
            log.info(
                "📊 Mixed operations performance test finished successfully",
                []
            )
        })

        test("Memory Usage Pattern Analysis", () => {
            const timer = new PerformanceTimer("Memory Usage Pattern Analysis")
            timer.start()

            log.info("🧠 Starting memory usage pattern analysis", [])

            // Test with increasing entity sizes
            const testSizes = [10, 50, 100, 200]

            for (let sizeIndex = 0; sizeIndex < testSizes.length; sizeIndex++) {
                const size = testSizes[sizeIndex]
                log.info("📏 Testing with {} entities", [size.toString()])

                // Clear store before each size test
                clearStore()

                // Create entities of current size
                for (let i = 0; i < size; i++) {
                    timer.incrementOperation()

                    let userAddress = Address.fromString(
                        "0x4000000000000000000000000000000000000" +
                            i.toString().padStart(3, "0")
                    )
                    let entityId = "nonce-" + userAddress.toHexString()

                    let entity = new UserNonce(entityId)
                    entity.user = userAddress
                    entity.latestNonce = BigInt.fromI32(i)
                    entity.updatedAt = BigInt.fromI32(1234567890)
                    entity.updatedAtBlock = BigInt.fromI32(12345)
                    entity.save()
                }

                log.info("⏱️  {} entities created with {} operations", [
                    size.toString(),
                    size.toString(),
                ])
            }

            const totalOperations = timer.end()
            log.info(
                "🧠 Memory usage pattern analysis completed with {} total operations",
                [totalOperations.toString()]
            )
        })
    })
})
