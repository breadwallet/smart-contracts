pragma solidity ^0.4.15;

import './BRDToken.sol';
import './BRDCrowdsaleAuthorizer.sol';
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
  }

  // overriding Crowdsale#validPurchase
  function createTokenContract() internal returns (MintableToken) {
    return new BRDToken();
  }

  // overriding Crowdsale#validPurchase to add extra cap logic
  // @return true if investors can buy at the moment
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
    token.finishMinting();
  }
}
