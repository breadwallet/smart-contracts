var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var BRDCrowdsaleAuthorizer = artifacts.require('BRDCrowdsaleAuthorizer');
var constants = require('../constants.js');

var authorizers = {
    'ropsten': [
        ['0x001702423633bF0Bdba9d357403940A6A2F860f5', '0x0ce2ad051ce97a3d4623c62ae2edc88413f65da8']
    ]
};

module.exports = function(deployer, network, accounts) {
    // deployer.then(function() {
    //     var c = constants(web3, accounts, network);
    //     var crowdsale;
    //     BRDCrowdsale.deployed().then(function(crowdsaleInstance) {
    //         crowdsale = crowdsaleInstance;
    //         crowdsale.authorizer.call().then(function(authorizerAddr) {
    //             var authorizer = BRDCrowdsaleAuthorizer.at(authorizerAddr);
    //             authorizers[network].forEach(function(account) {
    //                 authorizer.addAuthorizer(account);
    //             });
    //         });
    //     });
    // });
}
