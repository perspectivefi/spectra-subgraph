# APWine-v2-subgraph

[APWine](https://www.apwine.fi/) is the ultimate marketplace for yield derivatives and the first protocol for future yield tokenisation.

## Networks and Performance

This subgraph can be found on The Graph Hosted Service for the following networks:
- [Mainnet](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph)
- [Polygon](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph-polygon)
- [Arbitrum One](https://thegraph.com/hosted-service/subgraph/apwine/apwine-v2-subgraph-arbitrum)

You can also run this subgraph locally, if you wish. Instructions for that can be found in [The Graph Documentation](https://thegraph.com/docs/en/cookbook/quick-start/).

## Contracts

Coming soon

## Setup
Install necessary packages with `yarn start`

### Local

2a. Create subgraph by `yarn create:local`

3a. Deploy subgraph on your locally running blockchain by `yarn deploy:local`

### Deployment

2b. Create subgraph by `yarn create`

3b. Generate subgraph config file for the network you want to deploy the subgraph
(`yarn generate-config` for mainnet and `generate-config:NETWORK` for other networks).

4b. Authorize your TheGraph account `graph auth https://api.thegraph.com/deploy/ ACCESS_TOKEN`

5b. Deploy the subgraph by `yarn deploy` for mainnet and `yarn deploy:NETWORK` for other networks.

#### IMPORTANT: If your network is not supported you have to go to `src/configs` and add new config file.


## Example queries

Coming soon

````