var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var constants = require('../constants.js');

var allocations = {
    'ropsten': [
        [0x001702423633bF0Bdba9d357403940A6A2F860f5, 33750],
        [0xc9f05F4dd7fc0e7F06DA06132f4cCB0abaC46089, 1125],
    ]
};

module.exports = function(deployer, network, accounts) {
    // deployer.then(function() {
    //     var c = constants(web3, accounts, network);
    //     var crowdsale;
    //     BRDCrowdsale.deployed().then(function(crowdsaleInstance) {
    //         crowdsale = crowdsaleInstance;
    //         allocations[network].forEach(function(val) {
    //             var account = val[0];
    //             var amount = (new web3.BigNumber(val[1])).mul(c.exponent);
    //             crowdsale.lockupTokens(account, amount);
    //         });
    //     });
    // });
}