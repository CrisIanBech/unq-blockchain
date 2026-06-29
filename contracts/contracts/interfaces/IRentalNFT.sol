// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IRentalNFT
 * @notice Interface for RentalNFT supporting the EIP-4907 user assignment mechanism.
 */
interface IRentalNFT is IERC721 {
    /**
     * @dev Emitted when the user of an NFT is updated or expires.
     */
    event UpdateUser(uint256 indexed tokenId, address indexed user, uint64 expires);

    /**
     * @dev Emitted when the unique RentalNFT token is minted mirror-linked.
     */
    event RentalNFTCreated(uint256 indexed propertyId, uint256 indexed rentalTokenId);

    /**
     * @notice Set the user and expiration of an NFT.
     * @dev Restricts msg.sender to the owner or approved operator in PropertyNFT.
     */
    function setUser(uint256 tokenId, address user, uint64 expires) external;

    /**
     * @notice Get the user address of an NFT.
     */
    function userOf(uint256 tokenId) external view returns (address);

    /**
     * @notice Get the user expiration of an NFT.
     */
    function userExpires(uint256 tokenId) external view returns (uint256);

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
