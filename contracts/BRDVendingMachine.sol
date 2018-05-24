pragma solidity ^0.4.18;

import "./zeppelin-solidity-1.4/Ownable.sol";
import "./zeppelin-solidity-1.4/ERC20.sol";


/**
 * BRDVendingMachine is a contract used to bulk-transfer tokens to batches of users.
 * It's primary interaction pattern is thus:
 *   1. A wallet creates the contract
 *   2. The wallet sends tokens to the contract
 *   3. The wallet executs bulkTransfer() to send tokens to the provided accounts
 */
contract BRDVendingMachine is Ownable {
    ERC20 public token;

    event BulkTransfer(uint256 indexed _transferID, address indexed _contract, address[] _addresses, uint256[] _amounts);
    event Withdraw(address indexed _contract, address indexed _to, uint256 _amount);

    constructor(ERC20 _token) Ownable() public {
        token = _token;
    }

    /**
     * bulkTransfer executes up to 100 transfers of ERC20 tokens to the supplied addresses
     *
     * the 100 limit is not enforced however this should be taken as the practical limit since most ERC-20
     * transfer take around 45-60k gas, and we wish to keep the total transaction size under 750k gas.
     *
     * @param _transferID a number to uniquely identify this transfer
     * @param _addresses the addresses to transfer to
     * @param _amounts the amounts to transfer, 1-1 relationship with @param _addresses
     * @return the number of transfers executed
     */
    function bulkTransfer(uint256 _transferID, address[] _addresses, uint256[] _amounts) onlyOwner public returns (uint) {
        // ensure the maximum amount of transfers is not over 100
        require(_addresses.length <= 100);
        // ensure the addresses and amounts are exactly the same length
        require(_addresses.length == _amounts.length);
        // count the number of transfers
        uint _transfers = 0;
        for (uint _i = 0; _i < _addresses.length; _i++) {
            // ensure none of the addresses are 0x0
            address _to = _addresses[_i];
            require(_to != 0x0);
            bool _didTransfer = token.transfer(_to, _amounts[_i]);
            require(_didTransfer);
            _transfers += 1;
        }
        emit BulkTransfer(_transferID, address(token), _addresses, _amounts);
        return _transfers;
    }

    /**
     * withdraw will transfer an amount of an ERC-20 balance to another address
     *
     * @param _to recipient address
     * @param _amount receipient amount
     * @return the same value that ERC20.transferFrom would return
     */
    function withdraw(address _to, uint256 _amount) onlyOwner public returns (bool) {
        bool _didWithdraw = token.transfer(_to, _amount);
        if (_didWithdraw) {
            emit Withdraw(address(token), _to, _amount);
        }
        return _didWithdraw;
    }

    /**
     * balanceOf retrieves the current balance of a given token
     * @return this contract's balance at the provided token contract
     */
    function balanceOf() public view returns (uint256) {
        return token.balanceOf(this);
    }

    // this contract is NOT payable
    function () public payable {
        require(false);
    }
}
