module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*" // Match any network id
    },
    mainnet: {
      host: "localhost",
      port: 8545,
      network_id: 1,
    },
    kovan: {
      host: "localhost",
      port: 8545,
      network_id: 42,
      gas: 4704580,
    },
    ropsten: {
      host: "localhost",
      port: 8545,
      network_id: 3,
      gas: 4700036,
    }
  }
};
