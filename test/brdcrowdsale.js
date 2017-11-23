var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var BRDToken = artifacts.require('BRDToken');

var decimals = 18;
var exponent = (new web3.BigNumber(10)).pow(decimals);

var expectedOwnerShare = (new web3.BigNumber(54000000)).mul(exponent);

contract('BRDCrowdsale', function(accounts) {
  it('should award the owner share upon contract creation', function() {
    return BRDCrowdsale.deployed().then(function(instance) {
      return instance.token.call().then(function(tokenAddr) {
        var token = BRDToken.at(tokenAddr);
        return token.balanceOf.call(accounts[0]);
      });
    }).then(function(balance) {
      assert(balance.eq(expectedOwnerShare));
    });
  });
});
