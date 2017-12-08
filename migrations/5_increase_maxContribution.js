var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var constants = require('../constants.js');

var updates = {
    ropsten: {
        newMax: 100, // eth 
        timeAfterStart: 2 * 3600, // 2 hrs 
    },
    mainnet: {
        newMax: 3000, // eth 
        timeAfterStart: 24 * 3600, // 24 hrs
    }
};

module.exports = function(deployer, network, accounts) {
    // deployer.then(function() {
    //     var c = constants(web3, accounts, network);
    //     var crowdsale;
    //     BRDCrowdsale.deployed().then(function(crowdsaleInstance) {
    //         crowdsale = crowdsaleInstance;
    //         var update = updates[network];
    //         var now = Math.floor(Date.now() / 1000);
    //         var needsTime = c.startTime + update.timeAfterStart;
    //         if (now > needsTime) {
    //             crowdsale.setMaxContribution((new web3.BigNumber(update.newMax)).mul(c.exponent));
    //         } else {
    //             throw 'not time yet time now =' + now + ' expecting time =' + needsTime;
    //         }
    //     });
    // });
}
