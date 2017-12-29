var BRDCrowdsale = artifacts.require("BRDCrowdsale");
var BRDToken = artifacts.require("BRDToken");
var constants = require('../constants.js');

module.exports = function(deployer, network, accounts) {
    var c = constants(web3, accounts, network);
    var crowdsale = BRDCrowdsale.at('0x5250776FAD5A73707d222950de7999d3675a2722');
    var token = BRDToken.at('0x558ec3152e2eb2174905cd19aea4e34a23de9ad6');
    var beneficiary = '0x081edbef6106ab1253557451b261c1c99bade726';
    var targetTotalTokens = (new web3.BigNumber('88862718')).mul(c.exponent);
    var ownerRate = new web3.BigNumber(25);
    web3.BigNumber.config({DECIMAL_PLACES: 18, ROUNDING_MODE: 1});
    Promise.all([token.totalSupply.call(), token.balanceOf(beneficiary)]).then(function(ret) {
        var currentTotalTokens = ret[0];
        var currentBeneficiaryBalance = ret[1];
        var difference = targetTotalTokens.sub(currentTotalTokens);
        var automaticOwnerTokens = ownerRate.mul(difference).div(new web3.BigNumber(100))
        var beneficiaryAmount = difference.sub(automaticOwnerTokens);
        console.log('minting', beneficiaryAmount.div(c.exponent).toString(10));
        console.log('with', automaticOwnerTokens.div(c.exponent).toString(10), 'automatically created');
        var finalTotalAmount = currentTotalTokens.add(automaticOwnerTokens.add(beneficiaryAmount));
        console.log('final token amount', finalTotalAmount.div(c.exponent).toString(10));
        var ownerShare = currentBeneficiaryBalance.add(automaticOwnerTokens).add(beneficiaryAmount);
        console.log('owner share amount', ownerShare.div(finalTotalAmount).toString(10));
        // crowdsale.allocateTokens(beneficiary, beneficiaryAmount);
    });
};
