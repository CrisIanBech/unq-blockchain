// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IPropertyNFT
 * @notice Interface for the PropertyNFT contract representing real estate ownership.
 */
interface IPropertyNFT is IERC721 {
    /**
     * @notice Mints a new property NFT to the specified address.
     * @dev Restricted to addresses with MINTER_ROLE in the implementation.
     * @param to The address that will own the minted NFT.
     * @param _tokenURI The metadata URI containing property details.
     * @param latitude The latitude of the property (Mercator projection).
     * @param longitude The longitude of the property (Mercator projection).
     * @return The newly generated property token ID.
     */
    function mint(address to, string calldata _tokenURI, int256 latitude, int256 longitude) external returns (uint256);

    /**
     * @notice Returns the linked RentalNFT contract address.
     */
    function rentalNFT() external view returns (address);
}
