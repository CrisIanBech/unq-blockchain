// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRentalAgreementFactory
 * @notice Interface for the Factory contract managing deployment and registry of RentalAgreements.
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
     * @notice Returns the global PropertyNFT contract address.
     */
    function propertyNFT() external view returns (address);

    /**
     * @notice Returns the global USDC token address.
     */
    function usdcToken() external view returns (address);

    /**
     * @notice Returns the global RentalNFT contract address.
     */
    function rentalNFT() external view returns (address);

    /**
     * @notice Maps a property ID to its current Active RentalAgreement.
     */
    function activeRentals(uint256 propertyId) external view returns (address);

    /**
     * @notice Maps a property ID to its active RentalAgreement contract (alias of activeRentals).
     */
    function agreementOf(uint256 propertyId) external view returns (address);

    /**
     * @notice Returns the history of all agreements created for a specific property.
     */
    function agreementHistory(uint256 propertyId) external view returns (address[] memory);

    /**
     * @notice Returns the latest agreement created for a property (active or inactive).
     */
    function latestAgreement(uint256 propertyId) external view returns (address);

    /**
     * @notice Deploys a new RentalAgreement.
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
     */
    function unregisterActiveRental(uint256 propertyId) external;
    
    /**
     * @notice Sets a deployed agreement as the active rental for a property.
     */
    function registerActiveRental(uint256 propertyId, address agreement) external;
}
