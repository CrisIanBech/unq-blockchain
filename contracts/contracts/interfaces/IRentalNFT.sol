// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IERC4907.sol";

/**
 * @title IRentalNFT
 * @notice Interface for RentalNFT supporting the EIP-4907 user assignment mechanism.
 */
interface IRentalNFT is IERC721, IERC4907 {
    /**
     * @dev Emitted when the unique RentalNFT token is minted mirror-linked.
     */
    event RentalNFTCreated(uint256 indexed propertyId, uint256 indexed rentalTokenId);

    /**
     * @notice Mints the unique RentalNFT token corresponding to propertyId.
     * @dev Restricted to the propertyNFT contract.
     */
    function mint(address to, uint256 tokenId) external;

    /**
     * @notice Returns the linked PropertyNFT address.
     */
    function propertyNFT() external view returns (address);
}