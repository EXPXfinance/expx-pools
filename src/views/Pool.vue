<template>
  <Page :loading="loading">
    <MessageSimilarPools
      v-if="pool.liquidity < 1e7 && pool.finalized"
      :pool="pool"
      class="mb-4"
    />
    <div class="d-block text-center text-md-left d-md-flex mb-3 mb-md-0">
      <PoolHeader :pool="ePool" class="flex-auto pb-3" />
      <div class="pb-3">
        <UiButton
          v-if="enableAddLiquidity && pool.tokens.length > 0"
          class="button-primary ml-2"
          @click="openAddLiquidityModal"
        >
          {{ $t('addLiquidity') }}
        </UiButton>
        <UiButton
          v-if="enableAddLiquidity && pool.tokens.length > 0"
          class="ml-2"
          @click="openRemoveLiquidityModal"
        >
          {{ $t('removeLiquidity') }}
        </UiButton>
      </div>
    </div>

    <MessageError
      v-if="pool.crp"
      :text="$t('smartPoolsUnderDev')"
      class="mb-4"
    />

    <PoolBoxes :pool="pool" :ePool="ePool" />
    <Chart :pool="pool" />
    <Tabs :pool="pool" />
    <router-view
      :key="$route.path"
      :pool="pool"
      :ePool="ePool"
      @reload="loadPool"
    />
    <portal to="modal">
      <ModalAddLiquidity
        :pool="pool"
        :ePool="ePool"
        :open="modalAddLiquidityOpen"
        @close="modalAddLiquidityOpen = false"
        @reload="loadPool"
      />
      <ModalRemoveLiquidity
        :pool="pool"
        :ePool="ePool"
        :open="modalRemoveLiquidityOpen"
        @close="modalRemoveLiquidityOpen = false"
        @reload="loadPool"
      />
      <ModalCustomToken
        :open="modalCustomTokenOpen"
        @close="modalCustomTokenOpen = false"
      />
    </portal>
  </Page>
</template>

<script>
import Vue from 'vue';
import { mapActions } from 'vuex';
import { getAddress } from '@ethersproject/address';
import Pool from '@/expx/pool';
import { bnum, scale } from '@/helpers/utils';

export default {
  data() {
    return {
      ePool: undefined,
      id: this.$route.params.id,
      pool: {},
      loading: false,
      modalAddLiquidityOpen: false,
      modalRemoveLiquidityOpen: false,
      modalCustomTokenOpen: false
    };
  },
  watch: {
    $route() {
      const id = this.$route.params.id;
      if (id !== this.id) {
        this.id = id;
        this.loadPool();
      }
    },
    'web3.account': async function(val, prev) {
      if (val && val.toLowerCase() !== prev) await this.loadPool();
    }
  },
  computed: {
    hasCustomToken() {
      if (!this.pool || !this.pool.tokens) return false;
      for (const token of this.pool.tokens) {
        const tokenMetadata = this.web3.tokenMetadata[token.checksum];
        if (!tokenMetadata || !tokenMetadata.whitelisted) return true;
      }
      return false;
    },
    enableAddLiquidity() {
      if (!this.ePool) return false;
      return this.pool.finalized || this.ePool.isCrp();
    },
    enableRemoveLiquidity() {
      return (
        this.config.chainId === this.web3.injectedChainId &&
        this.web3.account &&
        (Object.keys(this.subgraph.poolShares).includes(this.id) ||
          this.web3.balances[getAddress(this.id)])
      );
    }
  },
  methods: {
    ...mapActions([
      'getBalances',
      'getAllowances',
      'getPoolBalances',
      'loadTokenMetadata',
      'loadPricesByAddress'
    ]),
    openAddLiquidityModal() {
      this.modalAddLiquidityOpen = true;
    },
    openRemoveLiquidityModal() {
      this.modalRemoveLiquidityOpen = true;
    },
    async loadPool() {
      const ePool = new Pool(this.id);
      try {
        this.pool = await ePool.getMetadata();
        this.ePool = ePool;
      } catch (e) {
        return this.$router.push({ name: 'home' });
      }
      const unknownTokens = this.pool.tokensList.filter(
        tokenAddress => !this.web3.tokenMetadata[tokenAddress]
      );
      if (unknownTokens.length > 0) {
        await this.loadTokenMetadata(unknownTokens);
        await this.loadPricesByAddress(unknownTokens);
      }
      if (this.web3.account) {
        const data = await Promise.all([
          this.getBalances([
            ...this.pool.tokensList,
            getAddress(this.ePool.getEptAddress())
          ]),
          this.getAllowances(this.pool.tokensList),
          this.getPoolBalances({
            poolAddress: this.id,
            tokens: this.pool.tokensList
          })
        ]);
        this.fixPoolBalances(data[2]);
      }
    },
    fixPoolBalances(poolBalances) {
      for (const address in poolBalances) {
        const tokenIndex = this.pool.tokens.findIndex(
          token => token.checksum === address
        );
        const tokenDecimals = this.pool.tokens[tokenIndex].decimals;
        const poolBalance = scale(bnum(poolBalances[address]), -tokenDecimals);
        Vue.set(
          this.pool.tokens[tokenIndex],
          'balance',
          poolBalance.toString()
        );
      }
    }
  },
  async created() {
    this.loading = true;
    await this.loadPool();
    this.loading = false;
    setTimeout(() => {
      if (this.hasCustomToken && !this.ePool.isWhitelisted())
        this.modalCustomTokenOpen = true;
    }, 1e2);
  }
};
</script>
