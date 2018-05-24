var BRDCrowdsale = artifacts.require("BRDCrowdsale");
var constants = require('../constants.js');

var lockups = [
    // ["370777.50", "0x980844d9bC79F363cafe22a371F6244232402e79"], // 1
    // ["225000.00", "0xED7898CA56255675b2dd510b5B2112BFf9e972DA"], // 2
    // ["135000.00", "0xbd125f7c40e252a090871b865aca471f5cb8ee01"], // 3
    // ["139098.07", "0x03aa28a83Bc4aeef94603b9c159E16d93bd47BB5"], // 4
    // ["225000.00", "0x041DeDfeC783D8D6D8BD4f81Cb3675042151184D"], // 5
    // ["241875.00", "0x7adc26b95c3e4625e1ac01f4eba38273e6c1ce48"], // 6
    // ["225000.00", "0xD1AfEe2cE6f9b4b153D9E7b2e457d2004C0A8d94"], // 7 
    // ["225000.00", "0x199183bB208F7213eb60EB5EC058C352e73b5609"], // 8
    // ["225000.00", "0x3413e211F87912FF57E93b4cEc3a76E782663DB4"], // 9
    // ["180000.00", "0x6788e9A381F0734D2db5C9306F332d893D3F1013"], // 10
    // ["337500.00", "0x85caC145aE8aA571De38a7657af51ec776eA10aB"], // 11
    // ["393750.00", "0x89f40fde58eEe6D66F8f67CBBA21886c3640c3e5"], // 12
    // ["393750.00", "0xB36AcB2125093a52B955069228ab5b1Cbf2b5A3a"], // 13
    // ["562500.00", "0x33fBa7651eefd9b44d09bf7e9002617e1aeC7991"], // 14
    // ["2812500.00", "0x33fBa7651eefd9b44d09bf7e9002617e1aeC7991"], // 15
    // ["450000.00", "0xD6901D6a9b20240684abD43fa658486d9083D21D"], // 16
    // ["3859875.00", "0xe985BF38bCDADdD37B4E55b7fB7669174c006461"], // 17
    // ["2362500.00", "0x33fBa7651eefd9b44d09bf7e9002617e1aeC7991"], // 18
    // ["2486963.25", "0x0b0590cf091808a4a302a48792060fcf1915c308"], // 19
    // ["2812500.00", "0xf433c2141c253377830501ce76f8f31c41a2797b"], // 20
    // ["3375000.00", "0xD05586471d8e4266c1f4DE77a33777085CB2144E"], // 21
    // ["56250.00", "0x98d027C9B1b68c8C52B0dC9a8A85b96d97c80fdC"], // 22
    // ["140625.00", "0x8027B855183C6324e205F090988E0763e1393683"], // 23
    // ["562500.00", "0x1d90f96567852738c0e6a6b23f830de3cd082410"], // 24
    // ["2812500.00", "0x33fBa7651eefd9b44d09bf7e9002617e1aeC7991"], // 25
    // ["225000.00", "0xE23D91d9D6C1B08f7F3477f902123411901Bb30B"], // 26
    // ["172462.50", "0x33fBa7651eefd9b44d09bf7e9002617e1aeC7991"], // 27
    // ["108000", "0x60Aa341B1BfBF2c46EFb5480A44BDa4cb754374B"],  // ["1810125.00", "0x60Aa341B1BfBF2c46EFb5480A44BDa4cb754374B"], // 28
    // ["115628.70", "0x33fBa7651eefd9b44d09bf7e9002617e1aeC7991"], // 29 -- CANCELED ENTIRELY, SENDING TO ESCROW
    // ["380139.98", "0x0bf43BA665BdBb4ee5d328A1E05955C8a3Fd281f"], // 30
    // ["168750.00", "0x4AdD6B9E6183723492d7291d74aF6bf153Dd5C31"], // 31
    // ["225000.00", "0xAe912ECf340f9D8a224F40987aA5F56C8c14bE6c"], // 32
    // ["337500.00", "0x33fBa7651eefd9b44d09bf7e9002617e1aeC7991"], // 33
    // ["308430.00", "0x1621d5d7b154c7288f32Bf0C27da575546dF6e75"], // 34
    // ["302625.00", "0xA65E9feC4f892ef6E9FE3888eD9B0EB6AaB1f0FD"], // 35
    // ["3214125.00", "0x0f039c8b813f514e95694060cf967dd875224f0a"], // 36
];

module.exports = function(deployer, network, accounts) {
    var c = constants(web3, accounts, network);
    var crowdsale = BRDCrowdsale.at('0x5250776FAD5A73707d222950de7999d3675a2722');
    for (var i = 0; i < lockups.length; i++) {
        var lockup = lockups[i];
        if (lockup.length) {
            var amount = new web3.BigNumber(lockup[0]).mul(c.exponent);
            var to = lockup[1];
            console.log((i+1)+'', 'locking up', amount.div(c.exponent).toString(10), 'to', to);
            crowdsale.lockupTokens(to, amount);
        }
    }
}
