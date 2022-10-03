# APWine-v2-subgraph

[APWine](https://www.apwine.fi/) is the ultimate marketplace for yield derivatives and the first protocol for future yield tokenisation.

## Networks and Performance

This subgraph can be found on The Graph Hosted Service for the following networks:

-   [Mainnet](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph)
-   [Polygon](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph-polygon)
-   [Arbitrum One](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph-arbitrum)

You can also run this subgraph locally, if you wish. Instructions for that can be found in [The Graph Documentation](https://thegraph.com/docs/en/cookbook/quick-start/).

## Setup

1. Install subgraph dependencies

```properties
yarn
```

2. Generate contract and schema dependencies

```properties
yarn codegen
```

3. Generate subgraph config per network

-   Mainnet

```properties
yarn generate-config
```

-   other supported networks

```properties
yarn generate-config:<NETWORK>
```

## Local development

To deploy and run test scenarios on the locally running blockchain:

1. Run local blockchain with predefined genesis timestamp

```properties
anvil --timestamp 100
```

2. Configure and run ipfs

```properties
ipfs init
ipfs daemon
```

3. Create new database

```properties
createdb db_subgraph
```

4. Clone local graph node

```properties
git clone https://github.com/graphprotocol/graph-node/
```

5. Run the graph-node cloned in the previous step with setup

```properties
RUST_BACKTRACE=1 cargo run -p graph-node --release -- \
--postgres-url postgresql://<USER>:@localhost:5432/db_subgraph \
--ethereum-rpc mainnet:http://127.0.0.1:8545 \
--ipfs 127.0.0.1:5001 \
--debug
```

6. Go back to the subgraph repository and generate config file for local development

```properties
yarn generate-config:local
```

7. Create local node

```properties
yarn create:local
```

8. Deploy subgraph locally

```properties
yarn deploy:local
```

9. Go to `core-v2` repository and install its dependencies

```properties
npm i
```

10. Run test scenarios on the running blockchain

```properties
forge test --fork-url http://localhost:8545
```

11. For playground go to

```properties
http://127.0.0.1:8000/subgraphs/name/apwine/apwine-v2-subgraph/graphql
```

### Deployment

1. Generate subgraph config file for the network you want to deploy the subgraph

-   Mainnet

```properties
yarn generate-config
```

-   other supported networks

```properties
generate-config:<NETWORK>
```

2. Generate contract and schema dependencies

```properties
yarn codegen
```

3. Create subgraph

```properties
yarn create
```

4. Authorize your TheGraph account

```properties
graph auth https://api.thegraph.com/deploy/ <ACCESS_TOKEN>
```

5. Deploy the subgraph

-   Mainnet

```properties
yarn deploy
```

-   other network

```properties
yarn deploy:<NETWORK>
```

#### IMPORTANT: If your network is not supported you have to go to `src/configs` and add new config file.

## Schema

1. Major subgraph entities
2. Sub entities (extensions for main entities)
3. Enums

**1. Major subgraph entities**

```properties
Future - all the FutureVault details and its relations to other entities
```

```properties
Asset - details of an any token seen in the indexed protocol
```

```properties
User - wallet seen in any indexed protocol (except FutureVaults) and its relations to other subgraph entities
```

```properties
Transaction - to store history of all the transactions with relations to Future, User and Assets
```

**2. Sub entities for**

_Future:_

```properties
FutureVaultFactory - TODO
```

```properties
Platform - IBT platform (not an enum to be able to expand list of platforms)
```

_Asset:_

```properties
AssetPrice - to connect exact token with price
```

```properties
AssetAmount - to define amount of token in relation to indexed asset
```

```properties
UserAsset - to store and update user portfolio of assets
```

```properties
ChainlinkAggregatorProxy - to connect an asseet to its Chainlink aggregator
```

```properties
LPTokenDetails - to store LP token detais if asset is LP
```

```properties
FYTTokenDetails - to store FYT token detais if asset is FYT
```

_User:_

```properties
FeeClaim - to store history of the fee claims with its details
```

**3. Enums** - fixed option for a field

## Example queries

Coming soon

```

```
