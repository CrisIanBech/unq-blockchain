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
     * @dev Emitted when the unique RentalNFT token is minted.
     */
    event RentalNFTMinted(uint256 indexed tokenId, address indexed owner);

    /**
     * @dev Emitted when the unique RentalNFT token is burned.
     */
    event RentalNFTBurned(uint256 indexed tokenId);

    /**
     * @notice Set the user and expiration of an NFT.
     * @dev Can only be called by the immutable controller (the RentalAgreement).
     * @param tokenId The NFT token ID.
     * @param user The address of the tenant.
     * @param expires The expiration timestamp of the tenant's right.
     */
    function setUser(uint256 tokenId, address user, uint64 expires) external;

    /**
     * @notice Get the user address of an NFT.
     * @param tokenId The NFT token ID.
     * @return The address of the current user, or address(0) if expired/none.
     */
    function userOf(uint256 tokenId) external view returns (address);

    /**
     * @notice Get the user expiration of an NFT.
     * @param tokenId The NFT token ID.
     * @return The expiration timestamp of the current user.
     */
    function userExpires(uint256 tokenId) external view returns (uint256);

    /**
     * @notice Mints the unique RentalNFT token.
     * @dev Restricted to the immutable controller.
     * @param to The recipient address (always the RentalAgreement itself).
     * @param tokenId The token ID to mint (typically 1).
     */
    function mint(address to, uint256 tokenId) external;

    /**
     * @notice Burns the unique RentalNFT token.
     * @dev Restricted to the immutable controller.
     * @param tokenId The token ID to burn.
     */
    function burn(uint256 tokenId) external;

    /**
     * @notice Returns the authorized RentalAgreement controller address.
     */
    function controller() external view returns (address);
}
