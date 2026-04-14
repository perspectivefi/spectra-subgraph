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
import { MetavaultWrapper, ERC20 } from "../../../generated/templates"
import { getMetavault } from "../../entities/Metavault"

// Well-known key constants
const VAULT_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("vault"))
)
const WRAPPER_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("wrapper"))
)
const TREASURY_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("treasury"))
)
const ROLES_DEFAULT_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("roles.default"))
)
const DELAY_DEFAULT_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("delay.default"))
)
const ROLES_POOL_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("roles.pool"))
)
const DELAY_POOL_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("delay.pool"))
)
const ROLES_SWAP_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("roles.swap"))
)
const DELAY_SWAP_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("delay.swap"))
)
const ROLES_ACCT_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("roles.acct"))
)
const DELAY_ACCT_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("delay.acct"))
)
const CURATOR_NAME_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("curator.name"))
)
const CURATOR_WEBSITE_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("curator.website"))
)
const DESCRIPTION_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("description"))
)
const NAME_KEY = changetype<Bytes>(
    crypto.keccak256(ByteArray.fromUTF8("name"))
)

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
    if (key == CURATOR_NAME_KEY) {
        metavault.curatorName = value
    } else if (key == CURATOR_WEBSITE_KEY) {
        metavault.curatorWebsite = value
    } else if (key == DESCRIPTION_KEY) {
        metavault.description = value
    } else if (key == NAME_KEY) {
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
    if (key == VAULT_KEY) {
        metavault.vaultAddress = value
    } else if (key == WRAPPER_KEY) {
        metavault.wrapperAddress = value
        // Spawn templates for the wrapper
        MetavaultWrapper.create(value)
        ERC20.create(value)
    } else if (key == TREASURY_KEY) {
        metavault.treasuryAddress = value
    } else if (key == ROLES_DEFAULT_KEY) {
        metavault.rolesDefault = value
    } else if (key == DELAY_DEFAULT_KEY) {
        metavault.delayDefault = value
    } else if (key == ROLES_POOL_KEY) {
        metavault.rolesPool = value
    } else if (key == DELAY_POOL_KEY) {
        metavault.delayPool = value
    } else if (key == ROLES_SWAP_KEY) {
        metavault.rolesSwap = value
    } else if (key == DELAY_SWAP_KEY) {
        metavault.delaySwap = value
    } else if (key == ROLES_ACCT_KEY) {
        metavault.rolesAcct = value
    } else if (key == DELAY_ACCT_KEY) {
        metavault.delayAcct = value
    }

    // Recompute isComplete
    let hasVault = metavault.vaultAddress !== null
    let hasWrapper = metavault.wrapperAddress !== null
    metavault.isComplete = hasVault && hasWrapper
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
