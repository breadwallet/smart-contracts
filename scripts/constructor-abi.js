var abi = require('ethereumjs-abi');

var signature = "BRDCrowdsale(uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,address,uint256,uint256)";

module.exports = function(callback) {
  // ropsten values
  var network = 'ropsten';
  var accounts = ['0x001702423633bF0Bdba9d357403940A6A2F860f5'];

  var constants = require('../constants')(web3, accounts, network);

  var args = constants.creationArguments.map(function(arg) {
    if (typeof arg.toDigits !== 'undefined') {
      return arg.toDigits();
    }
    return arg;
  });

  console.log('args');
  console.log(args);

  console.log(abi.rawEncode(signature, args));
  callback();
}
