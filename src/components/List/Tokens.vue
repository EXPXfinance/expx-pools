<template>
  <div class="text-white">
    <ListToken
      v-for="token in pool.tokens"
      :key="token.address"
      :pool="pool"
      :ePool="ePool"
      :token="token"
    />
  </div>
</template>

<script>
export default {
  props: ['pool', 'ePool']
};
</script>
