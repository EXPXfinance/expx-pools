import Vue from 'vue';
import { getAddress } from '@ethersproject/address';
import config from '@/config';

const state = {
  values: {}
};

const mutations = {
  GET_PRICE_REQUEST() {
    console.debug('GET_PRICE_REQUEST');
  },
  GET_PRICE_SUCCESS(_state, payload) {
    for (const address in payload) {
      const price = payload[address];
      Vue.set(_state.values, address, price);
    }
    console.debug('GET_PRICE_SUCCESS');
  }
};

const actions = {
  loadPricesById: async ({ commit }, payload) => {
    commit('GET_PRICE_REQUEST');
    const idString = payload.join('%2C');
    let data;
    try {
      const url = `${config.backendUrl}/token/prices?tokens=${idString}`;
      const response = await fetch(url);
      data = await response.json();
    } catch (e) {
      return;
    }

    const symbolToAddressMap = {};
    for (const address in config.tokens) {
      const symbol = config.tokens[address].symbol;
      if (!symbol) {
        continue;
      }
      symbolToAddressMap[symbol] = address;
    }

    const prices = {};
    for (const id in data) {
      const price = data[id];
      const address = symbolToAddressMap[id];
      prices[address] = price;
    }

    commit('GET_PRICE_SUCCESS', prices);
  },
  loadPricesByAddress: async ({ commit }, payload) => {
    commit('GET_PRICE_REQUEST');
    const contractString = payload.join('%2C');
    let data;
    try {
      const url = `${config.backendUrl}?addresses=${contractString}`;
      const response = await fetch(url);
      data = await response.json();
    } catch (e) {
      return;
    }
    const prices = {};
    for (const address in data) {
      const price = data[address].usd;
      prices[getAddress(address)] = price;
    }
    commit('GET_PRICE_SUCCESS', prices);
  }
};

export default {
  state,
  mutations,
  actions
};
