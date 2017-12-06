.DEFAULT_GOAL := all
.PRECIOUS: build/flattened/%.sol

CONTRACTS=BRDCrowdsaleAuthorizer BRDLockup BRDToken BRDCrowdsale
JSONS=build/%.json
SOLCOPTS=--combined-json abi,asm,ast,bin,bin-runtime,clone-bin,compact-format,devdoc,hashes,interface,metadata,opcodes,srcmap,srcmap-runtime,userdoc --pretty-json --optimize --optimize-runs 0

build/flattened/%.sol:
	truffle-flattener contracts/$*.sol > $@

build/%.json: build/flattened/%.sol
	solc $(SOLCOPTS) $^ > $@

clean:
	-rm build/*.json 
	-rm build/flattened/*.sol

all: $(patsubst %,$(JSONS), $(CONTRACTS))
