pragma solidity ^0.4.15;

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
