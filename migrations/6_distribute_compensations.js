var BRDToken = artifacts.require('BRDToken');
var csv = require('csv-parse/lib/sync');
var fs = require('fs');
var path = require('path');
var constants = require('../constants.js');

var compText = fs.readFileSync(path.join(__dirname, '..', 'compensation.csv'));
var compRecords = csv(compText, {columns: true});

module.exports = function(deployer, network, accounts) {
    var c = constants(web3, accounts, network);
    var gasPrice = new web3.BigNumber('1000000000');
    var token = BRDToken.at('0x558ec3152e2eb2174905cd19aea4e34a23de9ad6');
    deployer.then(function() {
        console.log(compRecords.length + ' total records');

        var maxGas = 52301;
        var totalBrd = new web3.BigNumber(0);
        var totalEth = new web3.BigNumber(0);
        var numEthTxns = 0;
        var totalGas = 0;

        var compensations = compRecords.map(function(rec) {
            var comp = {
                address: rec.address,
                brd: (new web3.BigNumber(rec.brd)).mul(c.exponent),
            };
            totalBrd = totalBrd.add(comp.brd);
            totalGas += maxGas;

            if (rec.eth != '0') {
                comp.eth = (new web3.BigNumber(rec.eth)).mul(c.exponent);
                numEthTxns += 1;
                totalEth = totalEth.add(comp.eth);
                totalGas += 21000;
            }
            return comp;
        });

        console.log(totalBrd.div(c.exponent).toString(10) + ' total BRD');
        console.log(totalEth.div(c.exponent).toString(10) + ' total ETH');
        console.log(numEthTxns + ' total ETH-bearing txns');
        console.log((numEthTxns + compensations.length) + ' total txns');
        console.log(totalGas + ' total gas');
        console.log(gasPrice.mul(totalGas).div(c.exponent).toString(10) + ' total ETH txn fees');

        var compensationsWithTxids = {};
        var allTransfers = [];
        
        compensations.forEach(function(comp) {
            var promises = [token.transfer(comp.address, comp.brd)];
            if (comp.eth) {
                promises.push(new Promise(function(res, rej) {
                    var txn = {
                        from: accounts[0],
                        to: comp.address,
                        value: comp.eth,
                        gas: 21000,
                        gasPrice: gasPrice
                    };
                    web3.eth.sendTransaction(txn, function(err, txhash) {
                        if (err) {
                            console.log(comp.address, 'send eth failed', err);
                            rej(err);
                        } else {
                            console.log(comp.address, 'send eth', txhash);
                            res({tx: txhash});
                        }
                    });
                }));
            }
            promises.forEach(function(prom) { allTransfers.push(prom); }); 
            Promise.all(promises).then(function(results) {
                comp.brdTxId = results[0].tx;
                if (results.length == 2) {
                    comp.ethTxId = results[1].tx;
                }
                compensationsWithTxids[comp.address] = comp;
            });
        });

        Promise.all(allTransfers).then(function() {
            var json = JSON.stringify(compensationsWithTxids);
            fs.writeFileSync(path.join(__dirname, '..', 'compensation.json'), json);
        });
    });
}