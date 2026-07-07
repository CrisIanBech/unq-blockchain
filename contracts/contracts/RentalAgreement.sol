// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IRentalAgreement.sol";
import "./interfaces/IRentalAgreementFactory.sol";
import "./interfaces/IRentalNFT.sol";

/**
 * @title RentalAgreement
 * @notice Manages individual lease agreements, payments, deposits, and temporary occupancy rights.
 */
contract RentalAgreement is IRentalAgreement, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error InvalidBaseRent();
    error InvalidDuration();
    error InvalidPaymentPeriod();
    error InvalidGracePeriod();
    error InvalidInflationInterval();
    error InvalidDeadline();

    address public immutable override propertyNFT;
    address public override rentalNFT;
    uint256 public immutable override propertyId;
    address public immutable override tenant;
    address public immutable override usdcToken;
    address public immutable factory;

    uint256 public immutable override baseRent;
    uint256 public immutable override securityDeposit;
    uint256 public immutable override inflationBps;
    uint256 public immutable override lateFeeBps;
    uint256 public immutable override gracePeriod;
    uint256 public immutable override paymentPeriod;
    uint256 public immutable override duration;
    uint256 public immutable override deadline;

    uint256 public override startTime;
    uint256 public override rentPaidUntil;
    uint256 public immutable inflationAdjustmentInterval; // in number of periods

    bool public override landlordApproved;
    bool public override tenantApproved;

    bool public landlordCancelled;
    bool public tenantCancelled;

    DepositStatus public override depositStatus;
    AgreementStatus public override status;

    // Custom Errors
    error UnauthorizedLandlord();
    error UnauthorizedTenant();
    error UnauthorizedCaller();
    error AgreementDeadlineExceeded();
    error InvalidState();
    error NoRentToWithdraw();
    error DepositAlreadySettled();
    error DepositNotLocked();
    error InvalidClaimAmount();
    error LeaseTermNotEnded();
    error RentNotOverdue();

    // Custom Events (matching specifications)
    event AgreementPending();
    event LandlordApproved(address indexed landlord);
    event TenantApproved(address indexed tenant);
    event AgreementActivated(address indexed agreementAddress, uint256 indexed propertyId);
    event AgreementExpired();
    event RentPaid(uint256 indexed monthIndex, uint256 amount, uint256 lateFeeApplied);
    event DepositLocked(uint256 amount);
    event DepositReleased(uint256 amount);
    event DepositClaimed(uint256 amount, string reason);
    event LateFeeApplied(uint256 indexed monthIndex, uint256 amount);
    event AgreementCompleted();
    event AgreementCancelled();
    event AgreementDefaulted();

    modifier onlyLandlord() {
        if (msg.sender != landlord()) revert UnauthorizedLandlord();
        _;
    }

    modifier onlyTenant() {
        if (msg.sender != tenant) revert UnauthorizedTenant();
        _;
    }

    modifier onlyActive() {
        if (status != AgreementStatus.Active) revert InvalidState();
        _;
    }

    constructor(
        address _propertyNFT,
        uint256 _propertyId,
        address _tenant,
        address _usdcToken,
        address _rentalNFT,
        uint256 _baseRent,
        uint256 _securityDeposit,
        uint256 _inflationBps,
        uint256 _lateFeeBps,
        uint256 _gracePeriod,
        uint256 _paymentPeriod,
        uint256 _inflationAdjustmentInterval,
        uint256 _duration,
        uint256 _deadline
    ) {
        if (_baseRent == 0) revert InvalidBaseRent();
        if (_duration == 0) revert InvalidDuration();
        if (_paymentPeriod == 0 || _paymentPeriod > _duration) revert InvalidPaymentPeriod();
        if (_gracePeriod == 0) revert InvalidGracePeriod();
        if (_inflationAdjustmentInterval == 0) revert InvalidInflationInterval();
        if (_deadline <= block.timestamp) revert InvalidDeadline();
        propertyNFT = _propertyNFT;
        propertyId = _propertyId;
        tenant = _tenant;
        usdcToken = _usdcToken;
        rentalNFT = _rentalNFT;
        factory = msg.sender;

        baseRent = _baseRent;
        securityDeposit = _securityDeposit;
        inflationBps = _inflationBps;
        lateFeeBps = _lateFeeBps;
        gracePeriod = _gracePeriod;
        paymentPeriod = _paymentPeriod;
        inflationAdjustmentInterval = _inflationAdjustmentInterval;
        duration = _duration;
        deadline = _deadline;

        status = AgreementStatus.PendingSignatures;
        depositStatus = DepositStatus.None;

        emit AgreementPending();
    }

    /**
     * @notice Dynamically resolves the current owner of the PropertyNFT as the landlord.
     */
    function landlord() public view override returns (address) {
        return IERC721(propertyNFT).ownerOf(propertyId);
    }

    /**
     * @notice Checks if the approval deadline has passed, transitioning status to Expired if so.
     */
    function checkExpiration() public {
        if (status == AgreementStatus.PendingSignatures && block.timestamp > deadline) {
            status = AgreementStatus.Expired;
            emit AgreementExpired();
        }
    }

    /**
     * @notice Returns all agreement details in a single struct to save RPC calls on the frontend.
     */
    function getAgreementDetails() external view override returns (AgreementDetails memory) {
        return AgreementDetails({
            propertyId: propertyId,
            tenant: tenant,
            landlord: landlord(),
            baseRent: baseRent,
            rentPaidUntil: rentPaidUntil,
            status: status,
            startTime: startTime,
            paymentPeriod: paymentPeriod,
            securityDeposit: securityDeposit,
            inflationBps: inflationBps,
            lateFeeBps: lateFeeBps,
            gracePeriod: gracePeriod,
            duration: duration,
            deadline: deadline,
            landlordApproved: landlordApproved,
            tenantApproved: tenantApproved,
            landlordCancelled: landlordCancelled,
            tenantCancelled: tenantCancelled
        });
    }

    /**
     * @notice Allows landlord or tenant to approve the rental terms.
     * @dev Once both approve, the contract assigns the ERC4907 occupancy user.
     */
    function approveAgreement() external override nonReentrant {
        checkExpiration();
        if (status != AgreementStatus.PendingSignatures) revert InvalidState();

        if (msg.sender == landlord()) {
            landlordApproved = true;
            emit LandlordApproved(msg.sender);
        } else if (msg.sender == tenant) {
            tenantApproved = true;
            emit TenantApproved(msg.sender);
            
            // Tenant locks the deposit during approval
            if (securityDeposit > 0 && depositStatus == DepositStatus.None) {
                depositStatus = DepositStatus.Locked;
                IERC20(usdcToken).safeTransferFrom(tenant, address(this), securityDeposit);
                emit DepositLocked(securityDeposit);
            }
        } else {
            revert UnauthorizedCaller();
        }

        // Trigger activation if both approved
        if (landlordApproved && tenantApproved) {
            status = AgreementStatus.Active;
            startTime = block.timestamp;
            rentPaidUntil = block.timestamp;

            // Assign the agreement contract as user on the permanent RentalNFT (using delegated PropertyNFT approvals)
            IRentalNFT(rentalNFT).setUser(propertyId, address(this), uint64(block.timestamp + duration));

            // Register as active rental in factory registry - removed as factory is now stateless
            emit AgreementActivated(address(this), propertyId);
        }
    }

    /**
     * @notice Calculates the rent and late fees for the current period pending payment.
     */
    function getRentAmountToPay() public view override returns (uint256 currentRent, uint256 lateFee, uint256 totalAmount) {
        uint256 periodsElapsed = (rentPaidUntil - startTime) / paymentPeriod;
        uint256 inflationPeriods = periodsElapsed / inflationAdjustmentInterval;
        uint256 totalInflationBps = inflationPeriods * inflationBps;
        currentRent = (baseRent * (10000 + totalInflationBps)) / 10000;

        lateFee = 0;
        if (block.timestamp > rentPaidUntil + gracePeriod) {
            lateFee = (currentRent * lateFeeBps) / 10000;
        }

        totalAmount = currentRent + lateFee;
    }

    /**
     * @notice Tenant pays the monthly rent (and late fee if applicable).
     */
    function payRent() external override onlyActive nonReentrant {
        if (block.timestamp > startTime + duration) revert LeaseTermNotEnded(); // Lease ended, should terminate

        (uint256 currentRent, uint256 lateFee, uint256 totalAmount) = getRentAmountToPay();
        uint256 periodsElapsed = (rentPaidUntil - startTime) / paymentPeriod;

        if (lateFee > 0) {
            emit LateFeeApplied(periodsElapsed, lateFee);
        }

        // Escrow funds inside agreement contract
        IERC20(usdcToken).safeTransferFrom(tenant, address(this), totalAmount);
        
        rentPaidUntil += paymentPeriod;

        emit RentPaid(periodsElapsed, currentRent, lateFee);
    }

    /**
     * @notice Landlord withdraws all accumulated rent payments.
     */
    function withdrawRent() external override onlyLandlord nonReentrant {
        uint256 balance = IERC20(usdcToken).balanceOf(address(this));
        uint256 lockedAmount = (depositStatus == DepositStatus.Locked) ? securityDeposit : 0;
        
        if (balance <= lockedAmount) revert NoRentToWithdraw();
        uint256 withdrawable = balance - lockedAmount;

        IERC20(usdcToken).safeTransfer(landlord(), withdrawable);
    }

    /**
     * @notice Landlord releases the security deposit back to the tenant.
     */
    function releaseDeposit() external override onlyLandlord nonReentrant {
        if (depositStatus != DepositStatus.Locked) revert DepositNotLocked();
        depositStatus = DepositStatus.Released;

        IERC20(usdcToken).safeTransfer(tenant, securityDeposit);
        emit DepositReleased(securityDeposit);
    }

    /**
     * @notice Landlord claims all or part of the security deposit for damages or unpaid rent.
     */
    function claimDeposit(uint256 amount, string calldata reason) external override onlyLandlord nonReentrant {
        if (depositStatus != DepositStatus.Locked) revert DepositNotLocked();
        if (amount > securityDeposit || amount == 0) revert InvalidClaimAmount();

        depositStatus = DepositStatus.Claimed;

        // Transfer claimed amount to dynamic landlord
        IERC20(usdcToken).safeTransfer(landlord(), amount);

        // Refund any remainder to the tenant
        uint256 remainder = securityDeposit - amount;
        if (remainder > 0) {
            IERC20(usdcToken).safeTransfer(tenant, remainder);
        }

        emit DepositClaimed(amount, reason);
    }

    /**
     * @notice Cooperative cancellation of the agreement.
     */
    function cancelAgreement() external override nonReentrant {
        if (status == AgreementStatus.PendingSignatures || status == AgreementStatus.Expired) {
            if (msg.sender != landlord() && msg.sender != tenant) revert UnauthorizedCaller();
            status = AgreementStatus.Cancelled;

            // Return deposit to tenant if it was already funded
            if (depositStatus == DepositStatus.Locked) {
                depositStatus = DepositStatus.Released;
                IERC20(usdcToken).safeTransfer(tenant, securityDeposit);
                emit DepositReleased(securityDeposit);
            }
            emit AgreementCancelled();
        } else if (status == AgreementStatus.Active) {
            if (msg.sender == landlord()) {
                landlordCancelled = true;
            } else if (msg.sender == tenant) {
                tenantCancelled = true;
            } else {
                revert UnauthorizedCaller();
            }

            if (landlordCancelled && tenantCancelled) {
                status = AgreementStatus.Cancelled;
                
                // Clear user on RentalNFT
                if (rentalNFT != address(0)) {
                    IRentalNFT(rentalNFT).retrieve(propertyId);
                }

                emit AgreementCancelled();
            }
        } else {
            revert InvalidState();
        }
    }

    /**
     * @notice Marks the agreement as Completed once duration has naturally elapsed.
     */
    function completeAgreement() external override onlyActive nonReentrant {
        if (block.timestamp < startTime + duration) revert LeaseTermNotEnded();
        status = AgreementStatus.Completed;

        // Clear user on RentalNFT
        if (rentalNFT != address(0)) {
            IRentalNFT(rentalNFT).retrieve(propertyId);
        }

        emit AgreementCompleted();
    }

    /**
     * @notice Declares the agreement defaulted if rent is overdue by a full period.
     */
    function declareDefault() external override onlyActive nonReentrant {
        // Can declare default if tenant has not paid and grace period has elapsed
        if (block.timestamp <= rentPaidUntil + gracePeriod) revert RentNotOverdue();
        status = AgreementStatus.Defaulted;

        // Clear user on RentalNFT
        if (rentalNFT != address(0)) {
            IRentalNFT(rentalNFT).retrieve(propertyId);
        }

        emit AgreementDefaulted();
    }
}
