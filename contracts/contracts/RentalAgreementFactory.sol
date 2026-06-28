// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IRentalAgreementFactory.sol";
import "./RentalAgreement.sol";

/**
 * @title RentalAgreementFactory
 * @notice Factory registry deployed on-chain to deploy and track RentalAgreements.
 */
contract RentalAgreementFactory is IRentalAgreementFactory, AccessControl {
    address public immutable override propertyNFT;
    address public immutable override usdcToken;

    mapping(uint256 => address) public override activeRentals;
    mapping(address => bool) public override isRegistered;
    address[] private _registeredAgreements;

    error UnauthorizedAgreement();
    error PropertyAlreadyRented();
    error NotPropertyOwner();

    constructor(address _propertyNFT, address _usdcToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        propertyNFT = _propertyNFT;
        usdcToken = _usdcToken;
    }

    /**
     * @notice Deploys a new RentalAgreement.
     * @dev Only the current owner of PropertyNFT for `propertyId` can call this.
     */
    function createRentalAgreement(
        uint256 propertyId,
        address tenant,
        uint256 baseRent,
        uint256 securityDeposit,
        uint256 inflationBps,
        uint256 lateFeeBps,
        uint256 gracePeriod,
        uint256 duration,
        uint256 deadline
    ) external override returns (address) {
        // Only PropertyNFT owner can list for rent
        if (IERC721(propertyNFT).ownerOf(propertyId) != msg.sender) revert NotPropertyOwner();
        
        // Cannot create if there is already an active rental
        if (activeRentals[propertyId] != address(0)) revert PropertyAlreadyRented();

        // Defaults: paymentPeriod is 30 days (2592000 seconds), adjustment period is every 12 periods (1 year)
        uint256 paymentPeriod = 30 days;
        uint256 inflationAdjustmentInterval = 12;

        RentalAgreement agreement = new RentalAgreement(
            propertyNFT,
            propertyId,
            tenant,
            usdcToken,
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
        isRegistered[agreementAddress] = true;
        _registeredAgreements.push(agreementAddress);

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

    /**
     * @notice Registers the agreement as active for the property ID.
     * @dev Restricted to registered agreements.
     */
    function registerActiveRental(uint256 propertyId, address agreement) external override {
        if (!isRegistered[msg.sender]) revert UnauthorizedAgreement();
        if (activeRentals[propertyId] != address(0)) revert PropertyAlreadyRented();
        
        activeRentals[propertyId] = agreement;
    }

    /**
     * @notice Unregisters the active rental mapping once the lease terminates.
     * @dev Restricted to registered agreements.
     */
    function unregisterActiveRental(uint256 propertyId) external override {
        if (!isRegistered[msg.sender]) revert UnauthorizedAgreement();
        if (activeRentals[propertyId] != msg.sender) revert UnauthorizedAgreement();

        activeRentals[propertyId] = address(0);
    }

    /**
     * @notice Returns total number of registered agreements.
     */
    function getAgreementsCount() external view override returns (uint256) {
        return _registeredAgreements.length;
    }

    /**
     * @notice Returns the registered agreement address at index.
     */
    function getAgreementAt(uint256 index) external view override returns (address) {
        return _registeredAgreements[index];
    }

    /**
     * @notice Overrides supportsInterface to support AccessControl and IRentalAgreementFactory interface.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId) || interfaceId == type(IRentalAgreementFactory).interfaceId;
    }
}
