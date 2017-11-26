var BRDCrowdsale = artifacts.require("BRDCrowdsale");
var constants = require('../constants.js');

module.exports = function(deployer, network, accounts) {
  var c = constants(web3, accounts, network);

  deployer.deploy(
    BRDCrowdsale,
    c.cap, c.minContribution, c.maxContribution,
    c.startTime, c.endTime, c.rate, c.ownerShare,
    c.wallet, c.authorizer,
    c.numIntervals, c.intervalDuration
  ).then(function() {
    // XXX: temporary, put actual presale allocations here
    var crowdsale = BRDCrowdsale.at(BRDCrowdsale.address);
    for (let i = 0; i < accounts.length; i++) {
      crowdsale.lockupTokens(accounts[i], (new web3.BigNumber(6).mul(c.exponent)));
    }
  });
};
