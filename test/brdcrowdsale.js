var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var BRDToken = artifacts.require('BRDToken');
var BRDCrowdsaleAuthorizer = artifacts.require('BRDCrowdsaleAuthorizer');

var decimals = 18;
var exponent = (new web3.BigNumber(10)).pow(decimals);

var expectedOwnerShare = (new web3.BigNumber(54000000)).mul(exponent);
var expectedLockupShare = (new web3.BigNumber(0).mul(exponent));

contract('BRDCrowdsale', function(accounts) {
  var expectedLockupShare = (new web3.BigNumber(accounts.length*6)).mul(exponent);

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

  it('should allocate the lockup tokens upon contract creation', function() {
    return BRDCrowdsale.deployed().then(function(instance) {
      return instance.token.call().then(function(tokenAddr) {
        var token = BRDToken.at(tokenAddr);
        return token.balanceOf.call(instance.address);
      });
    }).then(function(balance) {
      assert(balance.eq(expectedLockupShare), 'expected lockup share does not match');
    });
  });

  it('should set the contract owner as the initial authorizer', function() {
    return BRDCrowdsale.deployed().then(function(instance) {
      return instance.authorizer.call().then(function(authorizerAddr) {
        var authorizer = BRDCrowdsaleAuthorizer.at(authorizerAddr);
        return authorizer.isAuthorizer.call(accounts[0]);
      });
    }).then(function(contractCreatorIsAuthorizer) {
      assert(contractCreatorIsAuthorizer);
    });
  });
});
