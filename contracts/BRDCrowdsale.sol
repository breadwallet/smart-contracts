pragma solidity ^0.4.15;

import './BRDToken.sol';
import './BRDCrowdsaleAuthorizer.sol';
import './BRDLockup.sol';
import 'zeppelin-solidity/contracts/crowdsale/Crowdsale.sol';
import 'zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol';
import 'zeppelin-solidity/contracts/token/MintableToken.sol';
import 'zeppelin-solidity/contracts/math/SafeMath.sol';

contract BRDCrowdsale is FinalizableCrowdsale {
  using SafeMath for uint256;

  // the maximum amount of wei raised during this crowdsale
  uint256 public cap;

  // the crowdsale authorizer contract
  BRDCrowdsaleAuthorizer internal authorizer;

  // the lockup contract
  BRDLockup internal lockup;

  // constructor
  function BRDCrowdsale(
    uint256 _cap,         // maximum wei raised
    uint256 _startTime,   // crowdsale start time
    uint256 _endTime,     // crowdsale end time
    uint256 _rate,        // tokens per wei
    address _wallet,      // beneficiary wallet
    address _authorizer)  // initial crowdsale authorizer
    Crowdsale(_startTime, _endTime, _rate, _wallet)
  {
    require(_cap > 0);
    cap = _cap;
    authorizer = new BRDCrowdsaleAuthorizer(_authorizer);
    lockup = new BRDLockup(_endTime);
  }

  // overriding Crowdsale#validPurchase
  function createTokenContract() internal returns (MintableToken) {
    return new BRDToken();
  }

  // overriding Crowdsale#validPurchase to add extra cap logic
  // @return true if crowdsale participants can buy at the moment
  // checks whether the cap has not been reached and the purchaser
  // has been authorized
  function validPurchase() internal constant returns (bool) {
    bool withinCap = weiRaised.add(msg.value) <= cap;
    bool isAuthorized = authorizer.isAuthorized(msg.sender);
    return super.validPurchase() && withinCap && isAuthorized;
  }

  // overriding Crowdsale#hasEnded to add cap logic
  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    bool capReached = weiRaised >= cap;
    return super.hasEnded() || capReached;
  }

  // overriding FinalizableCrowdsale#finalization
  // finalizes minting for the token contract, disabling further minting
  function finalization() internal {
    // issue the first lockup reward
    this.unlockTokens();

    super.finalization();
  }

  // unlocks tokens from the token lockup contract. no tokens are held by
  // the lockup contract, just the amounts and times that tokens should be rewarded
  // we process the amounts then mint tokens
  function unlockTokens() onlyOwner returns (bool _didIssueRewards) {
    // attempt to process the interval. it update the allocation bookkeeping
    // and will only return true when the interval should be processed
    if (!lockup.processInterval()) return false;

    // the total number of allocations
    uint _numAllocations = lockup.numAllocations();

    // for every allocation, attempt to unlock the reward
    for (uint _i = 0; _i < _numAllocations; _i++) {
      // attempt to unlock the reward
      var (_shouldReward, _to, _amount) = lockup.unlock(_i);
      // if the beneficiary should be rewarded, mint those tokens
      if (_shouldReward) {
        token.mint(_to, _amount);
      }
    }

    return true;
  }
}
