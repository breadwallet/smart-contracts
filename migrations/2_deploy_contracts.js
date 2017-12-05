var BRDCrowdsale = artifacts.require("BRDCrowdsale");
var BRDCrowdsaleAuthorizer = artifacts.require("BRDCrowdsaleAuthorizer");
var BRDToken = artifacts.require("BRDToken");
var BRDLockup = artifacts.require("BRDLockup");
var constants = require('../constants.js');

function errOut(msg) {
  return function() {
    console.log(msg, arguments);
    // process.abort();
  }
}

module.exports = function(deployer, network, accounts) {
  var c = constants(web3, accounts, network);

  // this is the plan:
  // deploy BRDCrowdsaleAuthorizer
  // deploy BRDToken
  // deploy BRDLockup
  // deploy BRDCrowdsale
  // set owner of BRDToken, BRDLockup, BRDCrowdsaleAuthorizer to BRDCrowsdale
  // set the `token` `lockup` and `authorizer` of BRDCrowdsale
  // add token lockups

  deployer.deploy([
    BRDCrowdsaleAuthorizer,
    BRDToken,
    [BRDLockup, c.endTime, c.numIntervals, c.intervalDuration]
  ]).then(function() {
    deployer.deploy(
      BRDCrowdsale,
      c.cap, c.minContribution, c.maxContribution,
      c.startTime, c.endTime,
      c.rate, c.ownerRate, c.bonusRate,
      c.wallet,
    ).then(function() {
      BRDCrowdsaleAuthorizer.at(BRDCrowdsaleAuthorizer.address).addAuthorizer(accounts[0])
        .catch(errOut('MIGRATE: error setting accounts[0] as authorizer'))
        .then(function() {
          BRDCrowdsaleAuthorizer.at(BRDCrowdsaleAuthorizer.address).transferOwnership(BRDCrowdsale.address)
            .catch(errOut('MIGRATE: error transfering authorizer ownership'));
          BRDToken.at(BRDToken.address).transferOwnership(BRDCrowdsale.address)
            .catch(errOut('MIGRATE: error transfering token ownership'));
          BRDLockup.at(BRDLockup.address).transferOwnership(BRDCrowdsale.address)
            .catch(errOut('MIGRATE: error transfering lockup ownership'));
          
          var crowdsale = BRDCrowdsale.at(BRDCrowdsale.address);
          
          crowdsale.setAuthorizer(BRDCrowdsaleAuthorizer.address)
            .catch(errOut('MIGRATE: error setting authorizer'));
          
          crowdsale.setToken(BRDToken.address).then(function() {
            crowdsale.setLockup(BRDLockup.address).then(function() {
              
            }).catch(errOut('MIGRATE: error setting lockup'));
          }).catch(errOut('MIGRATE: error setting token'));
        });
    }).catch(errOut('MIGRATE: error deploying crowdsale'));
  }).catch(errOut('MIGRATE: error deploying initial contracts'));  
};
