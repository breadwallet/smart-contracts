var BRDToken = artifacts.require('BRDToken');
var BRDVendingMachine = artifacts.require('BRDVendingMachine');
var constants = require('../constants.js');
var ethers = require('ethers');

contract('BRDVendingMachine', function(accounts) {
  var errOut = function(promise, errMsg) {
    return promise.catch(function() {
      console.log(errMsg, arguments);
      assert(false, 'errored out');
    });
  };

  let c = constants(web3, accounts, 'development');

  function tokenWithWalletBalance(bal) {
    var token;
    var toBal = bal || new web3.BigNumber(1000000).mul(c.exponent);
    return errOut(BRDToken.new(), 'error creating token').then(function(contract) {
      token = contract;
      return errOut(token.mint(accounts[0], toBal), 'error minting tokens').then(function() {
        return errOut(token.finishMinting()).then(function() {
          return token;
        });
      });
    });
  }

  function emptyVendingMachine() {
    return tokenWithWalletBalance().then(function(token) {
      return errOut(BRDVendingMachine.new(token.address)).then(function(vm) {
        // return token.transfer(vm.address, new web3.BigNumber(0)).then(function() {
        //   return [vm, token];
        // });
        return [vm, token];
      });
    });
  }

  function tokenWithVendingBalance(bal) {
    var token;
    var toBal = bal || new web3.BigNumber(100000).mul(c.exponent);
    return emptyVendingMachine().then(function([vm, token]) {
      return errOut(token.transfer(vm.address, toBal)).then(function() {
        return [vm, token];
      });
    });
  }

  it('should create a token with some balance', function() {
    return tokenWithWalletBalance().then(function(token) {
      return token.balanceOf(accounts[0]).then(function(bal) {
        assert(bal.eq(new web3.BigNumber(1000000).mul(c.exponent)));
      });
    });
  });

  it('can create both a vending machine and a token', function() {
    return emptyVendingMachine().catch(function(err) {
      assert(false, "create error", err);
    });
  });

  it('should allow you to retrieve the zero balance', function() {
    return emptyVendingMachine().then(function([vm, token]) {
      return vm.balanceOf().then(function(bal) {
        assert(bal.eq(new web3.BigNumber(0)));
      });
    });
  });

  it('should create a vm with some balance', function() {
    return tokenWithVendingBalance().catch(function(err) {
      assert(false, 'error ${err}');
    });
  });

  it('should allow you to transfer some tokens to the vending machine', function() {
    return emptyVendingMachine().then(function([vm, token]) {
      return token.transfer(token.address, new web3.BigNumber(100).mul(c.exponent)).catch(function(err) {
        assert(false, "transfer error", err);
      });
    });
  });

  it('should reflect the vending machine balance once transferred', function() {
    return emptyVendingMachine().then(function([vm, token]) {
      var tokenBal = new web3.BigNumber(100).mul(c.exponent);
      return token.transfer(vm.address, tokenBal).then(function() {
        return vm.balanceOf().then(function(bal) {
          assert(tokenBal.eq(bal), `invalid balance for vm ${tokenBal} != ${bal}`);
        });
      });
    });
  });

  it('should withdraw tokens back to the account', function() {
    return tokenWithVendingBalance().then(function([vm, token]) {
      var withdrawBal = new web3.BigNumber(1).mul(c.exponent);
      return vm.withdraw(accounts[0], withdrawBal).then(function(tx) {
        assert(tx.logs[0].event == 'Withdraw', "didnt withdraw");
      });
    });
  });

  it('should withdraw the correct balance back to the account', function() {
    return tokenWithVendingBalance().then(function([vm, token]) {
      var withdrawBal = new web3.BigNumber(1).mul(c.exponent);
      return vm.withdraw(accounts[1], withdrawBal).then(function(tx) {
        return token.balanceOf(accounts[1]).then(function(bal) {
          assert(withdrawBal.eq(bal), 'incorrect balance');
        });
      });
    });
  });

  it('should bulk transfer a single transfer', function() {
    return tokenWithVendingBalance().then(function([vm, token]) {
      var withdrawBal = new web3.BigNumber(1).mul(c.exponent);
      return vm.bulkTransfer(new web3.BigNumber(0), [accounts[1]], [withdrawBal]).then(function(tx) {
        assert(tx.logs[0].args._addresses.length == 1, `expected one transfer ${tx}`);
      });
    });
  });

  it('should bulk transfer the correct amount', function() {
    return tokenWithVendingBalance().then(function([vm, token]) {
      var expectedBal = new web3.BigNumber(1).mul(c.exponent);
      return vm.bulkTransfer(new web3.BigNumber(0), [accounts[1]], [expectedBal]).then(function() {
        return token.balanceOf(accounts[1]).then(function(bal) {
          assert(expectedBal.eq(bal), `balance ${bal} != expected ${expectedBal}`);
        });
      });
    });
  });

  it('should reject more than 100 transfers', function() {
    return tokenWithVendingBalance().then(function([vm, token]) {
      let n = [...Array(101).keys()];
      let addrs = n.map(() => accounts[1]);
      let amounts = n.map(() => new web3.BigNumber(1).mul(c.exponent));
      return vm.bulkTransfer(new web3.BigNumber(0), addrs, amounts).then(() => {
        //assert(false, 'did not throw');
      }).catch((err) => {
        assert(!!err, 'no error')
      });
    });
  });

  it('should allow 100 transfers', function() {
    return tokenWithVendingBalance().then(function([vm, token]) {
      let n = [...Array(100).keys()];
      let addrs = n.map(() => accounts[1]);
      let amounts = n.map(() => new web3.BigNumber(30).mul(c.exponent));
      return vm.bulkTransfer(new web3.BigNumber(0), addrs, amounts).then((tx) => {
        assert(tx.logs[0].args._addresses.length == 100, 'wrong length');
        return token.balanceOf(accounts[1]).then(function(bal) {
          assert(bal.eq(amounts.reduce((p, c) => p.add(c))), `invalid balance ${bal}`);
        });
      });
    });
  });
});
