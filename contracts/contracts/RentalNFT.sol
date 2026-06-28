// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/IRentalNFT.sol";

/**
 * @title RentalNFT
 * @notice Represents the temporary right to occupy a property using ERC4907.
 */
contract RentalNFT is IRentalNFT, ERC721 {
    address public immutable controller;

    struct UserInfo {
        address user;
        uint64 expires;
    }

    mapping(uint256 => UserInfo) private _users;

    error UnauthorizedController();

    modifier onlyController() {
        if (msg.sender != controller) revert UnauthorizedController();
        _;
    }

    constructor() ERC721("Rental NFT", "RENT") {
        controller = msg.sender;
    }

    /**
     * @notice Set the user and expiration of an NFT.
     * @dev Only callable by the immutable controller (the RentalAgreement).
     */
    function setUser(uint256 tokenId, address user, uint64 expires) external onlyController {
        _requireOwned(tokenId);
        _users[tokenId] = UserInfo(user, expires);
        emit UpdateUser(tokenId, user, expires);
    }

    /**
     * @notice Get the user address of an NFT.
     * @param tokenId The NFT token ID.
     * @return The address of the current user, or address(0) if expired/none.
     */
    function userOf(uint256 tokenId) public view override(IRentalNFT) returns (address) {
        if (uint256(_users[tokenId].expires) >= block.timestamp) {
            return _users[tokenId].user;
        }
        return address(0);
    }

    /**
     * @notice Get the user expiration of an NFT.
     * @param tokenId The NFT token ID.
     * @return The expiration timestamp of the current user.
     */
    function userExpires(uint256 tokenId) public view override(IRentalNFT) returns (uint256) {
        return _users[tokenId].expires;
    }

    /**
     * @notice Mints the unique RentalNFT token.
     * @dev Restricted to the immutable controller.
     */
    function mint(address to, uint256 tokenId) external onlyController {
        _mint(to, tokenId);
        emit RentalNFTMinted(tokenId, to);
    }

    /**
     * @notice Burns the unique RentalNFT token.
     * @dev Restricted to the immutable controller.
     */
    function burn(uint256 tokenId) external onlyController {
        _burn(tokenId);
        emit RentalNFTBurned(tokenId);
    }

    /**
     * @notice Overrides supportsInterface to support both ERC721 and IRentalNFT interfaces.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId) || interfaceId == type(IRentalNFT).interfaceId;
    }
}
