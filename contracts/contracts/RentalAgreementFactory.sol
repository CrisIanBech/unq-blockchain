// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IRentalAgreementFactory.sol";
import "./interfaces/IRentalNFT.sol";
import "./RentalAgreement.sol";

/**
 * @title RentalAgreementFactory
 * @notice Stateless singleton Factory contract deployed on-chain to deploy RentalAgreements.
 */
contract RentalAgreementFactory is IRentalAgreementFactory {
    error PropertyAlreadyRented();
    error NotPropertyOwner();

    /**
     * @notice Deploys a new RentalAgreement.
     * @dev Only the current owner of PropertyNFT for `propertyId` can call this.
     *      Also verifies that there is no active rental currently occupied.
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
    ) external override returns (address) {
        // Only PropertyNFT owner can list/create the rental agreement
        if (IERC721(propertyNFT).ownerOf(propertyId) != msg.sender) revert NotPropertyOwner();
        
        // Cannot create if there is already an active rental (i.e. the RentalNFT has a non-expired user)
        if (IRentalNFT(rentalNFT).userOf(propertyId) != address(0)) revert PropertyAlreadyRented();

        // Defaults: paymentPeriod is 30 days, adjustment period is every 12 periods
        uint256 paymentPeriod = 30 days;
        uint256 inflationAdjustmentInterval = 12;

        RentalAgreement agreement = new RentalAgreement(
            propertyNFT,
            propertyId,
            tenant,
            usdcToken,
            rentalNFT,
            baseRent,
            securityDeposit,
            inflationBps,
            lateFeeBps,
            gracePeriod,
            paymentPeriod,
            inflationAdjustmentInterval,
            duration,
            deadline
        );

        address agreementAddress = address(agreement);

        emit RentalAgreementCreated(
            agreementAddress,
            propertyId,
            tenant,
            baseRent,
            securityDeposit,
            deadline
        );

        return agreementAddress;
    }
}

