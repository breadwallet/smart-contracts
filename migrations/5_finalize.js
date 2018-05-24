var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var constants = require('../constants.js');

module.exports = function(deployer, network, accounts) {
    deployer.then(function() {
        var c = constants(web3, accounts, network);
        var crowdsale = BRDCrowdsale.at('0x5250776FAD5A73707d222950de7999d3675a2722');
        // crowdsale.finalize();
    });
}
