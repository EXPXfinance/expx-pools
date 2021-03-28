<template>
  <Page>
    <Container>
      <Filters :value="filters" v-model="filters" />
    </Container>
    <ListPools :query="query" :key="JSON.stringify(query)" />
  </Page>
</template>

<script>
import { clone, formatFilters } from '@/helpers/utils';

export default {
  data() {
    return {
      filters: formatFilters(this.$route.query)
    };
  },
  watch: {
    filters() {
      const query = formatFilters(this.filters);
      if (query.token && query.token.length === 0) delete query.token;
      if (query.type && (query.type.length === 0 || query.type === 'shared'))
        delete query.type;
      this.$router.push({ name: 'explore', query: clone(query) });
    }
  },
  computed: {
    query() {
      let query = clone(this.querySharedPools);
      const filters = formatFilters(this.filters);
      if (filters.type === 'smart') query = this.querySmartPools;
      if (filters.type === 'private') query = this.queryPrivatePools;
      if (filters.token && filters.token.length > 0) {
        query.where.tokensList_contains = filters.token;
      }
      return query;
    },
    querySharedPools() {
      return {
        where: {
          finalized: true
        }
      };
    },
    querySmartPools() {
      return {
        where: {
          crp: true
        }
      };
    },
    queryPrivatePools() {
      return {
        where: {
          finalized: false,
          crp: false
        }
      };
    }
  }
};
</script>
