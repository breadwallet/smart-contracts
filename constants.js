module.exports = function(web3, accounts, network) {
  if (network === undefined) {
    network = 'mainnet';
  }
  var c = {};
  c.decimals = 18;
  c.exponent = (new web3.BigNumber(10)).pow(c.decimals);

  // c.cap = (new web3.BigNumber(33333.3333)).mul(c.exponent);       // 33,333.3333 ETH @ $600 / ETH = $20,000,000
  // c.minContribution = (new web3.BigNumber(.5)).mul(c.exponent);   // .5 ETH min contribution
  // c.maxContribution = (new web3.BigNumber(200)).mul(c.exponent);  // 200 ETH initial max contribution
  // c.startTime = 1513389600;                                       // starts on Dec 16 02:00:00 GMT
  // c.endTime = c.startTime + (86400*8);                            // 8 days duration 
  // c.rate = new web3.BigNumber(900);                               // 900 tokens per eth
  // c.ownerRate = new web3.BigNumber(300);                          // 300 tokens per buyer eth
  // c.bonusRate = new web3.BigNumber(20);                           // 20% of tokens to lock up
  // c.numIntervals = 6;                                             // 6 unlock intervals
  // c.intervalDuration = (86400*30);                                // 30 days per interval
  // c.wallet = '0x9d66d75b46816d306572446f62305f72c4f6d2fd';        // beneficiary address

  // initial crowdsale
  c.cap = (new web3.BigNumber(5)).mul(c.exponent);                // 5 ETH @ $600 / ETH = $20,000,000
  c.minContribution = (new web3.BigNumber(.1)).mul(c.exponent);   // .1 ETH min contribution
  c.maxContribution = (new web3.BigNumber(1)).mul(c.exponent);    // 1 ETH initial max contribution
  c.startTime = 1513195200;                                       // starts on Dec 16 02:00:00 GMT
  c.endTime = c.startTime + (86400*1);                            // 1 days duration 
  c.rate = new web3.BigNumber(900);                               // 900 tokens per eth
  c.ownerRate = new web3.BigNumber(300);                          // 300 tokens per buyer eth
  c.bonusRate = new web3.BigNumber(20);                           // 20% of tokens to lock up
  c.numIntervals = 6;                                             // 6 unlock intervals
  c.intervalDuration = (86400*30);                                // 30 days per interval
  c.wallet = '0x9d66d75b46816d306572446f62305f72c4f6d2fd';        // beneficiary address

  if (network == 'development') {
    c.startTime = Math.floor(Date.now() / 1000) + 2; // now + N
    c.endTime = c.startTime + 10; // + 30 seconds
    c.cap = (new web3.BigNumber(100)).mul(c.exponent); // 100 ETH
    c.maxContribution = c.minContribution.mul(5); // 5 ETH
    c.intervalDuration = 5; // 5 seconds
    c.wallet = accounts[0];
  }

  if (network == 'kovan' || network == 'ropsten') {
    c.startTime = 1513389600; //  Saturday, December 16, 2017 2:00:00 AM
    c.endTime = c.startTime + 86400; // 1 days
    c.minContribution = (new web3.BigNumber(.001)).mul(c.exponent); // .001 eth
    c.maxContribution = (new web3.BigNumber(10).mul(c.exponent)); // 10 eth
    c.rate = new web3.BigNumber(90000); // tokens per eth
    c.ownerRate = new web3.BigNumber(30000); // tokens per buyer eth
    c.cap = (new web3.BigNumber(50)).mul(c.exponent);
    c.intervalDuration = 6*3600; // 6 hrs
    c.wallet = accounts[0];
  }

  c.creationArguments = [
    c.cap, c.minContribution, c.maxContribution,
    c.startTime, c.endTime,
    c.rate, c.ownerRate, c.bonusRate,
    c.wallet
  ];

  c.lockupArguments = [
    c.endTime, c.intervalDuration, c.numIntervals
  ];

  return c
}
