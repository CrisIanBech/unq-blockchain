// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IReview.sol";
import "./interfaces/IRentalAgreementFactory.sol";
import "./interfaces/IRentalAgreement.sol";
import "./interfaces/IPropertyNFT.sol";
import "./interfaces/IRentalNFT.sol";

/**
 * @title Review
 * @notice On-chain review system for rental properties.
 * @dev Reviews are linked to verified rental agreements. Only tenants with
 *      active or completed agreements can post reviews, and only one per agreement.
 */
contract Review is IReview {
    address public immutable override propertyNFT;
    address public immutable override factory;

    uint256 public constant MAX_COMMENT_LENGTH = 280;

    mapping(uint256 => Review[]) private _reviews;
    mapping(address => bool) public override hasReviewed;
    mapping(address => bool) public override hasReviewedLandlord;
    mapping(uint256 => bool) public override hasReviewedLandlordGeneral;

    modifier validRating(uint8 rating) {
        if (rating < 1 || rating > 5) revert InvalidRating();
        _;
    }

    constructor(address _propertyNFT, address _factory) {
        propertyNFT = _propertyNFT;
        factory = _factory;
    }

    function postReview(
        uint256 propertyId,
        uint8 rating,
        string calldata comment
    ) external override validRating(rating) {
        if (bytes(comment).length > MAX_COMMENT_LENGTH) revert CommentTooLong();

        address owner = IERC721(propertyNFT).ownerOf(propertyId);
        address rentalNFT = IPropertyNFT(propertyNFT).rentalNFT();
        address agreementAddr = IRentalNFT(rentalNFT).userOf(propertyId);

        if (msg.sender == owner) {
            if (agreementAddr != address(0)) {
                if (hasReviewedLandlord[agreementAddr]) revert ReviewAlreadyPosted();
                hasReviewedLandlord[agreementAddr] = true;
            } else {
                if (hasReviewedLandlordGeneral[propertyId]) revert ReviewAlreadyPosted();
                hasReviewedLandlordGeneral[propertyId] = true;
            }

            _reviews[propertyId].push(Review({
                author: msg.sender,
                agreement: agreementAddr,
                rating: rating,
                comment: comment,
                timestamp: block.timestamp
            }));

            emit ReviewPosted(propertyId, msg.sender, agreementAddr, rating, comment);
        } else {
            if (agreementAddr == address(0)) revert NoActiveOrCompletedRental();

            IRentalAgreement agreement = IRentalAgreement(agreementAddr);
            if (agreement.tenant() != msg.sender) revert NotTenantOfRental();

            IRentalAgreement.AgreementStatus status = agreement.status();
            if (status != IRentalAgreement.AgreementStatus.Active &&
                status != IRentalAgreement.AgreementStatus.Completed) {
                revert NoActiveOrCompletedRental();
            }

            if (hasReviewed[agreementAddr]) revert ReviewAlreadyPosted();

            hasReviewed[agreementAddr] = true;

            _reviews[propertyId].push(Review({
                author: msg.sender,
                agreement: agreementAddr,
                rating: rating,
                comment: comment,
                timestamp: block.timestamp
            }));

            emit ReviewPosted(propertyId, msg.sender, agreementAddr, rating, comment);
        }
    }

    function getReviewCount(uint256 propertyId) external view override returns (uint256) {
        return _reviews[propertyId].length;
    }

    function getReview(uint256 propertyId, uint256 index) external view override returns (Review memory) {
        return _reviews[propertyId][index];
    }
}
