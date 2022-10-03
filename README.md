# APWine-v2-subgraph

[APWine](https://www.apwine.fi/) is the ultimate marketplace for yield derivatives and the first protocol for future yield tokenisation.

## Networks and Performance

This subgraph can be found on The Graph Hosted Service for the following networks:

-   [Mainnet](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph)
-   [Polygon](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph-polygon)
-   [Arbitrum One](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph-arbitrum)

You can also run this subgraph locally, if you wish. Instructions for that can be found in [The Graph Documentation](https://thegraph.com/docs/en/cookbook/quick-start/).

## Prerequisites

-   [Foundry](https://getfoundry.sh/), along with `anvil` (included)
-   The [IPFS CLI](https://docs.ipfs.tech/install/command-line/)
-   A running instance of [Postgres](https://www.postgresql.org/docs/current/server-start.html)
    -   The quickest way to get this up and running is through the official [Docker image](https://hub.docker.com/_/postgres) (`docker run -it --rm --network some-network postgres psql -h some-postgres -U postgres`).
-   The [cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html) Rust package manager
-   The [Graph CLI](https://thegraph.com/docs/en/cookbook/quick-start/)

## Setup

### 1. Install subgraph dependencies

```properties
yarn
```

### 2. Generate subgraph config per network

-   Mainnet

```properties
yarn generate-config
```

-   other supported networks

```properties
yarn generate-config:<NETWORK>
```

### 3. Generate contract and schema dependencies

This step will load all contract ABIs used by our subgraph and generate the corresponding TypeScript interfaces.

```properties
yarn codegen
```

## Local development

To deploy and run test scenarios on the locally running blockchain:

### 1. Run local blockchain with predefined genesis timestamp

```properties
anvil --timestamp 100
```

### 2. Configure and run ipfs

```properties
ipfs init
ipfs daemon
```

### 3. Create new database

```properties
createdb db_subgraph
```

### 4. Clone local graph node

```properties
git clone https://github.com/graphprotocol/graph-node/
```

### 5. Run the graph-node cloned in the previous step with setup

```properties
RUST_BACKTRACE=1 cargo run -p graph-node --release -- \
--postgres-url postgresql://<USER>:@localhost:5432/db_subgraph \
--ethereum-rpc mainnet:http://127.0.0.1:8545 \
--ipfs 127.0.0.1:5001 \
--debug
```

### 6. Go back to the subgraph repository and generate config file for local development

```properties
yarn generate-config:local
```

### 7. Create local node

```properties
yarn create:local
```

### 8. Deploy subgraph locally

```properties
yarn deploy:local
```

### 9. Go to `core-v2` repository and install its dependencies

```properties
npm i
```

### 10. Run test scenarios on the running blockchain

```properties
forge test --fork-url http://localhost:8545
```

### 11. For playground go to

```properties
http://127.0.0.1:8000/subgraphs/name/apwine/apwine-v2-subgraph/graphql
```

### Deployment

### 1. Generate subgraph config file for the network you want to deploy the subgraph

-   Mainnet

```properties
yarn generate-config
```

-   other supported networks

```properties
generate-config:<NETWORK>
```

### 2. Generate contract and schema dependencies

```properties
yarn codegen
```

### 3. Create subgraph

```properties
yarn create
```

### 4. Authorize your TheGraph account

```properties
graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>
```

### 5. Deploy the subgraph

-   Mainnet

```properties
yarn deploy
```

-   other network

```properties
yarn deploy:<NETWORK>
```

#### IMPORTANT: If your network is not supported you have to go to `src/configs` and add new config file.

## Example queries

Coming soon

```

```
