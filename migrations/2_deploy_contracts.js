var BRDCrowdsale = artifacts.require("BRDCrowdsale");
var BRDCrowdsaleAuthorizer = artifacts.require("BRDCrowdsaleAuthorizer");
var BRDToken = artifacts.require("BRDToken");
var BRDLockup = artifacts.require("BRDLockup");
var WalletSimple = artifacts.require("WalletSimple");
var constants = require('../constants.js');

function errOut(msg) {
  return function() {
    console.log(msg, arguments);
    // process.abort();
  }
}

var initialAuthorizers = {
  'ropsten': ['0x001702423633bF0Bdba9d357403940A6A2F860f5', '0x0ce2ad051ce97a3d4623c62ae2edc88413f65da8'],
  'mainnet': ['0xa768cc13d1ab64283882ffa74255bb0564a7592b', '0x1e4b9fd7a1ccee6dee97c2608e92fbee6e1f04c6'],
  'development': [],
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
    [WalletSimple, [accounts[0], accounts[0], accounts[0]]],
    BRDCrowdsaleAuthorizer,
    BRDToken,
    [BRDLockup, c.endTime, c.numIntervals, c.intervalDuration]
  ]).then(function() {
    deployer.deploy(
      BRDCrowdsale,
      c.cap, c.minContribution, c.maxContribution,
      c.startTime, c.endTime,
      c.rate, c.ownerRate, c.bonusRate,
      WalletSimple.address, WalletSimple.address,
    ).then(function() {
      var authorizer = BRDCrowdsaleAuthorizer.at(BRDCrowdsaleAuthorizer.address);
      authorizer.addAuthorizer(accounts[0])
        .catch(errOut('MIGRATE: error setting accounts[0] as authorizer'))
        .then(function() {
          authorizer.transferOwnership(BRDCrowdsale.address)
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

          var authorized = initialAuthorizers[network];
          authorized.forEach(function(acct) {
            authorizer.addAuthorizer(acct, {from: accounts[0]})
              .catch(errOut('MIGRATE: error authorizing user'));
          });
        });
    }).catch(errOut('MIGRATE: error deploying crowdsale'));
  }).catch(errOut('MIGRATE: error deploying initial contracts'));  
};
