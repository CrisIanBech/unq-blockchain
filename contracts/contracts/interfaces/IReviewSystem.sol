// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IReviewSystem
 * @notice Interface for the ReviewSystem contract managing on-chain property reviews.
 */
interface IReviewSystem {
    struct Review {
        address author;
        address agreement;
        uint8 rating;
        string comment;
        uint256 timestamp;
    }

    event ReviewPosted(
        uint256 indexed propertyId,
        address indexed author,
        address indexed agreement,
        uint8 rating,
        string comment
    );

    error InvalidRating();
    error CommentTooLong();
    error NoActiveOrCompletedRental();
    error NotTenantOfRental();
    error ReviewAlreadyPosted();
    error UnauthorizedCaller();

    function propertyNFT() external view returns (address);
    function factory() external view returns (address);

    function postReview(
        uint256 propertyId,
        uint8 rating,
        string calldata comment
    ) external;

    function getReviewCount(uint256 propertyId) external view returns (uint256);
    function getReview(uint256 propertyId, uint256 index) external view returns (Review memory);
    function hasReviewed(address agreement) external view returns (bool);
}
