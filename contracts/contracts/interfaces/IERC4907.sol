// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC4907
 * @dev Interface for ERC-4907: Rental NFT, an extension of ERC-721.
 */
interface IERC4907 {
    /**
     * @dev Emitted when the user of an NFT is updated or expires.
     */
    event UpdateUser(uint256 indexed tokenId, address indexed user, uint64 expires);

    /**
     * @notice Set the user and expiration of an NFT.
     * @dev The zero address indicates there is no user.
     * @param tokenId The NFT to set the user for.
     * @param user The new user of the NFT.
     * @param expires The UNIX timestamp when the user's access expires.
     */
    function setUser(uint256 tokenId, address user, uint64 expires) external;

    /**
     * @notice Get the user address of an NFT.
     * @dev The zero address indicates that there is no user or the user has expired.
     * @param tokenId The NFT to get the user for.
     * @return The user address for this NFT.
     */
    function userOf(uint256 tokenId) external view returns (address);

    /**
     * @notice Get the user expiration of an NFT.
     * @param tokenId The NFT to get the expiration for.
     * @return The expiration timestamp for this NFT user.
     */
    function userExpires(uint256 tokenId) external view returns (uint256);
}
