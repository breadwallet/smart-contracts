var HDWalletProvider = require("truffle-hdwallet-provider");
// var mnemonic = process.env.MNEMONIC;

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8547,
      network_id: "*" // Match any network id
    },
    mainnet: {
      host: "localhost",
      port: 8545,
      network_id: 1,
      gas: 4600000,
      gasPrice: 45000000000,
      // provider: function() {
      //   return new HDWalletProvider(mnemonic, "https://mainnet.infura.io/xSXzvbe1qPb1uMVIyJH8");
      // },
    },
    kovan: {
      host: "localhost",
      port: 8545,
      network_id: 42,
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: 3,
      gas: 4700000,
    }
  }
};
