#!/usr/bin/env node
/**
 * Guard: every contract address in src/configs/<network>.json must match the
 * Spectra address registry (@perspectivefi/addresses) for that chain.
 *
 * - Read-only: it never rewrites a config or a manifest.
 * - A zero address means "data source disabled" and is always allowed.
 * - Known, explained differences live in registry-address-exceptions.json
 *   ([{ network, field, address, reason }]). See the README.
 *
 * Exit code 1 when a config address differs from the registry (or has no
 * registry entry, or is `blocked`) and is not listed in the exceptions file,
 * and when an exception no longer matches anything (stale).
 */
const fs = require("node:fs")
const path = require("node:path")
const { entry } = require("@perspectivefi/addresses")

const root = path.resolve(__dirname, "..")
const CONFIG_DIR = path.join(root, "src/configs")
const EXCEPTIONS_FILE = path.join(root, "registry-address-exceptions.json")
const ZERO = "0x0000000000000000000000000000000000000000"

// Config file name (src/configs/<network>.json) -> EVM chain id.
const CHAIN_IDS = {
    mainnet: 1,
    optimism: 10,
    bsc: 56,
    sonic: 146,
    base: 8453,
    arbitrum: 42161,
    avalanche: 43114,
    flare: 14,
    hemi: 43111,
    hyperevm: 999,
    katana: 747474,
    monad: 143,
    sei: 1329,
}

// Config field -> registry key. Every address-valued field in the configs must
// be listed here (the check fails on an unmapped address field, so a new field
// cannot slip in unchecked). Fields that are not addresses (network,
// startBlock, ptBridgeStartBlock) are intentionally absent.
const FIELD_KEYS = {
    registry: "core.registry",
    accessManager: "core.access-manager",
    limitOrderEngine: "limit-orders.engine",
    ptBridgeAddr: "bridge.pt-bridge",
    // Not referenced by subgraph.template.yaml (the live Factory is discovered
    // from Registry FactoryChange events) but kept in mainnet.json.
    factory: "core.factory-legacy",
    // Not referenced by subgraph.template.yaml either.
    spectra: "core.spectra-token",
}
const NON_ADDRESS_FIELDS = new Set([
    "network",
    "startBlock",
    "ptBridgeStartBlock",
])
// Start-block field attached to a data-source root address (for the table).
const START_BLOCK_FIELDS = {
    registry: "startBlock",
    accessManager: "startBlock",
    limitOrderEngine: "startBlock",
    ptBridgeAddr: "ptBridgeStartBlock",
}

const isAddress = (v) => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v)
const lc = (v) => String(v).toLowerCase()

const exceptions = fs.existsSync(EXCEPTIONS_FILE)
    ? JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, "utf8"))
    : []
for (const e of exceptions) {
    if (!e.network || !e.field || !isAddress(e.address) || !e.reason) {
        console.error(
            `Invalid exception (needs network, field, address, reason): ${JSON.stringify(
                e
            )}`
        )
        process.exit(1)
    }
}
const used = new Set()
const findException = (network, field, address) => {
    const i = exceptions.findIndex(
        (e) =>
            e.network === network &&
            e.field === field &&
            lc(e.address) === lc(address)
    )
    if (i >= 0) used.add(i)
    return i >= 0 ? exceptions[i] : undefined
}

const rows = []
let failures = 0

const networks = fs
    .readdirSync(CONFIG_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort()

for (const network of networks) {
    const config = JSON.parse(
        fs.readFileSync(path.join(CONFIG_DIR, `${network}.json`), "utf8")
    )
    const chainId = CHAIN_IDS[network]
    if (chainId === undefined) {
        console.error(
            `No chain id for network "${network}": add it to CHAIN_IDS in ${path.relative(
                root,
                __filename
            )}`
        )
        failures++
        continue
    }

    for (const [field, value] of Object.entries(config)) {
        if (NON_ADDRESS_FIELDS.has(field)) continue
        if (!isAddress(value)) {
            console.error(
                `${network}.${field}: unexpected non-address value ${JSON.stringify(
                    value
                )}; list it in NON_ADDRESS_FIELDS or FIELD_KEYS`
            )
            failures++
            continue
        }
        const key = FIELD_KEYS[field]
        if (!key) {
            console.error(
                `${network}.${field}: address field has no registry key; add it to FIELD_KEYS`
            )
            failures++
            continue
        }

        const startBlock = START_BLOCK_FIELDS[field]
            ? config[START_BLOCK_FIELDS[field]]
            : ""
        const reg = entry(chainId, key)
        const row = {
            network,
            chain: chainId,
            field,
            key,
            config: value,
            registry: reg ? reg.address : "(none)",
            startBlock,
            result: "",
        }

        if (lc(value) === ZERO) {
            row.result = "disabled"
        } else {
            let issue
            if (!reg) issue = "no registry entry"
            else if (lc(reg.address) !== lc(value)) issue = "MISMATCH"
            else if (reg.status === "blocked") issue = "BLOCKED in registry"

            if (!issue) {
                row.result = `ok (${reg.status})`
            } else {
                const ex = findException(network, field, value)
                if (ex) {
                    row.result = `exception: ${issue}`
                } else {
                    row.result = `FAIL: ${issue}`
                    failures++
                }
            }
        }
        rows.push(row)
    }
}

exceptions.forEach((e, i) => {
    if (!used.has(i)) {
        console.error(
            `Stale exception (no longer matches any issue, remove it): ${JSON.stringify(
                e
            )}`
        )
        failures++
    }
})

console.table(
    rows.map((r) => ({
        network: r.network,
        chain: r.chain,
        field: r.field,
        "registry key": r.key,
        config: r.config,
        registry: r.registry,
        "start block": r.startBlock,
        result: r.result,
    }))
)

if (failures > 0) {
    console.error(
        `\n${failures} problem(s). Fix the config, or (if the registry is wrong or the difference is intended) add an entry with a reason to registry-address-exceptions.json.`
    )
    process.exit(1)
}
console.log(
    `\nAll ${rows.length} config addresses are consistent with @perspectivefi/addresses.`
)
