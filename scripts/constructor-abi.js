var abi = require('ethereumjs-abi');

// var signature = "uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,address,uint256,uint256";
var signature = [
  'uint256', // _cap
  'uint256', //_minWei
  'uint256', //_maxWei
  'uint256', //_startTime
  'uint256', //_endTime
  'uint256', //_rate
  'uint256', //_ownerRate
  'uint256', //_bonusRate
  'address', //_wallet
];

module.exports = function(callback) {
  // ropsten values
  var network = 'ropsten';
  var accounts = ['0x001702423633bF0Bdba9d357403940A6A2F860f5'];

  // kovan values
  // XXX: add these

  var constants = require('../constants')(web3, accounts, network);

  var args = constants.creationArguments.map(function(arg) {
    if (typeof arg == 'object' || typeof arg == 'number') {
      var bn = new web3.BigNumber(arg);
      return bn.toString(16);
    }
    return arg;
  });

  var argsHuman = constants.creationArguments.map(function(arg) {
    if (typeof arg == 'object' || typeof arg == 'number') {
      var bn = new web3.BigNumber(arg);
      return bn.toString();
    }
    return arg;
  });

  console.log('args:');
  console.log(args);
  console.log('args-human:');
  console.log(argsHuman);

  console.log(abi.rawEncode(signature, args).toString('hex'));
  callback();
}
