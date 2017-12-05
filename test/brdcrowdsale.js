var BRDCrowdsale = artifacts.require('BRDCrowdsale');
var BRDToken = artifacts.require('BRDToken');
var BRDCrowdsaleAuthorizer = artifacts.require('BRDCrowdsaleAuthorizer');
var BRDLockup = artifacts.require('BRDLockup');
var constants = require('../constants.js');

contract('BRDCrowdsale', function(accounts) {
  let c = constants(web3, accounts, 'development'); // note: do not use for startTime or endTime
  let tokensPerLockup = 1125;
  let expectedLockupShare = (new web3.BigNumber(accounts.length*tokensPerLockup)).mul(c.exponent);
  expectedLockupShare = c.bonusRate.mul(expectedLockupShare).div(100);

  function newContract(overrides) {
    let c = constants(web3, accounts, 'development');
    if (overrides) {
      Object.keys(overrides).forEach(function(k) {
        c[k] = overrides[k];
      });
    }
    // advance start/end times because it takes longer to do all this stuff below
    var token;
    var authorizer;
    var lockup;
    var crowdsale;
    var errOut = function(promise, errMsg) {
      return promise.catch(function() {
        console.log(errMsg, arguments);
        assert(false, 'errored out');
      });
    };
    return Promise.all([
      errOut(BRDToken.new(), 'error creating token'), 
      errOut(BRDCrowdsaleAuthorizer.new(), 'error creating authorizer'), 
      errOut(BRDLockup.new(c.endTime, c.numIntervals, c.intervalDuration), 'error creating lockup')
    ]).then(function(contracts) {
      token = contracts[0];
      authorizer = contracts[1];
      lockup = contracts[2];
    }).then(function() {
      return errOut(BRDCrowdsale.new(
        c.cap, c.minContribution, c.maxContribution,
        c.startTime, c.endTime,
        c.rate, c.ownerRate, c.bonusRate,
        c.wallet,
        {from: accounts[0]}
      ), 'error creating crowsale');
    }).then(function(contract) {
      crowdsale = contract;
      return Promise.all([
        errOut(authorizer.addAuthorizer(accounts[0]), 'error adding accounts[0] as authorizer'),
        errOut(token.transferOwnership(crowdsale.address), 'error transferring token ownership'),
        errOut(authorizer.transferOwnership(crowdsale.address), 'error transferring authorizer ownership'),
        errOut(lockup.transferOwnership(crowdsale.address), 'error transferring lockup ownership'),
      ]);
    }).then(function() {
      return Promise.all([
        errOut(crowdsale.setToken(token.address), 'error setting token'),
        errOut(crowdsale.setAuthorizer(authorizer.address), 'error setting authorizer'),
        errOut(crowdsale.setLockup(lockup.address), 'error setting lockup')
      ]);
    }).then(function() {
      return crowdsale;
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
        // console.log('starting in', endTime.toNumber(), nowTime, startInSecs);
        setTimeout(function() {
          resolve(contractPromise);
        }, startInSecs*1000);
      });
    });
  }

  function presaleParticipants(contractPromise) {
    return contractPromise.then(function(instance) {
      let promises = [];
      for (let i = 1; i < accounts.length; i++) { // start at 1 because account 0 has owner share
        let amountToLockup = (new web3.BigNumber(tokensPerLockup).mul(c.exponent));
        promises.push(instance.lockupTokens(accounts[i], amountToLockup));
      }
      return Promise.all(promises).then(function() { return instance; });
    }).then(function() {
      return contractPromise;
    }).catch(function(err) {
      console.log('error creating presale participants', err);
      assert(false, 'presale error');
    });
  }

  function waitFor(msec) {
    return new Promise(function(r, _) {
      setTimeout(function() { r(); }, msec);
    });
  }

  function unlockAllTokens(crowdsale, lockup) {
    return lockup.intervalDuration.call().then(function(intervalDuration) {
      return waitFor(intervalDuration.toNumber()*1000);
    }).then(function() {
      return crowdsale.unlockTokens({from: accounts[0]}).then(function() {
        return Promise.all([
          lockup.currentInterval.call(),
          lockup.numIntervals.call(),
          lockup.intervalDuration.call(),
        ]);
      }).then(function(intervalInfo) {
        if (intervalInfo[0] < intervalInfo[1]) {
          return unlockAllTokens(crowdsale, lockup);
        } else {
          return intervalInfo;
        }
      });
    });
  }

  it('should allocate the lockup tokens upon contract creation', function() {
    return awaitStartTime(newContract()).then(function(instance) {
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

  it('should mint user tokens on a valid contribution', function() {
    var crowdsale;
    let amountToSend = (new web3.BigNumber(1)).mul(c.exponent);
    var amountExpected = (new web3.BigNumber(900)).mul(c.exponent);
    return awaitStartTime(secondAccountAuthorized()).then(function(instance) {
      crowdsale = instance;
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      return crowdsale.token.call();
    }).then(function(tokenAddr) {
      var tokenContract = BRDToken.at(tokenAddr);
      return tokenContract.balanceOf(accounts[1]);
    }).then(function(ownerBalance) {
      assert(ownerBalance.eq(amountExpected), 'user balance should equal 900 tokens');
    }).catch(function(err) {
      console.log(err);
      assert(false, 'no error expected');
    });
  });

  it('should mint owner tokens on a valid contribution', function() {
    var crowdsale;
    let amountToSend = (new web3.BigNumber(1)).mul(c.exponent);
    var amountExpected = (new web3.BigNumber(300)).mul(c.exponent);
    return awaitStartTime(secondAccountAuthorized()).then(function(instance) {
      crowdsale = instance;
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      return crowdsale.token.call();
    }).then(function(tokenAddr) {
      var tokenContract = BRDToken.at(tokenAddr);
      return tokenContract.balanceOf(accounts[0]);
    }).then(function(ownerBalance) {
      assert(ownerBalance.eq(amountExpected), 'owner balance should equal 300 tokens');
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
    let newContractPromise = newContract({endTime: Math.floor(Date.now()/1000)+4});
    let amountToSend = (new web3.BigNumber(4).mul(c.exponent)); // 4 eth
    return awaitEndTime(awaitStartTime(secondAccountAuthorized(newContractPromise))).then(function(instance) {
      return instance.sendTransaction({from: accounts[1], value: amountToSend});
    }).then(function() {
      assert(false, 'should have an error');
    }).catch(function(err) {
      assert((new String(err)).indexOf('revert') !== -1);
    });
  });

  it('should not allow token unlock until crowdsale has ended', function() {
    let crowdsale;
    return presaleParticipants(awaitStartTime(newContract())).then(function(instance) {
      crowdsale = instance;
      return instance.unlockTokens({from: accounts[0]});
    }).then(function() {
      return crowdsale.lockup.call();
    }).then(function(lockupAddr) {
      let lockup = BRDLockup.at(lockupAddr);
      return lockup.currentInterval.call();
    }).then(function(lockupIntervalNumber) {
      assert(lockupIntervalNumber.eq(new web3.BigNumber(0)));
    });
  });

  it('should unlock first batch of tokens upon finalization', function() {
    let crowdsale;
    let contractPromise = newContract({endTime: Math.floor(Date.now()/1000)+4});
    return awaitEndTime(presaleParticipants(contractPromise)).then(function(instance) {
      crowdsale = instance;
      return crowdsale.finalize({from: accounts[0]});
    }).then(function() {
      return crowdsale.token.call();
    }).then(function(tokenAddr) {
      let token = BRDToken.at(tokenAddr);
      let promises = [];
      for (let i = 0; i < accounts.length; i++) {
        promises.push(token.balanceOf(accounts[i]));
      }
      return Promise.all(promises);
    }).then(function(values) {
      for (let i = 1; i < accounts.length; i++) { // start at 1 to ignore the owner share
        // 6 tokens * .2 bonus / 6 intervals
        var unlockedTokensPerInterval = c.bonusRate.mul((new web3.BigNumber(tokensPerLockup)).mul(c.exponent)).div(100).div(6);
        // 6 tokens - (6 tokens * .2 bonus)
        var initialDelivery = (new web3.BigNumber(tokensPerLockup)).mul(c.exponent).sub(unlockedTokensPerInterval.mul(6));
        var expectedBalance = initialDelivery.add(unlockedTokensPerInterval);
        assert(values[i].eq(expectedBalance), 'tokens not delivered');
      }
    });
  });

  it('should immediately mint non-bonus tokens to the beneficiary', function() {
    let crowdsale;
    let contractPromise = newContract({endTime: Math.floor(Date.now()/1000)+4});
    return presaleParticipants(contractPromise).then(function(instance) {
      crowdsale = instance;
      return crowdsale.token.call();
    }).then(function(tokenAddr) {
      let token = BRDToken.at(tokenAddr);
      let promises = [];
      for (let i = 0; i < accounts.length; i++) {
        promises.push(token.balanceOf(accounts[i]));
      }
      return Promise.all(promises);
    }).then(function(values) {
      for (let i = 1; i < accounts.length; i++) { // start at 1 to ignore the owner share
        // 6 tokens * .2 bonus / 6 intervals
        var unlockedTokensPerInterval = c.bonusRate.mul((new web3.BigNumber(tokensPerLockup)).mul(c.exponent)).div(100).div(6);
        // 6 tokens - (6 tokens * .2 bonus)
        var initialDelivery = (new web3.BigNumber(tokensPerLockup)).mul(c.exponent).sub(unlockedTokensPerInterval.mul(6));
        assert(values[i].eq(initialDelivery), 'tokens not delivered');
      }
    });
  });

  it('should not allow another unlock immediately after the first unlock', function() {
    let crowdsale;
    let lockup;
    let contractPromise = newContract({endTime: Math.floor(Date.now()/1000)+4});
    return awaitEndTime(presaleParticipants(contractPromise)).then(function(instance) {
      crowdsale = instance;
      return crowdsale.finalize({from: accounts[0]});
    }).then(function() {
      return crowdsale.lockup.call();
    }).then(function(lockupAddr) {
      lockup = BRDLockup.at(lockupAddr);
      return lockup.currentInterval.call();
    }).then(function(currentInterval) {
      assert(currentInterval.eq(new web3.BigNumber(1)));
    }).then(function() {
      return crowdsale.unlockTokens({from: accounts[0]});
    }).then(function() {
      return lockup.currentInterval.call();
    }).then(function(currentInterval) {
      assert(currentInterval.eq(new web3.BigNumber(1))); // shouldnt have moved
    });
  });

  it('should unlock all tokens until finished', function() {
    let crowdsale;
    let lockup;
    let contractPromise = newContract({
      endTime: Math.floor(Date.now()/1000)+5,
      intervalDuration: 2, // 2 seconds
    });
    return awaitEndTime(presaleParticipants(awaitStartTime(contractPromise))).then(function(instance) {
      crowdsale = instance;
      return crowdsale.finalize({from: accounts[0]});
    }).then(function() {
      return crowdsale.lockup.call();
    }).then(function(lockupAddr) {
      lockup = BRDLockup.at(lockupAddr);
      return unlockAllTokens(crowdsale, lockup);
    }).then(function() {
      return crowdsale.token.call();
    }).then(function(tokenAddr) {
      let token = BRDToken.at(tokenAddr);
      let promises = [];
      for (let i = 0; i < accounts.length; i++) {
        promises.push(token.balanceOf(accounts[i]));
      }
      return Promise.all(promises);
    }).then(function(values) {
      for (let i = 1; i < accounts.length; i++) { // start at 1 to ignore the owner share
        // console.log(values[i].div(c.exponent).toString(), ':', tokensPerLockup);
        assert(values[i].eq((new web3.BigNumber(tokensPerLockup)).mul(c.exponent)), 'tokens not delivered'); // all tokens
      }
    });
  });

  it('should not allow another unlock after the last one', function() {
    let crowdsale;
    let lockup;
    let lockupInfo;
    let contractPromise = newContract({
      endTime: Math.floor(Date.now()/1000)+5,
      intervalDuration: 2, // 2 seconds
    });
    return awaitEndTime(presaleParticipants(contractPromise)).then(function(instance) {
      crowdsale = instance;
      return crowdsale.finalize({from: accounts[0]});
    }).then(function() {
      return crowdsale.lockup.call();
    }).then(function(lockupAddr) {
      lockup = BRDLockup.at(lockupAddr);
      return unlockAllTokens(crowdsale, lockup);
    }).then(function(_lockupInfo) {
      lockupInfo = _lockupInfo;
      return crowdsale.unlockTokens();
    }).then(function() {
      return waitFor(lockupInfo[2].toNumber()*1000);
    }).then(function() {
      return lockup.currentInterval.call();
    }).then(function(currentInterval) {
      assert(currentInterval.eq(lockupInfo[0])); // the interval should not have advanced
    });
  });

  // TODO: test sending/receiving post finalization
  // TODO: test allocating 50 lockups and unlocking all tokens
});
