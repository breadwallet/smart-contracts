var BRDCrowdsale = artifacts.require("BRDCrowdsale");

module.exports = function(deployer, network, accounts) {
  // both BRDToken and Ether use the same decimals
  const decimals = 18;
  const exponent = (new web3.BigNumber(10)).pow(decimals);

  const ownerShare = (new web3.BigNumber(54000000)).mul(exponent); // 54 mil BRD
  const cap = (new web3.BigNumber(67786)).mul(exponent);  // 67,786 ETH
  const startTime = web3.eth.getBlock(web3.eth.blockNumber).timestamp + 1;
  const endTime = startTime + (86400*8); // 8 days
  const rate = (new web3.BigNumber(900)).mul(exponent);
  const wallet = accounts[0];
  const authorizer = accounts[0];
  const numIntervals = 6;
  const intervalDuration = 1; // XXX: temporary, should be (86400*30); // 30 days

  deployer.deploy(
    BRDCrowdsale,
    cap, startTime, endTime, rate, ownerShare, wallet, authorizer,
    numIntervals, intervalDuration
  ).then(function() {
    // XXX: temporary, put actual presale allocations here
    var crowdsale = BRDCrowdsale.at(BRDCrowdsale.address);
    for (let i = 0; i < accounts.length; i++) {
      crowdsale.lockupTokens(accounts[i], (new web3.BigNumber(6).mul(exponent)));
    }
  });
};
