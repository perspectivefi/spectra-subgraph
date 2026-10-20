# Spectra Subgraph

This repository contains the source code for the Spectra Protocol Subgraph. It indexes data from the Spectra Protocol smart contracts, including Futures, Pools (AMMs), Limit Orders, Access Management, and Blocks.

## Prerequisites

-   [Node.js](https://nodejs.org/)
-   [Yarn](https://yarnpkg.com/)
-   [Graph CLI](https://github.com/graphprotocol/graph-cli)

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/perspectivefi/spectra-subgraph.git
    cd spectra-subgraph
    ```

2. Install dependencies:
    ```bash
    yarn install
    ```

## Configuration & Generation

This project uses a template-based approach to generate `subgraph.yaml` files for different networks.

To generate configurations for all supported networks (found in `src/configs/*.json`):

```bash
yarn gen:config
```

This script will generate files like `subgraph.mainnet.yaml`, `subgraph.arbitrum.yaml`, etc., in the root directory.

## Adding a New Network

To add support for a new network:

1. Create a new configuration file in `src/configs/<network-name>.json`.
2. Populate it with the required contract addresses and start blocks. You can copy an existing config (e.g., `src/configs/mainnet.json`) as a template. `startBlock` is the block where the first Spectra-related contract was deployed on the target network.
3. Add the network to `src/utils/ChainIds.ts` if it is not already present.
4. Run `yarn gen:config` to generate the new `subgraph.<network-name>.yaml` file.

## Registry Address Check

Every contract address in `src/configs/*.json` (Registry, AccessManager, LimitOrderEngine, PT bridge, and the informational `factory` / `spectra` fields) is checked against the Spectra address registry, [`@perspectivefi/addresses`](https://www.npmjs.com/package/@perspectivefi/addresses):

```bash
yarn check:registry
```

CI (`.github/workflows/registry-addresses.yml`) runs it on every pull request and on pushes to `master`. It guarantees that, for each network, each configured address equals the registry entry for the mapped key on that chain (for example `registry` -> `core.registry`, `limitOrderEngine` -> `limit-orders.engine`; the network -> chain id and field -> key maps are explicit at the top of `scripts/check-registry-addresses.cjs`). The check fails on:

-   an address that differs from the registry, or has no registry entry;
-   an address the registry marks `blocked`;
-   an address field in a config that has no registry key mapped;
-   an exception that no longer matches anything (stale).

The zero address is allowed: it means the data source is disabled on that network. The script is read-only; it never changes a config or a manifest, and it does not check start blocks.

To accept a known difference, add an entry to `registry-address-exceptions.json` with a reason that says what is live on-chain and why the difference is intended:

```json
[
    {
        "network": "base",
        "field": "limitOrderEngine",
        "address": "0x782cB7b327FCfb66C069c433b9380576ef619e3c",
        "reason": "..."
    }
]
```

`network` is the config file name (`base` for `src/configs/base.json`), `field` is the config key, and `address` is the configured value. If the registry is the one that is wrong, fix it in the registry repo and bump `@perspectivefi/addresses` here instead of adding an exception. To pick up registry changes: `yarn upgrade @perspectivefi/addresses`.

## Code Generation

After generating the configuration file for your target network, generate the AssemblyScript types (identical for all networks):

```bash
yarn codegen subgraph.mainnet.yaml
```

## Building and Deploying

To build the subgraph:

```bash
graph build <subgraph-file.yaml>
```

To deploy to a Graph Node (hosted service or decentralized network), use the standard `graph deploy` command, or e.g. `goldsky subgraph deploy`. You will need an access token.

```bash
graph deploy --product hosted-service <GITHUB_USER>/<SUBGRAPH_NAME> <subgraph-file.yaml>
```

### Release provenance

Direct pushes to `master` are prohibited. Every pull request must increase the
semantic version in `package.json`; after merge, GitHub creates the matching
immutable `v<version>` tag on the exact `master` commit. The canonical tagged
line starts at `v1.6.5`. The earlier `1.6.0` tag belongs to `master`, while
`v1.6.3` and `v1.6.4` were created from a separate feature branch and remain
unchanged as historical records. `v2.0.0` is reserved for the schema-breaking
release that removes the MetaVault entities.

Goldsky deployment is never triggered by GitHub Actions. An operator must
explicitly select an existing tag whose commit belongs to `master`, check out
that tag with a clean working tree, build it, and use the same version in the
Goldsky deployment slug. Reusing a Goldsky version for different source code is
not allowed.

## Project Structure

-   `abis/`: Smart contract ABIs.
-   `src/`: Source code for mappings and configurations.
    -   `configs/`: Network-specific configuration JSON files.
    -   `mappings/`: AssemblyScript handlers for contract events.
    -   `scripts/`: Helper scripts (e.g., config generator).
-   `schema.graphql`: The GraphQL schema defining the entities.
-   `subgraph.template.yaml`: The Mustache template for the subgraph manifest.

## Key Entities

-   **Future**: Represents Future Vaults (PT/IBT).
-   **Pool**: Represents AMM pools (Curve V1, NG, SNG).
-   **LimitOrder**: Tracks limit orders via the LimitOrderEngine.
-   **Account**: User accounts and their portfolios.
-   **Asset**: Tokens and assets indexed by the subgraph.

## Testing

Run unit tests using Matchstick:

```bash
yarn test
```
