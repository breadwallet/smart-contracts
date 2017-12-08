module.exports = function(web3, accounts, network) {
  if (network === undefined) {
    network = 'mainnet';
  }
  var c = {};
  c.decimals = 18;
  c.exponent = (new web3.BigNumber(10)).pow(c.decimals);

  c.cap = (new web3.BigNumber(67786)).mul(c.exponent);  // 67,786 ETH
  c.minContribution = (new web3.BigNumber(1)).mul(c.exponent); // 1 ETH
  c.maxContribution = (new web3.BigNumber(3333)).mul(c.exponent); // 3333 ETH
  c.startTime = 1513296000; // dec 15 00:00:00 GMT
  c.endTime = c.startTime + (86400*8); // 8 days
  c.rate = new web3.BigNumber(900); // tokens per eth
  c.ownerRate = new web3.BigNumber(300); // tokens per buyer eth
  c.bonusRate = new web3.BigNumber(20); // percentage of tokens to lock up
  c.wallet = accounts[0];
  c.authorizer = accounts[0];
  c.numIntervals = 6;
  c.intervalDuration = (86400*30); // 30 days

  if (network == 'development') {
    c.startTime = Math.floor(Date.now() / 1000) + 2; // now + N
    c.endTime = c.startTime + 10; // + 30 seconds
    c.cap = (new web3.BigNumber(100)).mul(c.exponent); // 100 ETH
    c.maxContribution = c.minContribution.mul(5); // 5 ETH
    c.intervalDuration = 5; // 5 seconds
  }

  if (network == 'kovan' || network == 'ropsten') {
    c.startTime = 1512666000; // Thursday, December 7, 2017 5:00:00 PM
    c.endTime = c.startTime + 86400; // 1 days
    c.minContribution = (new web3.BigNumber(.001)).mul(c.exponent); // .001 eth
    c.maxContribution = (new web3.BigNumber(10).mul(c.exponent)); // 10 eth
    c.rate = new web3.BigNumber(90000); // tokens per eth
    c.ownerRate = new web3.BigNumber(30000); // tokens per buyer eth
    c.cap = (new web3.BigNumber(50)).mul(c.exponent);
    c.intervalDuration = 6*3600; // 6 hrs
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
