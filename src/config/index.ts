import merge from 'lodash/merge';
import mainnet from '@/config/mainnet.json';
import { tokens } from '@/helpers/tokens';

const configs = { mainnet };
configs.mainnet = merge(tokens, configs.mainnet);

const network = process.env.VUE_APP_NETWORK || 'mainnet';
const config = configs[network];

export default config;
