import { ByteArray, crypto, Bytes, Address } from "@graphprotocol/graph-ts"

import {
    StringSet,
    AddressSet,
    Uint256Set,
    BytesSet,
    RemoteRegistered,
    RemoteUnregistered,
} from "../../../generated/MetavaultsRegistryV2/MetavaultsRegistryV2"
import { MetavaultMetadata, RemoteMetavault } from "../../../generated/schema"
import { MetavaultWrapper, ERC20, AmphorAsyncVault } from "../../../generated/templates"
import { getMetavault } from "../../entities/Metavault"

// Well-known key constants (domain-prefixed)
const CORE_SAFE_KEY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("core.safe")))
const CORE_VAULT_KEY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("core.vault")))
const CORE_WRAPPER_KEY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("core.wrapper")))
const META_NAME_KEY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("metadata.name")))
const META_DESCRIPTION_KEY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("metadata.description")))
const META_CURATOR_NAME_KEY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("metadata.curator.name")))
const META_CURATOR_LINK_KEY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("metadata.curator.link")))
const PIPE_DEFAULT_ROLES = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("pipelines.zodiac-default.roles")))
const PIPE_DEFAULT_DELAY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("pipelines.zodiac-default.delay")))
const PIPE_POOL_ROLES = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("pipelines.zodiac-pool.roles")))
const PIPE_POOL_DELAY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("pipelines.zodiac-pool.delay")))
const PIPE_SWAP_ROLES = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("pipelines.zodiac-swap.roles")))
const PIPE_SWAP_DELAY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("pipelines.zodiac-swap.delay")))
const PIPE_ACCT_ROLES = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("pipelines.zodiac-acct.roles")))
const PIPE_ACCT_DELAY = changetype<Bytes>(crypto.keccak256(ByteArray.fromUTF8("pipelines.zodiac-acct.delay")))

// ---- StringSet ----

export function handleStringSet(event: StringSet): void {
    let vaultAddress = event.params.vault
    let key = event.params.key
    let value = event.params.value

    let metavault = getMetavault(
        vaultAddress,
        event.block.timestamp,
        event.block.number
    )

    // Create/update MetavaultMetadata entity
    let metadataId = vaultAddress.toHex() + "-" + key.toHex()
    let metadata = MetavaultMetadata.load(metadataId)
    if (!metadata) {
        metadata = new MetavaultMetadata(metadataId)
        metadata.vault = metavault.id
        metadata.key = key
    }
    metadata.stringValue = value
    metadata.valueType = 0 // string
    metadata.updatedAtBlock = event.block.number
    metadata.updatedAtTimestamp = event.block.timestamp
    metadata.save()

    // Denormalize well-known string keys onto Metavault
    if (key == META_CURATOR_NAME_KEY) {
        metavault.curatorName = value
    } else if (key == META_CURATOR_LINK_KEY) {
        metavault.curatorWebsite = value
    } else if (key == META_DESCRIPTION_KEY) {
        metavault.description = value
    } else if (key == META_NAME_KEY) {
        metavault.displayName = value
    }
    metavault.save()
}

// ---- AddressSet ----

export function handleAddressSet(event: AddressSet): void {
    let vaultAddress = event.params.vault
    let key = event.params.key
    let value = event.params.value

    let metavault = getMetavault(
        vaultAddress,
        event.block.timestamp,
        event.block.number
    )

    // Create/update MetavaultMetadata entity
    let metadataId = vaultAddress.toHex() + "-" + key.toHex()
    let metadata = MetavaultMetadata.load(metadataId)
    if (!metadata) {
        metadata = new MetavaultMetadata(metadataId)
        metadata.vault = metavault.id
        metadata.key = key
    }
    metadata.addressValue = value
    metadata.valueType = 1 // address
    metadata.updatedAtBlock = event.block.number
    metadata.updatedAtTimestamp = event.block.timestamp
    metadata.save()

    // Denormalize well-known address keys onto Metavault
    if (key == CORE_VAULT_KEY) {
        metavault.vaultAddress = value
        // Store a reverse-lookup entry so AmphorAsyncVault handlers can find the metavault
        let reverseId = "vault-reverse-" + value.toHex()
        let reverseEntry = MetavaultMetadata.load(reverseId)
        if (!reverseEntry) {
            reverseEntry = new MetavaultMetadata(reverseId)
            reverseEntry.vault = metavault.id
            reverseEntry.key = key
            reverseEntry.valueType = 1 // address
            reverseEntry.updatedAtBlock = event.block.number
            reverseEntry.updatedAtTimestamp = event.block.timestamp
        }
        reverseEntry.addressValue = value
        reverseEntry.save()
        // Spawn AmphorAsyncVault template for epoch tracking
        AmphorAsyncVault.create(value)
    } else if (key == CORE_WRAPPER_KEY) {
        metavault.wrapperAddress = value
        // Spawn templates for the wrapper
        MetavaultWrapper.create(value)
        ERC20.create(value)
    } else if (key == PIPE_DEFAULT_ROLES) {
        metavault.rolesDefault = value
    } else if (key == PIPE_DEFAULT_DELAY) {
        metavault.delayDefault = value
    } else if (key == PIPE_POOL_ROLES) {
        metavault.rolesPool = value
    } else if (key == PIPE_POOL_DELAY) {
        metavault.delayPool = value
    } else if (key == PIPE_SWAP_ROLES) {
        metavault.rolesSwap = value
    } else if (key == PIPE_SWAP_DELAY) {
        metavault.delaySwap = value
    } else if (key == PIPE_ACCT_ROLES) {
        metavault.rolesAcct = value
    } else if (key == PIPE_ACCT_DELAY) {
        metavault.delayAcct = value
    }

    metavault.save()
}

// ---- Uint256Set ----

export function handleUint256Set(event: Uint256Set): void {
    let vaultAddress = event.params.vault
    let key = event.params.key
    let value = event.params.value

    let metavault = getMetavault(
        vaultAddress,
        event.block.timestamp,
        event.block.number
    )

    // Create/update MetavaultMetadata entity
    let metadataId = vaultAddress.toHex() + "-" + key.toHex()
    let metadata = MetavaultMetadata.load(metadataId)
    if (!metadata) {
        metadata = new MetavaultMetadata(metadataId)
        metadata.vault = metavault.id
        metadata.key = key
    }
    metadata.uintValue = value
    metadata.valueType = 2 // uint256
    metadata.updatedAtBlock = event.block.number
    metadata.updatedAtTimestamp = event.block.timestamp
    metadata.save()
}

// ---- BytesSet ----

export function handleBytesSet(event: BytesSet): void {
    let vaultAddress = event.params.vault
    let key = event.params.key
    let value = event.params.value

    let metavault = getMetavault(
        vaultAddress,
        event.block.timestamp,
        event.block.number
    )

    // Create/update MetavaultMetadata entity
    let metadataId = vaultAddress.toHex() + "-" + key.toHex()
    let metadata = MetavaultMetadata.load(metadataId)
    if (!metadata) {
        metadata = new MetavaultMetadata(metadataId)
        metadata.vault = metavault.id
        metadata.key = key
    }
    metadata.bytesValue = value
    metadata.valueType = 3 // bytes
    metadata.updatedAtBlock = event.block.number
    metadata.updatedAtTimestamp = event.block.timestamp
    metadata.save()
}

// ---- RemoteRegistered ----

export function handleRemoteRegistered(event: RemoteRegistered): void {
    let metavault = getMetavault(
        event.params.vault,
        event.block.timestamp,
        event.block.number
    )

    // Create RemoteMetavault entity
    let remoteMetavaultId =
        event.params.vault.toHex() + "-" + event.params.chainId.toString()
    let remoteMetavault = new RemoteMetavault(remoteMetavaultId)
    remoteMetavault.chainId = event.params.chainId.toI32()
    remoteMetavault.remoteMetavaultAddress = event.params.remote
    remoteMetavault.save()

    // Add to metavault chains array
    let chains = metavault.chains
    chains.push(remoteMetavault.id)
    metavault.chains = chains
    metavault.save()
}

// ---- RemoteUnregistered ----

export function handleRemoteUnregistered(event: RemoteUnregistered): void {
    let metavault = getMetavault(
        event.params.vault,
        event.block.timestamp,
        event.block.number
    )

    let remoteMetavaultId =
        event.params.vault.toHex() + "-" + event.params.chainId.toString()

    // Remove from metavault chains array
    let index = metavault.chains.indexOf(remoteMetavaultId)
    if (index > -1) {
        let chains = metavault.chains
        chains.splice(index, 1)
        metavault.chains = chains
        metavault.save()
    }
}
