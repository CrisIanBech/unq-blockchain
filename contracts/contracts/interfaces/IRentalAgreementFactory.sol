// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRentalAgreementFactory
 * @notice Interface for the Factory contract managing deployment of RentalAgreements.
 */
interface IRentalAgreementFactory {
    /**
     * @dev Emitted when a new RentalAgreement is deployed.
     */
    event RentalAgreementCreated(
        address indexed agreementAddress,
        uint256 indexed propertyId,
        address indexed tenant,
        uint256 baseRent,
        uint256 securityDeposit,
        uint256 deadline
    );

    /**
     * @notice Deploys a new RentalAgreement.
     * @dev Reverts if the caller is not the owner of the property NFT, or if the property is already rented.
     */
    function createRentalAgreement(
        address propertyNFT,
        uint256 propertyId,
        address tenant,
        address usdcToken,
        address rentalNFT,
        uint256 baseRent,
        uint256 securityDeposit,
        uint256 inflationBps,
        uint256 lateFeeBps,
        uint256 gracePeriod,
        uint256 duration,
        uint256 deadline
    ) external returns (address);
}

