var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var constants = require('../constants.js');

// this will allocate test tokens to 0x9e2bA8D116EF91C070dAAb4f043EAd3518206C97
module.exports = function(deployer, network, accounts) {
    deployer.then(function() {
        var c = constants(web3, accounts, network);
        var crowdsale = BRDCrowdsale.at('0x87164af5fe104e27a49b210752db8f7a57f7dc54');
        crowdsale.finalize();
    });
}
