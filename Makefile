all: build/flattened/BRDCrowdsaleAuthorizer.sol build/flattened/BRDLockup.sol build/flattened/BRDToken.sol build/flattened/BRDCrowdsale.sol

build/flattened/BRDCrowdsaleAuthorizer.sol: contracts/BRDCrowdsaleAuthorizer.sol
	truffle-flattener contracts/BRDCrowdsaleAuthorizer.sol > build/flattened/BRDCrowdsaleAuthorizer.sol

build/flattened/BRDLockup.sol: contracts/BRDLockup.sol
	truffle-flattener contracts/BRDLockup.sol > build/flattened/BRDLockup.sol

build/flattened/BRDToken.sol: contracts/BRDToken.sol 
	truffle-flattener contracts/BRDToken.sol > build/flattened/BRDToken.sol 

build/flattened/BRDCrowdsale.sol: contracts/BRDCrowdsale.sol 
	truffle-flattener contracts/BRDCrowdsale.sol > build/flattened/BRDCrowdsale.sol

clean:
	rm build/flattened/*.sol
