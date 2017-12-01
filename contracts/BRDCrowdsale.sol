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

  // maximum amount of wei raised during this crowdsale
  uint256 public cap;

  // minimum per-participant wei contribution
  uint256 public minContribution;

  // maximum per-participant wei contribution
  uint256 public maxContribution;

  // how many token unites the owner gets per buyer wei
  uint256 public ownerRate;

  // crowdsale authorizer contract determines who can participate
  BRDCrowdsaleAuthorizer public authorizer;

  // the lockup contract holds presale authorization amounts
  BRDLockup public lockup;

  event Preallocate(address indexed _to, uint256 _amount);

  // constructor
  function BRDCrowdsale(
    uint256 _cap,         // maximum wei raised
    uint256 _minWei,      // minimum per-contributor wei
    uint256 _maxWei,      // maximum per-contributor wei
    uint256 _startTime,   // crowdsale start time
    uint256 _endTime,     // crowdsale end time
    uint256 _rate,        // tokens per wei
    uint256 _ownerRate,   // owner tokens per buyer wei
    address _wallet,      // target funds wallet
    address _authorizer,  // the first authorizer
    uint256 _numUnlockIntervals,      // number of unlock intervals
    uint256 _unlockIntervalDuration)  // amount of time between intervals
    Crowdsale(_startTime, _endTime, _rate, _wallet)
  {
    require(_cap > 0);
    cap = _cap;
    minContribution = _minWei;
    maxContribution = _maxWei;
    ownerRate = _ownerRate;
    authorizer = new BRDCrowdsaleAuthorizer(_authorizer);
    lockup = new BRDLockup(_endTime, _numUnlockIntervals, _unlockIntervalDuration);
  }

  // overriding Crowdsale#createTokenContract
  function createTokenContract() internal returns (MintableToken) {
    return new BRDToken();
  }

  // overriding Crowdsale#validPurchase to add extra cap logic
  // @return true if crowdsale participants can buy at the moment
  // checks whether the cap has not been reached, the purchaser has
  // been authorized, and their contribution is within the min/max
  // thresholds
  function validPurchase() internal constant returns (bool) {
    bool withinCap = weiRaised.add(msg.value) <= cap;
    bool isAuthorized = authorizer.isAuthorized(msg.sender);
    bool isMin = msg.value >= minContribution;
    uint256 alreadyContributed = token.balanceOf(msg.sender).div(rate);
    bool withinMax = msg.value.add(alreadyContributed) <= maxContribution;
    return super.validPurchase() && withinCap && isAuthorized && isMin && withinMax;
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
    // end minting
    token.finishMinting();

    // issue the first lockup reward
    unlockTokens();

    super.finalization();
  }

  // mints tokens directly to the beneficiary `_amount`. this is used
  // for OOB purchasers of the tokens
  function allocateOOBTokenPurchase(address _to, uint256 _amount) onlyOwner {
    require(!isFinalized);
    token.mint(_to, _amount);
    Preallocate(_to, _amount);
  }

  // overriding Crowdsale#buyTokens
  // mints the ownerRate of tokens in addition to calling the super method
  function buyTokens(address _beneficiary) public payable {
    // call the parent method to mint tokens to the beneficiary
    super.buyTokens(_beneficiary);
    // calculate the owner share of tokens
    uint256 ownerTokens = msg.value.mul(ownerRate);
    // mind the owner share and send to the owner wallet
    token.mint(wallet, ownerTokens);
  }

  // adds a token allocation to the lockup contract. may only be called
  // before the end of the crowdsale. will also mint the new token
  // allocation with the crowdsale contract as the owner
  function lockupTokens(address _to, uint256 _amount) onlyOwner {
    require(!isFinalized);
    // create the allocation in the lockup contract
    lockup.pushAllocation(_to, _amount);
    // mint tokens to the
    token.mint(this, _amount);
  }

  // unlocks tokens from the token lockup contract. no tokens are held by
  // the lockup contract, just the amounts and times that tokens should be rewarded.
  // the tokens are held by the crowdsale contract
  function unlockTokens() onlyOwner public returns (bool _didIssueRewards) {
    // attempt to process the interval. it update the allocation bookkeeping
    // and will only return true when the interval should be processed
    if (!lockup.processInterval()) return false;

    // the total number of allocations
    uint _numAllocations = lockup.numAllocations();

    // for every allocation, attempt to unlock the reward
    for (uint _i = 0; _i < _numAllocations; _i++) {
      // attempt to unlock the reward
      var (_shouldReward, _to, _amount) = lockup.unlock(_i);
      // if the beneficiary should be rewarded, send them tokens
      if (_shouldReward) {
        token.transfer(_to, _amount);
      }
    }

    return true;
  }
}
