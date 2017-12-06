var Web3 = require('web3');
var BigNumber = require('bignumber.js');
var BRDCrowdsaleTruffle = artifacts.require("BRDCrowdsale");
var constants = require('../constants');
var waitForConfirmation = require('./lib').waitForConfirmation;

var web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
web3.BigNumber = BigNumber;

var allocations = {
    ropsten: {
        address: '0x3ACaCa20173dAb62804898a99047485D6e536Fe4',
        users: [
            ['0x001702423633bF0Bdba9d357403940A6A2F860f5', 1125],
        ]
    }
}

var networks = {
    1: "homestead",
    3: "ropsten"
};

module.exports = function(cb) {
    return Promise.all([web3.eth.getAccounts(), web3.eth.net.getId()]).then(function(res) {
        accounts = res[0];
        network = networks[res[1]] || 'development';
        console.log('from account:', accounts[0]);
        console.log('network:', network);
        var c = constants(web3, accounts, network);
        var allocation = allocations[network];
        var crowdsale = BRDCrowdsaleTruffle.at(allocation.address);
        var promises = [];
        for (var i = 0; i < allocation.users.length; i++) {
            var user = allocation.users[i];
            var amount = '0x' + (new BigNumber(user[1]).mul(c.exponent)).toString(16);
            console.log('locking up', user[0], amount);
            promises.push(
                crowdsale.lockupTokens(user[0], amount, {from: accounts[0], gas: 4700000}).then(function(txResult) {
                    return waitForConfirmation(web3, txResult);
                })
            );
        }
        Promise.all(promises).then(function(results) {
            for (var i = 0; i < results.length; i++) {
                console.log('allocated', allocation.users[i][1], 'to', allocation.users[i][0], 'txhash', results[i].tx);
            }
            cb();
        }).catch(function(err) {
            console.log('error:', err);
            cb('failed');
        });
    });
}