var Web3 = require('web3');
var constants = require('../constants');
var BigNumber = require('bignumber.js');
// var abi = require('ethereumjs-abi');
var abi = require('web3-eth-abi');

var BRDCrowdsaleTruffle = artifacts.require("BRDCrowdsale");
var BRDCrowdsaleAuthorizerTruffle = artifacts.require("BRDCrowdsaleAuthorizer");
var BRDTokenTruffle = artifacts.require("BRDToken");
var BRDLockupTruffle = artifacts.require("BRDLockup");

var web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
web3.BigNumber = BigNumber;

var crowdsaleJson = require('../build/BRDCrowdsale.json')["contracts"]["build/flattened/BRDCrowdsale.sol:BRDCrowdsale"];
var authorizerJson = require('../build/BRDCrowdsaleAuthorizer.json')["contracts"]["build/flattened/BRDCrowdsaleAuthorizer.sol:BRDCrowdsaleAuthorizer"];
var lockupJson = require('../build/BRDLockup.json')["contracts"]["build/flattened/BRDLockup.sol:BRDLockup"];
var tokenJson = require('../build/BRDToken.json')["contracts"]["build/flattened/BRDToken.sol:BRDToken"];
var accounts;
var network;

var networks = {
    1: "homestead",
    3: "ropsten"
};

function makeArgs(args) {
    return args.map(function(arg) {
        if (typeof arg == 'object' || typeof arg == 'number') {
            return (new web3.BigNumber(arg)).toString();
        }
        return arg;
    });
}

function encodeConstructorArgs(types, args) {
    return abi.encodeParameters(types, args).substring(2);
}

function deploy(contract, name, opts) {
    console.log('deploying', name);
    var txn = contract.deploy(opts);
    return txn.send({
        from: accounts[0],
        gas: 4700000
    }).on('transactionHash', function(txHash) {
        console.log(name, 'transaction hash', txHash);
    });
}

function transferOwnership(contract, toContract) {
    var txn = contract.transferOwnership(toContract.address, {from: accounts[0], gas: 4700000});
    return txn;
}

function setThing(contract, thing, address) {
    var methodName = 'set' + thing.charAt(0).toUpperCase() + thing.slice(1);
    console.log('set thing', thing, address);
    var txn = contract[methodName](address, {from: accounts[0], gas: 4700000});
    return txn;
}

function doDeploy() {
    return Promise.all([web3.eth.getAccounts(), web3.eth.net.getId()]).then(function(res) {
        accounts = res[0];
        network = networks[res[1]] || 'development';
        console.log('from account:', accounts[0]);
        console.log('network:', network);
    
        var c = constants(web3, accounts, network);
        if (network == 'development') {
            c.startTime = Math.floor(Date.now() / 1000) + 60; // now + N
            c.endTime = Math.floor(Date.now() / 1000) + 120; // now + N
        }
    
        var BRDToken = new web3.eth.Contract(new Array(tokenJson.abi));
        var BRDCrowdsaleAuthorizer = new web3.eth.Contract(new Array(authorizerJson.abi));
        var BRDLockup = new web3.eth.Contract(new Array(lockupJson.abi));
        var BRDCrowdsale = new web3.eth.Contract(new Array(crowdsaleJson.abi));
        // console.log(BRDCrowdsale);
    
        var lockupArgs = encodeConstructorArgs(
            ['uint256', 'uint256', 'uint256'],
            c.lockupArguments
        );
        console.log('lockup args:', lockupArgs);
    
        var crowdsaleArgs = encodeConstructorArgs(
            ['uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
            c.creationArguments
        );
        console.log('crowdsale args:', crowdsaleArgs);
    
        var deployPromises = [
            deploy(BRDToken, 'token', {data: '0x' + tokenJson.bin})
            .then(function(tokenInstance) {
                BRDToken = BRDTokenTruffle.at(tokenInstance.options.address);
                console.log('token address:', tokenInstance.options.address);
            }),
            deploy(BRDCrowdsaleAuthorizer, 'authorizer', {data: '0x' + authorizerJson.bin})
            .then(function(authorizerInstance) {
                BRDCrowdsaleAuthorizer = BRDCrowdsaleAuthorizerTruffle.at(authorizerInstance.options.address);
                console.log('authorizer address:', authorizerInstance.options.address);
            }),
            deploy(BRDLockup, 'lockup', {data: '0x' + lockupJson.bin + lockupArgs})
            .then(function(lockupInstance) {
                BRDLockup = BRDLockupTruffle.at(lockupInstance.options.address);
                console.log('lockup address:', lockupInstance.options.address);
            }),
            deploy(BRDCrowdsale, 'crowdsale', {data: '0x' + crowdsaleJson.bin + crowdsaleArgs})
            .then(function(crowdsaleInstance) {
                BRDCrowdsale = BRDCrowdsaleTruffle.at(crowdsaleInstance.options.address);
                console.log('crowdsale address:', crowdsaleInstance.options.address);
            }),
        ];
        
        return Promise.all(deployPromises).then(function() {
            BRDCrowdsaleAuthorizer.addAuthorizer(accounts[0], {from: accounts[0], gas: 4700000}).then(function() {
                console.log('added initial authorizer', accounts[0]);
                var updatePromises = [
                    transferOwnership(BRDCrowdsaleAuthorizer, BRDCrowdsale, 'authorizer'),
                    transferOwnership(BRDLockup, BRDCrowdsale, 'lockup'),
                    transferOwnership(BRDToken, BRDToken, 'token'),
                    setThing(BRDCrowdsale, 'token', BRDToken.address),
                    setThing(BRDCrowdsale, 'lockup', BRDLockup.address),
                    setThing(BRDCrowdsale, 'authorizer', BRDCrowdsaleAuthorizer.address),
                ];
                return Promise.all(updatePromises).then(function() {
                    console.log('ownership and crowdsale members set');
                });
            }).then(function() {
                // XXX: add presale buyers here 
            });
        }).catch(function(err) {
            console.log('error deploying contracts:', err);
        });
    });    
}

module.exports = function(cb) {
    doDeploy().then(cb);
}
