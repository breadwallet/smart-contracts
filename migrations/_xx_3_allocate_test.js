var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var constants = require('../constants.js');

// this will allocate test tokens to 0x9e2bA8D116EF91C070dAAb4f043EAd3518206C97
module.exports = function(deployer, network, accounts) {
    deployer.then(function() {
        var c = constants(web3, accounts, network);
        var crowdsale = BRDCrowdsale.at('0x214a6e8a4510828dab101afc4e0a5859c62c44e1');
        crowdsale.allocateTokens('0x9e2bA8D116EF91C070dAAb4f043EAd3518206C97', new web3.BigNumber(900).mul(c.exponent));
    });
}
