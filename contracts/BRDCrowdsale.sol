pragma solidity ^0.4.18;

import "./BRDToken.sol";
import "./BRDCrowdsaleAuthorizer.sol";
import "./BRDLockup.sol";
import "zeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol";
import "zeppelin-solidity/contracts/token/MintableToken.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";


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

  // number of tokens per 100 to lock up in lockupTokens()
  uint256 public bonusRate;

  // crowdsale authorizer contract determines who can participate
  BRDCrowdsaleAuthorizer public authorizer;

  // the lockup contract holds presale authorization amounts
  BRDLockup public lockup;

  // constructor
  function BRDCrowdsale(
    uint256 _cap,         // maximum wei raised
    uint256 _minWei,      // minimum per-contributor wei
    uint256 _maxWei,      // maximum per-contributor wei
    uint256 _startTime,   // crowdsale start time
    uint256 _endTime,     // crowdsale end time
    uint256 _rate,        // tokens per wei
    uint256 _ownerRate,   // owner tokens per buyer wei
    uint256 _bonusRate,   // percentage of tokens to lockup
    address _wallet)      // target funds wallet
    Crowdsale(_startTime, _endTime, _rate, _wallet)
   public
  {
    require(_cap > 0);
    cap = _cap;
    minContribution = _minWei;
    maxContribution = _maxWei;
    ownerRate = _ownerRate;
    bonusRate = _bonusRate;
  }

  // overriding Crowdsale#hasEnded to add cap logic
  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    bool _capReached = weiRaised >= cap;
    return super.hasEnded() || _capReached;
  }

  // @return true if the crowdsale has started
  function hasStarted() public constant returns (bool) {
    return now > startTime;
  }

  // overriding Crowdsale#buyTokens
  // mints the ownerRate of tokens in addition to calling the super method
  function buyTokens(address _beneficiary) public payable {
    // call the parent method to mint tokens to the beneficiary
    super.buyTokens(_beneficiary);
    // calculate the owner share of tokens
    uint256 _ownerTokens = msg.value.mul(ownerRate);
    // mint the owner share and send to the owner wallet
    token.mint(wallet, _ownerTokens);
  }

  // mints _amount tokens to the _beneficiary minus the bonusRate
  // tokens to be locked up via the lockup contract. locked up tokens
  // are sent to the contract and may be unlocked according to
  // the lockup configuration after the sale ends
  function lockupTokens(address _beneficiary, uint256 _amount) onlyOwner  public {
    require(!isFinalized);

    // calculate the owner share of tokens
    uint256 _ownerTokens = ownerRate.mul(_amount).div(rate);
    // mint the owner share and send to the owner wallet
    token.mint(wallet, _ownerTokens);

    // calculate the amount of tokens to be locked up
    uint256 _lockupTokens = bonusRate.mul(_amount).div(100);
    // create the locked allocation in the lockup contract
    lockup.pushAllocation(_beneficiary, _lockupTokens);
    // mint locked tokens to the crowdsale contract to later be unlocked
    token.mint(this, _lockupTokens);

    // the non-bonus tokens are immediately rewarded
    uint256 _remainder = _amount.sub(_lockupTokens);
    token.mint(_beneficiary, _remainder);
  }

  // unlocks tokens from the token lockup contract. no tokens are held by
  // the lockup contract, just the amounts and times that tokens should be rewarded.
  // the tokens are held by the crowdsale contract
  function unlockTokens() onlyOwner public returns (bool _didIssueRewards) {
    // attempt to process the interval. it update the allocation bookkeeping
    // and will only return true when the interval should be processed
    if (!lockup.processInterval())
      return false;

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

  // sets the authorizer contract if the crowdsale hasn't started
  function setAuthorizer(BRDCrowdsaleAuthorizer _authorizer) onlyOwner public {
    require(!hasStarted());
    authorizer = _authorizer;
  }

  // sets the lockup contract if the crowdsale hasn't started
  function setLockup(BRDLockup _lockup) onlyOwner public {
    require(!hasStarted());
    lockup = _lockup;
  }

  // sets the token contract if the crowdsale hasn't started
  function setToken(BRDToken _token) onlyOwner public {
    require(!hasStarted());
    token = _token;
  }

  function setMaxContribution(uint256 _newMaxContribution) onlyOwner public {
    maxContribution = _newMaxContribution;
  }

  // overriding Crowdsale#createTokenContract
  function createTokenContract() internal returns (MintableToken) {
    // set the token to null initially
    // call setToken() above to set the actual token address
    return BRDToken(address(0));
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

  // overriding Crowdsale#validPurchase to add extra cap logic
  // @return true if crowdsale participants can buy at the moment
  // checks whether the cap has not been reached, the purchaser has
  // been authorized, and their contribution is within the min/max
  // thresholds
  function validPurchase() internal constant returns (bool) {
    bool _withinCap = weiRaised.add(msg.value) <= cap;
    bool _isAuthorized = authorizer.isAuthorized(msg.sender);
    bool _isMin = msg.value >= minContribution;
    uint256 _alreadyContributed = token.balanceOf(msg.sender).div(rate);
    bool _withinMax = msg.value.add(_alreadyContributed) <= maxContribution;
    return super.validPurchase() && _withinCap && _isAuthorized && _isMin && _withinMax;
  }
}
