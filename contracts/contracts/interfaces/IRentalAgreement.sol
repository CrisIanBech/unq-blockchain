// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IRentalAgreement
 * @notice Interface for individual RentalAgreement contracts managing rental logic and escrow.
 */
interface IRentalAgreement {
    enum DepositStatus { None, Locked, Released, Claimed }
    enum AgreementStatus { Created, PendingSignatures, Active, Completed, Cancelled, Defaulted, Expired }

    // Enums definition needs to be visible in interface imports
    
    function propertyNFT() external view returns (address);
    function rentalNFT() external view returns (address);
    function propertyId() external view returns (uint256);
    function tenant() external view returns (address);
    function usdcToken() external view returns (address);
    
    function baseRent() external view returns (uint256);
    function securityDeposit() external view returns (uint256);
    function inflationBps() external view returns (uint256);
    
    function lateFeeBps() external view returns (uint256);
    function gracePeriod() external view returns (uint256);
    
    function deadline() external view returns (uint256);
    function startTime() external view returns (uint256);
    function duration() external view returns (uint256);
    function paymentPeriod() external view returns (uint256);
    function rentPaidUntil() external view returns (uint256);
    
    function landlordApproved() external view returns (bool);
    function tenantApproved() external view returns (bool);
    
    function depositStatus() external view returns (DepositStatus);
    function status() external view returns (AgreementStatus);

    /**
     * @notice Dynamically resolves the current owner of the PropertyNFT as the landlord.
     */
    function landlord() external view returns (address);

    /**
     * @notice Allows landlord or tenant to approve the rental terms.
     * @dev Once both approve, the contract deploys RentalNFT and becomes Active.
     */
    function approveAgreement() external;

    /**
     * @notice Tenant pays the monthly rent (and late fee if applicable).
     * @dev Escrows the funds inside the agreement contract.
     */
    function payRent() external;

    /**
     * @notice Dynamically resolved landlord withdraws all accumulated rent payments.
     */
    function withdrawRent() external;

    /**
     * @notice Landlord releases the security deposit back to the tenant.
     */
    function releaseDeposit() external;

    /**
     * @notice Landlord claims all or part of the security deposit for damages or unpaid rent.
     * @param amount The amount of USDC to claim.
     * @param reason The reason description for audit trails.
     */
    function claimDeposit(uint256 amount, string calldata reason) external;

    /**
     * @notice Cooperative cancellation of the agreement by both landlord and tenant.
     */
    function cancelAgreement() external;

    /**
     * @notice Marks the agreement as Completed once duration has naturally elapsed.
     */
    function completeAgreement() external;

    /**
     * @notice Declares the agreement defaulted (e.g. if rent is not paid for too long).
     */
    function declareDefault() external;
}
