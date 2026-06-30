// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC contract for testing purposes with 6 decimals.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    /**
     * @dev Overrides default decimals to match real USDC (6 decimals).
     */
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint tokens to a given address for testing.
     * @param to The address receiving the minted tokens.
     * @param amount The amount of tokens to mint (with 6 decimals).
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
