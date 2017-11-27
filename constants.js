module.exports = function(web3, accounts, network) {
  if (network === undefined) {
    network = 'mainnet';
  }
  var c = {};
  c.decimals = 18;
  c.exponent = (new web3.BigNumber(10)).pow(c.decimals);

  c.ownerShare = (new web3.BigNumber(54000000)).mul(c.exponent); // 54 mil BRD
  c.cap = (new web3.BigNumber(67786)).mul(c.exponent);  // 67,786 ETH
  c.minContribution = (new web3.BigNumber(1).mul(c.exponent)); // 1 ETH
  c.maxContribution = (new web3.BigNumber(3333).mul(c.exponent)); // 3333 ETH
  c.startTime = 1513296000; // dec 15 00:00:00 GMT
  c.endTime = c.startTime + (86400*8); // 8 days
  c.rate = (new web3.BigNumber(900)); // tokens per wei
  c.wallet = accounts[0];
  c.authorizer = accounts[0];
  c.numIntervals = 6;
  c.intervalDuration = (86400*30); // 30 days

  if (network == 'development') {
    c.startTime = Math.floor(Date.now() / 1000) + 1; // now + N
    c.endTime = c.startTime + 30; // + 30 seconds
    c.cap = (new web3.BigNumber(100).mul(c.exponent)); // 100 ETH
    c.maxContribution = c.minContribution.mul(5); // 5 ETH
    c.intervalDuration = 5; // 5 seconds
  }

  c.creationArguments = [
    c.cap, c.minContribution, c.maxContribution,
    c.startTime, c.endTime, c.rate, c.ownerShare,
    c.wallet, c.authorizer,
    c.numIntervals, c.intervalDuration
  ];

  return c
}
