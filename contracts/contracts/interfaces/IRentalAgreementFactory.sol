// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRentalAgreementFactory
 * @notice Interface for the Factory contract managing deployment and registry of RentalAgreements.
 */
interface IRentalAgreementFactory {
    /**
     * @dev Emitted when a new RentalAgreement is deployed.
     * Exposes all parameters needed for frontend indexing.
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
     * @notice Returns the global PropertyNFT contract address.
     */
    function propertyNFT() external view returns (address);

    /**
     * @notice Returns the global USDC token address.
     */
    function usdcToken() external view returns (address);

    /**
     * @notice Maps a property ID to its current Active RentalAgreement.
     * @dev Resolves to address(0) if there is no active rental.
     * @param propertyId The ID of the property NFT.
     * @return The address of the active RentalAgreement contract.
     */
    function activeRentals(uint256 propertyId) external view returns (address);

    /**
     * @notice Deploys a new RentalAgreement.
     * @dev Verifies that the caller is the current owner of PropertyNFT for `propertyId`.
     * Also checks that there is no currently Active agreement for the property.
     * @param propertyId The ID of the property.
     * @param tenant The tenant's address.
     * @param baseRent The initial monthly rent.
     * @param securityDeposit The security deposit amount.
     * @param inflationBps The basis points of rent adjustment.
     * @param lateFeeBps The late fee basis points.
     * @param gracePeriod The late payment grace period in seconds.
     * @param duration The lease duration in seconds.
     * @param deadline The timestamp by which approvals must be completed.
     * @return The deployed RentalAgreement contract address.
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
    ) external returns (address);

    /**
     * @notice Checks if a given contract address was deployed by this factory.
     */
    function isRegistered(address agreement) external view returns (bool);

    /**
     * @notice Returns the total count of agreements registered.
     */
    function getAgreementsCount() external view returns (uint256);

    /**
     * @notice Returns the registered agreement address at a given index.
     */
    function getAgreementAt(uint256 index) external view returns (address);
    
    /**
     * @notice Clears or updates the active rental registry when an agreement completes/cancels/defaults.
     * @dev Restricted to registered RentalAgreements.
     * @param propertyId The ID of the property.
     */
    function unregisterActiveRental(uint256 propertyId) external;
    
    /**
     * @notice Sets a deployed agreement as the active rental for a property.
     * @dev Restricted to registered RentalAgreements. Called upon activation.
     * @param propertyId The ID of the property.
     * @param agreement The address of the RentalAgreement.
     */
    function registerActiveRental(uint256 propertyId, address agreement) external;
}
