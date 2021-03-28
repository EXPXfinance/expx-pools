<template>
  <UiTable class="p-4">
    <div v-if="ePool.config.about" class="mb-3">
      <div v-text="$t('description')" class="mb-2" />
      <h5
        v-text="ePool.config.about"
        class="text-white mb-2"
        style="max-width: 580px;"
      />
      <h5 v-if="ePool.config.learn_more">
        <a :href="ePool.config.learn_more" target="_blank">
          {{ $t('learnMore') }}
          <Icon name="external-link" size="16" class="ml-1 mr-2" />
        </a>
      </h5>
    </div>
    <div class="mb-3">
      <div v-text="$t('poolType')" class="mb-2" />
      <h5 v-text="ePool.getTypeStr()" class="text-white" />
    </div>
    <div v-if="ePool.metadata.tokens.length == 0">
      <div class="d-flex flex-items-center p-4 warning-box">
        <Icon name="warning" size="22" class="mr-4" />
        <div v-text="$t('deadPoolWarning')" />
      </div>
      <br />
    </div>
    <div v-if="ePool.isCrp()" class="mb-3">
      <div v-text="$t('rights')" class="mb-2" />
      <template v-if="Object.keys(rights).length > 0">
        <div v-for="(right, key) in rights" :key="key">
          <h5 v-text="poolRights[key]" class="text-white mb-1" />
        </div>
      </template>
      <h5 v-else v-text="$t('none')" class="text-white" />
    </div>
    <div v-if="ongoingUpdate" class="mb-3">
      <div
        v-if="this.web3.blockNumber > 0"
        class="d-flex flex-items-center p-4 warning-box"
      >
        <Icon name="warning" size="22" class="mr-4" />
        <div
          v-if="updateFinished"
          v-text="$t('updateFinishedWarning', { endTime })"
        />
        <div
          v-else
          v-html="
            $t('ongoingUpdate', {
              startTime,
              startBlock: ePool.metadata.startBlock,
              endTime,
              endBlock: ePool.metadata.endBlock
            })
          "
        />
      </div>
      <div v-else class="d-flex flex-items-center p-4 warning-box">
        <Icon name="warning" size="22" class="mr-4" />
        <div v-text="$t('ongoingUpdateLoading')" />
      </div>
    </div>
    <div v-if="ePool.isCrp() && lbpData.isLbpPool">
      <h5
        v-text="
          `${$t('currentPrice', { token: lbpData.projectToken })}: ${_num(
            lbpData.lbpPrice,
            'usd'
          )}`
        "
        format="currency"
        class="text-white"
      />
      <br />
    </div>
    <div v-if="rights.canChangeWeights" class="mb-3">
      <div v-text="$t('minimumUpdatePeriod')" class="mb-2" />
      <h5
        v-text="_num(ePool.metadata.minimumWeightChangeBlockPeriod)"
        class="text-white"
      />
    </div>
    <div v-if="rights.canAddRemoveTokens" class="mb-3">
      <div v-text="$t('addTokenTimelock')" class="mb-2" />
      <h5
        v-text="_num(ePool.metadata.addTokenTimeLockInBlocks)"
        class="text-white"
      />
    </div>
    <div v-if="rights.canChangeCap" class="mb-3">
      <div v-text="$t('cap')" class="mb-2" />
      <h5 class="text-white">
        <div
          v-if="ePool.metadata.espCap.toString() === MAX"
          v-text="$t('unlimited')"
        />
        <div v-else v-text="_num(ePool.metadata.espCap)" />
      </h5>
    </div>
    <div class="mb-3">
      <div
        v-text="ePool.metadata.finalized ? $t('creator') : $t('controller')"
        class="mb-2"
      />
      <h5>
        <a
          :href="_bscScanLink(ePool.metadata.controller, 'token')"
          target="_blank"
          class="text-white"
        >
          <Avatar :address="ePool.metadata.controller" class="mr-1" />
          {{ _shortenAddress(ePool.metadata.controller) }}
          <Icon name="external-link" size="16" class="ml-1" />
        </a>
      </h5>
    </div>
    <div v-if="ePool.isCrp() && ePool.metadata.crpController" class="mb-3">
      <div v-text="$t('smartPoolController')" class="mb-2" />
      <h5>
        <a
          :href="_bscScanLink(ePool.metadata.crpController)"
          target="_blank"
          class="text-white"
        >
          <Avatar :address="ePool.metadata.crpController" class="mr-1" />
          {{ _shortenAddress(ePool.metadata.crpController) }}
          <Icon name="external-link" size="16" class="ml-1" />
        </a>
      </h5>
    </div>
    <div class="mb-3">
      <div v-text="$t('creationDate')" class="mb-2" />
      <h5>
        <a
          :href="_bscScanLink(ePool.metadata.tx, 'tx')"
          target="_blank"
          class="text-white"
        >
          {{ $d(ePool.metadata.createTime * 1e3, 'long') }}
          <Icon name="external-link" size="16" class="ml-1" />
        </a>
      </h5>
    </div>
    <template v-if="ePool.metadata.finalized">
      <div class="mb-3">
        <div v-text="$t('eptAsset')" class="mb-2" />
        <h5>
          <a
            :href="_bscScanLink(ePool.address, 'token')"
            target="_blank"
            class="text-white"
          >
            <Token :address="ePool.address" class="v-align-middle mr-1" />
            {{ _shortenAddress(ePool.address) }}
            <Icon name="external-link" size="16" class="ml-1" />
          </a>
        </h5>
      </div>
      <div class="mb-3">
        <div v-text="$t('eptTotalSupply')" class="mb-2" />
        <h5 v-text="_num(ePool.metadata.totalShares)" class="text-white" />
      </div>
    </template>

    <div class="mb-3">
      <div v-text="$t('publicSwap')" class="mb-2" />
      <h5
        v-text="ePool.metadata.publicSwap ? 'Enabled' : 'Disabled'"
        class="text-white"
      />
    </div>
    <div class="mb-3">
      <div v-text="$t('swapFee')" class="mb-2" />
      <h5 v-text="_num(ePool.metadata.swapFee, 'percent')" class="text-white" />
    </div>
    <div class="mb-3">
      <div v-text="$t('totalSwapVolume')" class="mb-2" />
      <h5
        v-text="_num(ePool.metadata.totalSwapVolume, 'usd')"
        class="text-white"
      />
    </div>
    <div class="mb-3">
      <div v-text="$t('totalSwapFee')" class="mb-2" />
      <h5
        v-text="_num(ePool.metadata.totalSwapFee, 'usd')"
        class="text-white"
      />
    </div>
    <div class="mb-3">
      <div v-text="$t('liquidityMiningFactors')" class="mb-2" />
      <h5
        v-text="`${$t('feeFactor')}: ${factors.feeFactor.toFixed(4)}`"
        class="text-white"
      />
    </div>
  </UiTable>
</template>

<script>
import {
  filterObj,
  poolRights,
  MAX,
  blockNumberToTimestamp
} from '@/helpers/utils';
import { mapActions } from 'vuex';
import { getLbpData } from '@/helpers/lbpData';
import { getFactors } from '@/helpers/miningFactors';

export default {
  props: ['ePool', 'pool'],
  data() {
    return {
      poolRights,
      MAX,
      page: 0,
      swaps: []
    };
  },
  computed: {
    factors() {
      return getFactors(this.ePool, this.config.chainId);
    },
    rights() {
      return filterObj(this.ePool.metadata.rights, right => right[1]);
    },
    ongoingUpdate() {
      return this.ePool.isCrp() && this.ePool.metadata.startBlock !== '0';
    },
    lbpData() {
      return getLbpData(this.pool, this.config.chainId);
    },
    updateFinished() {
      return (
        this.ongoingUpdate &&
        this.web3.blockNumber >= this.ePool.metadata.endBlock
      );
    },
    startTime() {
      return this.blockDate(this.ePool.metadata.startBlock);
    },
    endTime() {
      return this.blockDate(this.ePool.metadata.endBlock);
    }
  },
  methods: {
    ...mapActions(['getLbpSwaps']),
    blockDate(block) {
      const blockTimestamp = blockNumberToTimestamp(
        Date.now(),
        this.web3.blockNumber,
        block
      );
      return new Date(blockTimestamp).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
};
</script>
