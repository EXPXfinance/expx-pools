<template>
  <UiModal :open="open" @close="$emit('close')" style="max-width: 440px;">
    <h3 class="m-4 mb-0 text-center">About</h3>
    <div class="m-4 p-4 border rounded-2 text-white">
      <div class="d-flex">
        <span v-text="$t('version')" class="flex-auto text-gray mr-1" />
        {{ pkg.version }}
      </div>
      <div class="d-flex">
        <span v-text="$t('license')" class="flex-auto text-gray mr-1" />
        {{ pkg.license }}
      </div>
      <div class="d-flex">
        <span v-text="$t('network')" class="flex-auto text-gray mr-1" />
        {{ config.network }}
      </div>
      <div class="d-flex">
        <span v-text="$t('blockNumber')" class="flex-auto text-gray mr-1" />
        {{ _num(web3.blockNumber, 'long') }}
      </div>
    </div>
  </UiModal>
</template>

<script>
import pkg from '@/../package.json';

export default {
  props: ['open'],
  data() {
    return {
      pkg
    };
  }
};
</script>
