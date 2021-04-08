import merge from 'lodash/merge';
import mainnet from '@/config/mainnet.json';
import testnet from '@/config/testnet.json';
import { tokensTestnet } from '@/helpers/tokens';
import { tokensMainnet } from '@/helpers/tokens';

const configs = { mainnet, testnet };

configs.testnet = merge(tokensTestnet, configs.testnet);
configs.mainnet = merge(tokensMainnet, configs.mainnet);

const network = process.env.VUE_APP_NETWORK || 'testnet';
const config = configs[network];

export default config;
