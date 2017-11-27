pragma solidity ^0.4.15;

// File: contracts/BRDCrowdsaleAuthorizer.sol

/**
 * Contract BRDCrowdsaleAuthorizer is used by the crowdsale website
 * to autorize wallets to participate in the crowdsale. Because all
 * participants must go through the KYC/AML phase, only accounts
 * listed in this contract may contribute to the crowdsale
 */
contract BRDCrowdsaleAuthorizer {
  // these accounts are authorized to participate in the crowdsale
  mapping (address => bool) internal authorizedAccounts;
  // these accounts are authorized to authorize accounts
  mapping (address => bool) internal authorizers;
  // this address created the authorizer contract
  address internal contractCreator;

  // emitted when a new account is authorized
  event Authorized(address indexed _to);

  // constructor
  function BRDCrowdsaleAuthorizer(address _initialAuthorzer) {
    // retain the contract creator
    contractCreator = msg.sender;
    // retain the initial authorizer
    authorizers[_initialAuthorzer] = true;
  }

  // add an authorizer to the authorizers mapping. the _newAuthorizer will
  // be able to add other authorizers and authorize crowdsale participants
  function addAuthorizer(address _newAuthorizer) onlyCreatorOrAuthorizer() {
    // allow the provided address to authorize accounts
    authorizers[_newAuthorizer] = true;
  }

  // remove an authorizer from the authorizers mapping. the _bannedAuthorizer will
  // no longer have permission to do anything on this contract
  function removeAuthorizer(address _bannedAuthorizer) onlyCreatorOrAuthorizer() {
    // only attempt to remove the authorizer if they are currently authorized
    require(authorizers[_bannedAuthorizer]);
    // remove the authorizer
    delete authorizers[_bannedAuthorizer];
  }

  // allow an account to participate in the crowdsale
  function authorizeAccount(address _newAccount) onlyCreatorOrAuthorizer() {
    if (!authorizedAccounts[_newAccount]) {
      // allow the provided account to participate in the crowdsale
      authorizedAccounts[_newAccount] = true;
      // emit the Authorized event
      Authorized(_newAccount);
    }
  }

  // returns whether or not the provided _account is an authorizer
  function isAuthorizer(address _account) constant returns (bool _isAuthorizer) {
    return authorizers[_account] == true;
  }

  // returns whether or not the provided _account is authorized to participate in the crowdsale
  function isAuthorized(address _account) constant returns (bool _authorized) {
    return authorizedAccounts[_account] == true;
  }

  // allow only the contract creator or one of the authorizers to do this
  modifier onlyCreatorOrAuthorizer() {
    require(msg.sender == contractCreator || authorizers[msg.sender]);
    _;
  }
}

// File: zeppelin-solidity/contracts/math/SafeMath.sol

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
  function mul(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal constant returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  function sub(uint256 a, uint256 b) internal constant returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

// File: zeppelin-solidity/contracts/ownership/Ownable.sol

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  function Ownable() {
    owner = msg.sender;
  }


  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }


  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) onlyOwner public {
    require(newOwner != address(0));
    OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

}

// File: contracts/BRDLockup.sol

/**
 * Contract BRDLockup keeps track of a vesting schedule for pre-sold tokens.
 * Pre-sold tokens are rewarded up to `numIntervals` times separated by an
 * `interval` of time. An equal amount of tokens (`allocation` divided by `numIntervals`)
 * is marked for reward each `interval`.
 *
 * The owner of the contract will call processInterval() which will
 * update the allocation state. The owner of the contract should then
 * read the allocation data and reward the beneficiaries.
 */
contract BRDLockup is Ownable {
  using SafeMath for uint256;

  // Allocation stores info about how many tokens to reward a beneficiary account
  struct Allocation {
    address beneficiary;      // account to receive rewards
    uint256 allocation;       // total allocated tokens
    uint256 remainingBalance; // remaining balance after the current interval
    uint256 currentInterval;  // the current interval for the given reward
    uint256 currentReward;    // amount to be rewarded during the current interval
  }

  // the allocation state
  Allocation[] public allocations;

  // the date at which allocations begin unlocking
  uint256 public unlockDate;

  // the current unlock interval
  uint256 public currentInterval;

  // the interval at which allocations will be rewarded
  uint256 public intervalDuration;

  // the number of total reward intervals, zero indexed
  uint256 public numIntervals;

  event Unlock(address indexed _to, uint256 _amount);

  // constructor
  // @param _crowdsaleEndDate - the date the crowdsale ends
  function BRDLockup(uint256 _crowdsaleEndDate, uint256 _numIntervals, uint256 _intervalDuration) {
    unlockDate = _crowdsaleEndDate;
    numIntervals = _numIntervals;
    intervalDuration = _intervalDuration;
    currentInterval = 0;
  }

  // update the allocation storage remaining balances
  function processInterval() onlyOwner returns (bool _shouldProcessRewards) {
    // ensure the time interval is correct
    bool correctInterval = now >= unlockDate && now.sub(unlockDate) > currentInterval.mul(intervalDuration);
    bool validInterval = currentInterval < numIntervals;
    if (!correctInterval || !validInterval) return false;

    // advance the current interval
    currentInterval = currentInterval.add(1);

    // number of iterations to read all allocations
    uint _allocationsIndex = allocations.length;

    // loop through every allocation
    for (uint _i = 0; _i < _allocationsIndex; _i++) {
      // the current reward for the allocation at index `i`
      uint256 _amountToReward;

      // if we are at the last interval, the reward amount is the entire remaining balance
      if (currentInterval == numIntervals) {
        _amountToReward = allocations[_i].remainingBalance;
      }
      // otherwise the reward amount is the total allocation divided by the number of intervals
      else {
        _amountToReward = allocations[_i].allocation.div(numIntervals);
      }
      // update the allocation storage
      allocations[_i].currentReward = _amountToReward;
    }

    return true;
  }

  // the total number of allocations
  function numAllocations() constant public returns (uint) {
    return allocations.length;
  }

  // the amount allocated for beneficiary at `_index`
  function allocationAmount(uint _index) constant public returns (uint256) {
    return allocations[_index].allocation;
  }

  // reward the beneficiary at `_index`
  function unlock(uint _index) onlyOwner returns (bool _shouldReward, address _beneficiary, uint256 _rewardAmount) {
    // ensure the beneficiary is not rewarded twice during the same interval
    if (allocations[_index].currentInterval < currentInterval) {
      // record the currentInterval so the above check is useful
      allocations[_index].currentInterval = currentInterval;
      // subtract the reward from their remaining balance
      allocations[_index].remainingBalance = allocations[_index].remainingBalance.sub(allocations[_index].currentReward);
      // emit event
      Unlock(allocations[_index].beneficiary, allocations[_index].currentReward);
      // return value
      _shouldReward = true;
    } else {
      // return value
      _shouldReward = false;
    }

    // return values
    _rewardAmount = allocations[_index].currentReward;
    _beneficiary = allocations[_index].beneficiary;
  }

  // add a new allocation to the lockup
  function pushAllocation(address _beneficiary, uint256 _numTokens) onlyOwner {
    require(now < unlockDate);
    allocations.push(Allocation(_beneficiary, _numTokens, _numTokens, 0, 0));
  }
}

// File: zeppelin-solidity/contracts/token/ERC20Basic.sol

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  uint256 public totalSupply;
  function balanceOf(address who) public constant returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

// File: zeppelin-solidity/contracts/token/BasicToken.sol

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) balances;

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));

    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public constant returns (uint256 balance) {
    return balances[_owner];
  }

}

// File: zeppelin-solidity/contracts/token/ERC20.sol

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) public constant returns (uint256);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

// File: zeppelin-solidity/contracts/token/StandardToken.sol

/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {

  mapping (address => mapping (address => uint256)) allowed;


  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));

    uint256 _allowance = allowed[_from][msg.sender];

    // Check is not needed because sub(_allowance, _value) will already throw if this condition is not met
    // require (_value <= _allowance);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = _allowance.sub(_value);
    Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner, address _spender) public constant returns (uint256 remaining) {
    return allowed[_owner][_spender];
  }

  /**
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   */
  function increaseApproval (address _spender, uint _addedValue)
    returns (bool success) {
    allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  function decreaseApproval (address _spender, uint _subtractedValue)
    returns (bool success) {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}

// File: zeppelin-solidity/contracts/token/MintableToken.sol

/**
 * @title Mintable token
 * @dev Simple ERC20 Token example, with mintable token creation
 * @dev Issue: * https://github.com/OpenZeppelin/zeppelin-solidity/issues/120
 * Based on code by TokenMarketNet: https://github.com/TokenMarketNet/ico/blob/master/contracts/MintableToken.sol
 */

contract MintableToken is StandardToken, Ownable {
  event Mint(address indexed to, uint256 amount);
  event MintFinished();

  bool public mintingFinished = false;


  modifier canMint() {
    require(!mintingFinished);
    _;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(address _to, uint256 _amount) onlyOwner canMint public returns (bool) {
    totalSupply = totalSupply.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    Mint(_to, _amount);
    Transfer(0x0, _to, _amount);
    return true;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() onlyOwner public returns (bool) {
    mintingFinished = true;
    MintFinished();
    return true;
  }
}

// File: contracts/BRDToken.sol

contract BRDToken is MintableToken {
  using SafeMath for uint256;

  string public name = "Bread Token";
  string public symbol = "BRD";
  uint256 public decimals = 18;

  // override StandardToken#transferFrom
  // ensures that minting has finished or the message sender is the token owner
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(mintingFinished || msg.sender == owner);
    return super.transferFrom(_from, _to, _value);
  }

  // override StandardToken#transfer
  // ensures the minting has finished or the message sender is the token owner
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(mintingFinished || msg.sender == owner);
    return super.transfer(_to, _value);
  }
}

// File: zeppelin-solidity/contracts/crowdsale/Crowdsale.sol

/**
 * @title Crowdsale
 * @dev Crowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Funds collected are forwarded to a wallet
 * as they arrive.
 */
contract Crowdsale {
  using SafeMath for uint256;

  // The token being sold
  MintableToken public token;

  // start and end timestamps where investments are allowed (both inclusive)
  uint256 public startTime;
  uint256 public endTime;

  // address where funds are collected
  address public wallet;

  // how many token units a buyer gets per wei
  uint256 public rate;

  // amount of raised money in wei
  uint256 public weiRaised;

  /**
   * event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value weis paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);


  function Crowdsale(uint256 _startTime, uint256 _endTime, uint256 _rate, address _wallet) {
    require(_startTime >= now);
    require(_endTime >= _startTime);
    require(_rate > 0);
    require(_wallet != 0x0);

    token = createTokenContract();
    startTime = _startTime;
    endTime = _endTime;
    rate = _rate;
    wallet = _wallet;
  }

  // creates the token to be sold.
  // override this method to have crowdsale of a specific mintable token.
  function createTokenContract() internal returns (MintableToken) {
    return new MintableToken();
  }


  // fallback function can be used to buy tokens
  function () payable {
    buyTokens(msg.sender);
  }

  // low level token purchase function
  function buyTokens(address beneficiary) public payable {
    require(beneficiary != 0x0);
    require(validPurchase());

    uint256 weiAmount = msg.value;

    // calculate token amount to be created
    uint256 tokens = weiAmount.mul(rate);

    // update state
    weiRaised = weiRaised.add(weiAmount);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);

    forwardFunds();
  }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    wallet.transfer(msg.value);
  }

  // @return true if the transaction can buy tokens
  function validPurchase() internal constant returns (bool) {
    bool withinPeriod = now >= startTime && now <= endTime;
    bool nonZeroPurchase = msg.value != 0;
    return withinPeriod && nonZeroPurchase;
  }

  // @return true if crowdsale event has ended
  function hasEnded() public constant returns (bool) {
    return now > endTime;
  }


}

// File: zeppelin-solidity/contracts/crowdsale/FinalizableCrowdsale.sol

/**
 * @title FinalizableCrowdsale
 * @dev Extension of Crowdsale where an owner can do extra work
 * after finishing.
 */
contract FinalizableCrowdsale is Crowdsale, Ownable {
  using SafeMath for uint256;

  bool public isFinalized = false;

  event Finalized();

  /**
   * @dev Must be called after crowdsale ends, to do some extra finalization
   * work. Calls the contract's finalization function.
   */
  function finalize() onlyOwner public {
    require(!isFinalized);
    require(hasEnded());

    finalization();
    Finalized();

    isFinalized = true;
  }

  /**
   * @dev Can be overridden to add finalization logic. The overriding function
   * should call super.finalization() to ensure the chain of finalization is
   * executed entirely.
   */
  function finalization() internal {
  }
}

// File: contracts/BRDCrowdsale.sol

contract BRDCrowdsale is FinalizableCrowdsale {
  using SafeMath for uint256;

  // maximum amount of wei raised during this crowdsale
  uint256 public cap;

  // minimum per-participant wei contribution
  uint256 public minContribution;

  // maximum per-participant wei contribution
  uint256 public maxContribution;

  // number of tokens assigned to target wallet
  uint256 public ownerShare;

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
    uint256 _ownerShare,  // number of tokens assigned to target wallet
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
    ownerShare = _ownerShare;
    authorizer = new BRDCrowdsaleAuthorizer(_authorizer);
    lockup = new BRDLockup(_endTime, _numUnlockIntervals, _unlockIntervalDuration);
    mintOwnerShareTokens();
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

  // adds a token allocation to the lockup contract. may only be called
  // before the end of the crowdsale. will also mint the new token
  // allocation with the crowdsale contract as the owner
  function lockupTokens(address _to, uint256 _amount) onlyOwner {
    require(!isFinalized);
    lockup.pushAllocation(_to, _amount);
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

  // mints the tokens owned by the crowdsale wallet
  function mintOwnerShareTokens() internal {
    token.mint(wallet, ownerShare);
  }
}
