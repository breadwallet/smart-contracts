pragma solidity ^0.4.15;

import 'zeppelin-solidity/contracts/token/MintableToken.sol';

contract BRDToken is MintableToken {
  string public name = "Bread Token";
  string public symbol = "BRD";
  uint256 public decimals = 18;
}
