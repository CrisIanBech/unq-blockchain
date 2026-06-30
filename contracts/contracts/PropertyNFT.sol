// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IPropertyNFT.sol";
import "./interfaces/IRentalNFT.sol";

/**
 * @title PropertyNFT
 * @notice Represents permanent ownership of a real estate property.
 */
contract PropertyNFT is IPropertyNFT, ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _nextTokenId;
    address public immutable override rentalNFT;

    int256 public constant MERCATOR_MIN = -20037509;
    int256 public constant MERCATOR_MAX = 20037509;

    struct Location {
        int256 latitude;
        int256 longitude;
    }
    mapping(uint256 => Location) public propertyLocations;

    event PropertyMinted(uint256 indexed propertyId, address indexed owner, string tokenURI, int256 latitude, int256 longitude);

    constructor(address _rentalNFT) ERC721("Property NFT", "PROP") {
        rentalNFT = _rentalNFT;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _nextTokenId = 1;
    }

    /**
     * @notice Mints a new property NFT representing permanent ownership and its mirror RentalNFT.
     * @dev Restricted to roles with MINTER_ROLE.
     * @param to The recipient address (landlord).
     * @param _tokenURI The metadata URI containing property details.
     * @param latitude The latitude of the property (Mercator projection).
     * @param longitude The longitude of the property (Mercator projection).
     * @return The newly minted property token ID.
     */
    function mint(address to, string calldata _tokenURI, int256 latitude, int256 longitude)
        external
        override
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        require(latitude >= MERCATOR_MIN && latitude <= MERCATOR_MAX, "Invalid latitude");
        require(longitude >= MERCATOR_MIN && longitude <= MERCATOR_MAX, "Invalid longitude");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        // Atomic mint of the linked RentalNFT token with the exact same ID
        IRentalNFT(rentalNFT).mint(to, tokenId);

        propertyLocations[tokenId] = Location(latitude, longitude);

        emit PropertyMinted(tokenId, to, _tokenURI, latitude, longitude);

        return tokenId;
    }

    // Overrides required by Solidity

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId) || interfaceId == type(IPropertyNFT).interfaceId;
    }
}
