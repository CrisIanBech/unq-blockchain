// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/IRentalNFT.sol";

/**
 * @title RentalNFT
 * @notice Represents the permanent right to occupy a property using ERC4907.
 */
contract RentalNFT is IRentalNFT, ERC721 {
    address public immutable owner;
    address public override propertyNFT;

    struct UserInfo {
        address user;
        uint64 expires;
    }

    mapping(uint256 => UserInfo) private _users;

    error PropertyNFTAlreadySet();
    error OnlyPropertyNFT();
    error PropertyAlreadyOccupied();
    error UnauthorizedCaller();
    error TransferForbidden();

    modifier onlyPropertyNFT() {
        if (msg.sender != propertyNFT) revert OnlyPropertyNFT();
        _;
    }

    constructor() ERC721("Rental NFT", "RENT") {
        owner = msg.sender;
    }

    /**
     * @notice Sets the PropertyNFT address. Can only be called once by owner.
     */
    function setPropertyNFT(address _propertyNFT) external {
        if (propertyNFT != address(0)) revert PropertyNFTAlreadySet();
        if (msg.sender != owner) revert UnauthorizedCaller();
        propertyNFT = _propertyNFT;
    }

    /**
     * @notice Set the user and expiration of an NFT.
     * @dev Restricts msg.sender to the owner or approved operator in PropertyNFT.
     */
    function setUser(uint256 tokenId, address user, uint64 expires) external override {
        // Enforce Occupancy: Revert if assigning a new user and it's already occupied
        if (user != address(0) && userOf(tokenId) != address(0)) {
            revert PropertyAlreadyOccupied();
        }

        // Enforce Authorization: Must be owner or approved operator in PropertyNFT
        address tokenOwner = IERC721(propertyNFT).ownerOf(tokenId);
        if (msg.sender != tokenOwner &&
            !IERC721(propertyNFT).isApprovedForAll(tokenOwner, msg.sender) &&
            IERC721(propertyNFT).getApproved(tokenId) != msg.sender) 
        {
            revert UnauthorizedCaller();
        }

        _users[tokenId] = UserInfo(user, expires);
        emit UpdateUser(tokenId, user, expires);
    }

    /**
     * @notice Get the user address of an NFT.
     */
    function userOf(uint256 tokenId) public view override(IRentalNFT) returns (address) {
        if (uint256(_users[tokenId].expires) >= block.timestamp) {
            return _users[tokenId].user;
        }
        return address(0);
    }

    /**
     * @notice Get the user expiration of an NFT.
     */
    function userExpires(uint256 tokenId) public view override(IRentalNFT) returns (uint256) {
        return _users[tokenId].expires;
    }

    /**
     * @notice Mints the unique RentalNFT token corresponding to propertyId.
     * @dev Restricted to the propertyNFT contract.
     */
    function mint(address to, uint256 tokenId) external override onlyPropertyNFT {
        _mint(to, tokenId);
        emit RentalNFTCreated(tokenId, tokenId);
    }

    /**
     * @notice Disables transfer functionality. Always reverts.
     */
    function transferFrom(address, address, uint256) public pure override(ERC721, IERC721) {
        revert TransferForbidden();
    }

    /**
     * @notice Disables transfer functionality. Always reverts.
     */
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override(ERC721, IERC721) {
        revert TransferForbidden();
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
