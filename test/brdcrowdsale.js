var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var BRDToken = artifacts.require('BRDToken');
var BRDCrowdsaleAuthorizer = artifacts.require('BRDCrowdsaleAuthorizer');
var constants = require('../constants.js');

contract('BRDCrowdsale', function(accounts) {
  let c = constants(web3, accounts, 'development'); // note: do not use for startTime or endTime
  let tokensPerLockup = 6;
  let expectedLockupShare = (new web3.BigNumber(accounts.length*tokensPerLockup)).mul(c.exponent);

  function newContract(overrides) {
    let c = constants(web3, accounts, 'development');
    if (overrides) {
      Object.keys(overrides).forEach(function(k) {
        c[k] = overrides[k];
      });
    }
    return BRDCrowdsale.new(
      c.cap, c.minContribution, c.maxContribution,
      c.startTime, c.endTime, c.rate, c.ownerShare,
      c.wallet, c.authorizer,
      c.numIntervals, c.intervalDuration,
      {from: accounts[0]}
    ).catch(function(err) {
      console.log('error creating contract', err);
      assert(false, 'error creating contract');
    });
  }

  // resolves to the crowdsale contract that has the second account
  // pre-authorized
  function secondAccountAuthorized(contractPromise) {
    let crowdsale;
    let authorizer;
    if (!contractPromise) contractPromise = newContract();
    return contractPromise.then(function (instance) {
      crowdsale = instance;
      return instance.authorizer.call();
    }).then(function(authorizerAddr) {
      authorizer = BRDCrowdsaleAuthorizer.at(authorizerAddr);
      return authorizer.authorizeAccount(accounts[1], {from: accounts[0]});
    }).then(function() {
      return authorizer.isAuthorized.call(accounts[1], {from: accounts[1]}).then(function(isAuthorized) {
        assert(isAuthorized, '2nd account must be authorized');
        return crowdsale;
      });
    }).catch(function(err) {
      console.log(err);
      assert(false, 'error authorizing account');
    });
  }

  // takes a promise that resolves to a crowdsale,
  // waits until the crowdsale start time to resolve
  function awaitStartTime(contractPromise) {
    return contractPromise.then(function(crowdsale) {
      return crowdsale.startTime.call();
    }).then(function(startTime) {
      return new Promise(function(resolve, _) {
        let nowTime = Math.floor(Date.now() / 1000);
        let startInSecs = startTime.toNumber() - nowTime;
        // console.log('starting in', startTime.toNumber(), nowTime, startInSecs);
        setTimeout(function() {
          resolve(contractPromise);
        }, startInSecs*1000);
      });
    });
  }

  function awaitEndTime(contractPromise) {
    return contractPromise.then(function(crowdsale) {
      return crowdsale.endTime.call();
    }).then(function(endTime) {
      return new Promise(function(resolve, _) {
        let nowTime = Math.floor(Date.now() / 1000);
        let startInSecs = endTime.toNumber() - nowTime + 1;
        console.log('starting in', endTime.toNumber(), nowTime, startInSecs);
        setTimeout(function() {
          resolve(contractPromise);
        }, startInSecs*1000);
      });
    });
  }

  it('should award the owner share upon contract creation', function() {
    return newContract().then(function(instance) {
      return instance.token.call().then(function(tokenAddr) {
        let token = BRDToken.at(tokenAddr);
        return token.balanceOf.call(accounts[0]);
      });
    }).then(function(balance) {
      assert(balance.eq(c.ownerShare));
    });
  });

  it('should allocate the lockup tokens upon contract creation', function() {
    return newContract().then(function(instance) {
      let promises = [];
      for (let i = 0; i < accounts.length; i++) {
        let amountToLockup = (new web3.BigNumber(tokensPerLockup).mul(c.exponent));
        promises.push(instance.lockupTokens(accounts[i], amountToLockup));
      }
      return Promise.all(promises).then(function() { return instance; });
    }).then(function(instance) {
      return instance.token.call().then(function(tokenAddr) {
        let token = BRDToken.at(tokenAddr);
        return token.balanceOf.call(instance.address);
      });
    }).then(function(balance) {
      assert(balance.eq(expectedLockupShare), 'expected lockup share does not match');
    });
  });

  it('should set the contract owner as the initial authorizer', function() {
    return newContract().then(function(instance) {
      return instance.authorizer.call().then(function(authorizerAddr) {
        let authorizer = BRDCrowdsaleAuthorizer.at(authorizerAddr);
        return authorizer.isAuthorizer.call(accounts[0]);
      });
    }).then(function(contractCreatorIsAuthorizer) {
      assert(contractCreatorIsAuthorizer);
    });
  });

  it('should not allow contributions less than the minimum', function() {
    let amountToSend = c.minContribution.div(2); // .5 ETH
    return awaitStartTime(secondAccountAuthorized()).then(function(instance) {
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      assert(false, 'error expected');
    }).catch(function(err) {
      assert((new String(err)).indexOf('revert') !== -1);
    });
  });

  it('should not allow contributions more than the maximum', function() {
    let amountToSend = c.maxContribution.add(1000000000); // 5.000000001 ETH
    return awaitStartTime(secondAccountAuthorized()).then(function(instance) {
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      assert(false, 'error expected');
    }).catch(function(err) {
      assert((new String(err)).indexOf('revert') !== -1);
    });
  });

  it('should not allow contributions from unauthorized accounts', function() {
    return awaitStartTime(newContract()).then(function(instance) {
      let amountToSend = (new web3.BigNumber(1).mul(c.exponent)); // 1ETH
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      assert(false, 'error expected');
    }).catch(function(err) {
      assert((new String(err)).indexOf('revert') !== -1);
    });
  });

  it('should allow a valid contribution', function() {
    let amountToSend = (new web3.BigNumber(1).mul(c.exponent));
    return awaitStartTime(secondAccountAuthorized()).then(function(instance) {
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      assert(true);
    }).catch(function(err) {
      console.log(err);
      assert(false, 'no error expected');
    });
  });

  it('should allow duplicate purchases less then the max contribution', function() {
    let amountToSend = (new web3.BigNumber(1).mul(c.exponent));
    let crowdsale;
    return awaitStartTime(secondAccountAuthorized()).then(function(instance) {
      crowdsale = instance;
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      return crowdsale.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      assert(true);
    }).catch(function(err) {
      console.log(err);
      assert(false, 'no error expected');
    });
  });

  it('should not allow contribution before start time', function() {
    let amountToSend = (new web3.BigNumber(1).mul(c.exponent)); // 1ETH
    return secondAccountAuthorized().then(function(instance) {
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      assert(false, 'error expected');
    }).catch(function(err) {
      assert((new String(err)).indexOf('revert') !== -1);
    });
  });

  it('should not allow duplicate transitions more than the max', function() {
    let amountToSend = (new web3.BigNumber(1).mul(c.exponent));
    let secondAmountToSend = (new web3.BigNumber(4.01).mul(c.exponent));
    let crowdsale;
    return awaitStartTime(secondAccountAuthorized()).then(function(instance) {
      crowdsale = instance;
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      return crowdsale.sendTransaction({from: accounts[1], value: secondAmountToSend});
    }).then(function() {
      assert(false, 'should have an error');
    }).catch(function(err) {
      assert((new String(err)).indexOf('revert') !== -1);
    });
  });

  it('should not allow contributions once the cap has been reached', function() {
    // allow only 7 eth to be raised
    let newContractPromise = newContract({cap: (new web3.BigNumber(7).mul(c.exponent))});
    let amountToSend = (new web3.BigNumber(4).mul(c.exponent)); // 4 eth
    var crowdsale;
    return awaitStartTime(secondAccountAuthorized(newContractPromise)).then(function(instance) {
      crowdsale = instance;
      return instance.authorizer.call();
    }).then(function(authorizerAddr) {
      authorizer = BRDCrowdsaleAuthorizer.at(authorizerAddr);
      return authorizer.authorizeAccount(accounts[2], {from: accounts[0]});
    }).catch(function(err) {
      console.log('err', err);
      assert(false, 'should not have an error here');
    }).then(function() {
      return crowdsale.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      return crowdsale.sendTransaction({from: accounts[2], value: amountToSend});
    }).then(function(values) {
      assert(false, 'should have an error');
    }).catch(function(err) {
      assert((new String(err)).indexOf('revert') !== -1);
    });
  });

  it('should not allow contributions once the end time has been reached', function() {
    let newContractPromise = newContract({endTime: Math.floor(Date.now()/1000)+2});
    let amountToSend = (new web3.BigNumber(4).mul(c.exponent)); // 4 eth
    return awaitEndTime(awaitStartTime(secondAccountAuthorized(newContractPromise))).then(function(instance) {
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      assert(false, 'should have an error');
    }).catch(function(err) {
      assert((new String(err)).indexOf('revert') !== -1);
    });
  });
});
