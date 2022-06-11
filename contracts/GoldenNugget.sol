//SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract GoldenNugget is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address minter) ERC20("Golden Nugget", "GN") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        if (minter != address(0)) {
            _grantRole(MINTER_ROLE, minter);
        }
    }

    function mint(address _user, uint256 _amount)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(_user, _amount);
    }
}
