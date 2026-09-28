const assert = require("node:assert/strict")
const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const { createRequire } = require("node:module")
const os = require("node:os")
const path = require("node:path")
const { after, test } = require("node:test")

const root = path.resolve(__dirname, "..")
const { parse } = createRequire(
    require.resolve("@graphprotocol/graph-cli/package.json")
)("yaml")
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "spectra-manifests-"))
fs.mkdirSync(path.join(fixture, "src/scripts"), { recursive: true })
fs.cpSync(path.join(root, "src/configs"), path.join(fixture, "src/configs"), {
    recursive: true,
})
fs.copyFileSync(
    path.join(root, "src/scripts/subgraphConfigGenerator.js"),
    path.join(fixture, "src/scripts/subgraphConfigGenerator.js")
)
fs.copyFileSync(
    path.join(root, "subgraph.template.yaml"),
    path.join(fixture, "subgraph.template.yaml")
)
fs.symlinkSync(
    path.join(root, "node_modules"),
    path.join(fixture, "node_modules")
)
after(() => fs.rmSync(fixture, { recursive: true, force: true }))

function generate(args) {
    execFileSync(
        process.execPath,
        ["src/scripts/subgraphConfigGenerator.js", ...args],
        {
            cwd: fixture,
            stdio: "pipe",
        }
    )
}

function readManifest(network) {
    return parse(
        fs.readFileSync(path.join(fixture, `subgraph.${network}.yaml`), "utf8")
    )
}

function checkSources(network) {
    const config = JSON.parse(
        fs.readFileSync(
            path.join(fixture, `src/configs/${network}.json`),
            "utf8"
        )
    )
    const manifest = readManifest(network)
    const bridge = manifest.dataSources.find(
        (source) => source.name === "PTBridge"
    )
    if (config.ptBridgeAddr === "0x0000000000000000000000000000000000000000") {
        assert.equal(
            bridge,
            undefined,
            `${network}: absent bridge must not be indexed`
        )
    } else {
        assert.ok(bridge, `${network}: configured bridge must be retained`)
        assert.equal(bridge.source.address, config.ptBridgeAddr)
        assert.equal(bridge.source.startBlock, config.ptBridgeStartBlock)
        assert.deepEqual(
            bridge.mapping.eventHandlers.map((event) => event.handler),
            ["handlePTLocked", "handlePTUnlocked"]
        )
    }
    for (const source of manifest.dataSources) {
        assert.ok(
            source.source.startBlock > 0,
            `${network}/${source.name}: genesis start`
        )
        if (source.name !== "PTBridge") {
            assert.equal(source.source.startBlock, config.startBlock)
        }
    }
    assert.deepEqual(
        manifest.dataSources
            .filter((source) => source.name !== "PTBridge")
            .map((source) => source.name),
        ["Registry", "SpectraWrapper", "LimitOrderEngine", "AccessManager"]
    )
    return manifest
}

const networks = fs
    .readdirSync(path.join(fixture, "src/configs"))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))

test("all-network generation omits absent bridges and preserves configured sources", () => {
    generate([])
    for (const network of networks) {
        assert.equal(checkSources(network).graft, undefined)
    }
})

test("per-network generation applies the same source boundaries", () => {
    for (const network of networks) {
        generate(["--network", network])
        assert.equal(checkSources(network).graft, undefined)
    }
})

test("graft generation preserves graft settings without restoring an absent bridge", () => {
    const deployment = "QmeHjWJPKQwML6ZgccbKzmT6V8Fn61kfRxQc9tTWYrDF6K"
    for (const network of ["mainnet", "hyperevm"]) {
        generate([
            "--network",
            network,
            "--graft",
            "26000000",
            "--deploymentID",
            deployment,
        ])
        const manifest = checkSources(network)
        assert.deepEqual(manifest.graft, { base: deployment, block: 26000000 })
        assert.ok(manifest.features.includes("grafting"))
    }
})
