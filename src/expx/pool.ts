import merge from 'lodash/merge';
import { getAddress, isAddress } from '@ethersproject/address';
import { multicall, subgraphRequest } from './utils';
import provider from '@/helpers/provider';
import abi from '@/helpers/abi';
import { poolRights, formatPool } from '@/helpers/utils';
import { formatUnits } from '@ethersproject/units';
import queries from '@/helpers/queries.json';
import config from '@/config';

//TODO add pools in whitelist
const pools = {};

export default class Pool {
  public readonly address: string;
  public readonly checksum: string;
  public ready = false;
  public config: any;
  public metadata?: any;

  constructor(address: string) {
    this.address = address.toLowerCase();
    this.checksum = isAddress(address) ? getAddress(address) : '';
    this.config = this.isWhitelisted() ? pools[this.address] : {};
  }

  isWhitelisted() {
    return Object.keys(pools)
      .map(crp => crp.toLowerCase())
      .includes(this.address);
  }

  getTypeStr() {
    return this.metadata.finalized
      ? 'Shared'
      : this.isCrp()
      ? 'Smart pool'
      : 'Private';
  }

  getEptPrice() {
    if (
      !this.metadata.liquidity ||
      !this.metadata.totalShares ||
      this.metadata.totalShares == 0 ||
      (!this.metadata.finalized && !this.isCrp())
    )
      return 0;
    return this.metadata.liquidity / this.metadata.totalShares;
  }

  isCrp() {
    if (this.isWhitelisted() && this.config.is_compatible) return true;
    return this.metadata.crp;
  }

  getEptAddress() {
    if (this.config.eptAddress) return this.config.eptAddress;
    return this.isCrp() ? this.metadata.controller : this.address;
  }

  async getMetadata() {
    try {
      this.metadata = await this.getSubgraphMetadata();
      const metadata = await this.getNodeMetadata();
      this.metadata = { ...this.metadata, ...metadata };
      this.ready = true;
      return this.metadata;
    } catch (e) {
      return Promise.reject();
    }
  }

  async getNodeMetadata() {
    const address = this.getEptAddress();
    if (this.isCrp()) {
      const [
        publicSwap,
        name,
        decimals,
        symbol,
        totalShares,
        rights,
        espCap,
        crpController,
        minimumWeightChangeBlockPeriod,
        addTokenTimeLockInBlocks,
        { startBlock, endBlock }
      ] = await multicall(
        provider,
        abi['CRP'],
        [
          'isPublicSwap',
          'name',
          'decimals',
          'symbol',
          'totalSupply',
          'rights',
          'espCap',
          'getController',
          'minimumWeightChangeBlockPeriod',
          'addTokenTimeLockInBlocks',
          'gradualUpdate'
        ].map(method => [address, method, []])
      );
      return {
        publicSwap: publicSwap[0],
        name: name.toString(),
        symbol: symbol.toString(),
        totalShares: formatUnits(totalShares.toString(), decimals),
        rights: Object.fromEntries(
          Object.entries(poolRights).map((right, i) => [right[0], rights[i]])
        ),
        espCap: formatUnits(espCap.toString(), decimals),
        crpController: crpController[0],
        minimumWeightChangeBlockPeriod: minimumWeightChangeBlockPeriod.toString(),
        addTokenTimeLockInBlocks: addTokenTimeLockInBlocks.toString(),
        startBlock: startBlock.toString(),
        endBlock: endBlock.toString()
      };
    }
    const [
      publicSwap,
      name,
      decimals,
      symbol,
      swapFee,
      totalShares
    ] = await multicall(
      provider,
      abi['EPool'],
      [
        'isPublicSwap',
        'name',
        'decimals',
        'symbol',
        'getSwapFee',
        'totalSupply'
      ].map(method => [address, method, []])
    );
    return {
      publicSwap: publicSwap[0],
      name: name.toString(),
      symbol: symbol.toString(),
      swapFee: formatUnits(swapFee.toString(), decimals),
      totalShares: formatUnits(totalShares.toString(), decimals),
      rights: [],
      espCap: 0,
      minimumWeightChangeBlockPeriod: 10,
      addTokenTimeLockInBlocks: 10,
      gradualUpdate: []
    };
  }

  async getSubgraphMetadata() {
    const swapTsStart = Math.round(new Date().getTime() / 1000) - 24 * 3600;
    const query = {
      pool: {
        __args: {
          id: this.address
        },
        swaps: {
          __args: {
            where: {
              timestamp_lt: swapTsStart
            }
          }
        }
      }
    };
    try {
      const response = await subgraphRequest(
        config.subgraphUrl,
        merge(queries['getPool'], query)
      );
      return formatPool(response.pool);
    } catch (e) {
      console.error(e);
    }
  }
}
