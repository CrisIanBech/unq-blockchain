import { expect } from "chai";
import hre from "hardhat";
import { Signer, ZeroAddress } from "ethers";

let ethers: any;

describe("BlockRent System Tests", function () {
    let owner: Signer;
    let landlord1: Signer;
    let landlord2: Signer;
    let tenant: Signer;
    let stranger: Signer;

    let ownerAddr: string;
    let landlord1Addr: string;
    let landlord2Addr: string;
    let tenantAddr: string;
    let strangerAddr: string;

    let PropertyNFT: any;
    let propertyNFT: any;

    let MockUSDC: any;
    let mockUSDC: any;

    let RentalAgreementFactory: any;
    let factory: any;

    let baseRent: bigint;
    let securityDeposit: bigint;
    const inflationBps = 500; // 5% BPS
    const lateFeeBps = 1000; // 10% BPS
    const gracePeriod = 5 * 24 * 60 * 60; // 5 days
    const duration = 360 * 24 * 60 * 60; // 360 days (12 periods of 30 days)
    let deadline: number;
    let propertyId: number;

    beforeEach(async function () {
        const connection = await hre.network.getOrCreate("hardhat");
        ethers = connection.ethers;
        baseRent = ethers.parseUnits("1000", 6);
        securityDeposit = ethers.parseUnits("2000", 6);
        
        [owner, landlord1, landlord2, tenant, stranger] = await ethers.getSigners();
        
        ownerAddr = await owner.getAddress();
        landlord1Addr = await landlord1.getAddress();
        landlord2Addr = await landlord2.getAddress();
        tenantAddr = await tenant.getAddress();
        strangerAddr = await stranger.getAddress();

        // 1. Deploy PropertyNFT
        PropertyNFT = await ethers.getContractFactory("PropertyNFT");
        propertyNFT = await PropertyNFT.deploy();

        // 2. Deploy MockUSDC
        MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();

        // 3. Deploy RentalAgreementFactory
        RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
        factory = await RentalAgreementFactory.deploy(
            await propertyNFT.getAddress(),
            await mockUSDC.getAddress()
        );

        // 4. Grant MINTER_ROLE on PropertyNFT to landlord1 (admin is owner, but landlord1 wants to mint)
        const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
        await propertyNFT.grantRole(MINTER_ROLE, landlord1Addr);

        // 5. Landlord1 mints a property NFT
        const tx = await propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://property-metadata-1");
        const receipt = await tx.wait();
        
        // Find token ID from events
        propertyId = 1;

        // Faucet some USDC to tenant and approve
        await mockUSDC.mint(tenantAddr, ethers.parseUnits("50000", 6));

        // Setup deadline
        const latestBlock = await ethers.provider.getBlock("latest");
        deadline = latestBlock!.timestamp + 7 * 24 * 60 * 60; // 7 days from now
    });

    describe("PropertyNFT", function () {
        it("should restrict minting to accounts with MINTER_ROLE", async function () {
            await expect(
                propertyNFT.connect(stranger).mint(strangerAddr, "ipfs://test")
            ).to.revert(ethers);
        });

        it("should allow minters to mint property tokens", async function () {
            await expect(propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://test-2"))
                .to.emit(propertyNFT, "PropertyMinted")
                .withArgs(2, landlord1Addr, "ipfs://test-2");
            expect(await propertyNFT.ownerOf(2)).to.equal(landlord1Addr);
        });
    });

    describe("RentalAgreementFactory", function () {
        it("should allow the PropertyNFT owner to create a rental agreement", async function () {
            const tx = await factory.connect(landlord1).createRentalAgreement(
                propertyId,
                tenantAddr,
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                duration,
                deadline
            );
            await expect(tx).to.emit(factory, "RentalAgreementCreated");

            const count = await factory.getAgreementsCount();
            expect(count).to.equal(1);
            
            const agreementAddress = await factory.getAgreementAt(0);
            expect(await factory.isRegistered(agreementAddress)).to.be.true;
        });

        it("should revert if a non-owner tries to create a rental agreement", async function () {
            await expect(
                factory.connect(stranger).createRentalAgreement(
                    propertyId,
                    tenantAddr,
                    baseRent,
                    securityDeposit,
                    inflationBps,
                    lateFeeBps,
                    gracePeriod,
                    duration,
                    deadline
                )
            ).to.be.revertedWithCustomError(factory, "NotPropertyOwner");
        });

        it("should prevent duplicate active rentals on creation", async function () {
            // Deploy first agreement
            const tx = await factory.connect(landlord1).createRentalAgreement(
                propertyId,
                tenantAddr,
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                duration,
                deadline
            );
            const receipt = await tx.wait();
            
            // Try to deploy a second agreement before the first is active
            // This is allowed since the first is NOT yet active!
            await expect(
                factory.connect(landlord1).createRentalAgreement(
                    propertyId,
                    tenantAddr,
                    baseRent,
                    securityDeposit,
                    inflationBps,
                    lateFeeBps,
                    gracePeriod,
                    duration,
                    deadline
                )
            ).to.not.revert(ethers);

            const agreement1Addr = await factory.getAgreementAt(0);
            const agreement2Addr = await factory.getAgreementAt(1);

            const agreement1 = await ethers.getContractAt("RentalAgreement", agreement1Addr);
            const agreement2 = await ethers.getContractAt("RentalAgreement", agreement2Addr);

            // Activate agreement1
            await mockUSDC.connect(tenant).approve(agreement1Addr, securityDeposit);
            await agreement1.connect(landlord1).approveAgreement();
            await agreement1.connect(tenant).approveAgreement();

            expect(await agreement1.status()).to.equal(2); // Active
            expect(await factory.activeRentals(propertyId)).to.equal(agreement1Addr);

            // Attempting to activate agreement2 should revert since agreement1 is already active
            await mockUSDC.connect(tenant).approve(agreement2Addr, securityDeposit);
            await agreement2.connect(landlord1).approveAgreement();
            await expect(
                agreement2.connect(tenant).approveAgreement()
            ).to.be.revertedWithCustomError(factory, "PropertyAlreadyRented");
        });
    });

    describe("RentalAgreement Lifecycle & Dual-Party Approval", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            const tx = await factory.connect(landlord1).createRentalAgreement(
                propertyId,
                tenantAddr,
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                duration,
                deadline
            );
            await tx.wait();
            agreementAddress = await factory.getAgreementAt(0);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);
        });

        it("should initialize in PendingSignatures state", async function () {
            expect(await agreement.status()).to.equal(1); // PendingSignatures
            expect(await agreement.depositStatus()).to.equal(0); // None
        });

        it("should lock security deposit and transition to Active once both approve", async function () {
            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);

            // Tenant approves first
            await expect(agreement.connect(tenant).approveAgreement())
                .to.emit(agreement, "TenantApproved").withArgs(tenantAddr)
                .to.emit(agreement, "DepositLocked").withArgs(securityDeposit);

            expect(await agreement.tenantApproved()).to.be.true;
            expect(await agreement.landlordApproved()).to.be.false;
            expect(await agreement.status()).to.equal(1); // Still PendingSignatures
            expect(await agreement.depositStatus()).to.equal(1); // Locked

            // Landlord approves second
            await expect(agreement.connect(landlord1).approveAgreement())
                .to.emit(agreement, "LandlordApproved").withArgs(landlord1Addr)
                .to.emit(agreement, "AgreementActivated");

            expect(await agreement.landlordApproved()).to.be.true;
            expect(await agreement.status()).to.equal(2); // Active

            // Verify RentalNFT was deployed
            const rentalNFTAddr = await agreement.rentalNFT();
            expect(rentalNFTAddr).to.not.equal(ZeroAddress);
            
            const rentalNFT = await ethers.getContractAt("RentalNFT", rentalNFTAddr);
            expect(await rentalNFT.ownerOf(1)).to.equal(agreementAddress);
            expect(await rentalNFT.userOf(1)).to.equal(tenantAddr);
        });

        it("should revert approval if deadline has passed", async function () {
            // Increase time past deadline
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);

            // Trigger on-chain state transition to Expired
            await agreement.checkExpiration();

            expect(await agreement.status()).to.equal(6); // Expired

            await expect(
                agreement.connect(landlord1).approveAgreement()
            ).to.be.revertedWithCustomError(agreement, "InvalidState");
        });

        it("should restrict approvals to landlord and tenant", async function () {
            await expect(
                agreement.connect(stranger).approveAgreement()
            ).to.be.revertedWithCustomError(agreement, "UnauthorizedCaller");
        });
    });

    describe("Active Rental Payments & Inflation & Late Fees", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            await factory.connect(landlord1).createRentalAgreement(
                propertyId,
                tenantAddr,
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                duration,
                deadline
            );
            agreementAddress = await factory.getAgreementAt(0);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit + baseRent * 20n);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should allow tenant to pay rent without late fees inside grace period", async function () {
            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "RentPaid")
                .withArgs(0, baseRent, 0); // monthIndex = 0, amount = 1000, lateFee = 0

            // Escrow verification
            expect(await mockUSDC.balanceOf(agreementAddress)).to.equal(securityDeposit + baseRent);
        });

        it("should apply late fees if paid after grace period", async function () {
            // Move time past grace period (due date is startTime, grace period is 5 days)
            await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]); // 6 days
            await ethers.provider.send("evm_mine", []);

            const expectedLateFee = (baseRent * BigInt(lateFeeBps)) / 10000n; // 10% = 100 USDC

            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "LateFeeApplied").withArgs(0, expectedLateFee)
                .to.emit(agreement, "RentPaid").withArgs(0, baseRent, expectedLateFee);

            expect(await mockUSDC.balanceOf(agreementAddress)).to.equal(securityDeposit + baseRent + expectedLateFee);
        });

        it("should apply period-based inflation correctly", async function () {
            // Pay 12 periods first to advance rentPaidUntil
            for (let i = 0; i < 12; i++) {
                await agreement.connect(tenant).payRent();
            }

            // The 13th period starts at index 12 (1 year/12 periods elapsed).
            // Inflation is 500 BPS (5%) which increases rent to 1050 USDC
            const expectedRent = (baseRent * 10500n) / 10000n; // 1050 USDC

            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "RentPaid")
                .withArgs(12, expectedRent, 0);
        });

        it("should allow landlord to pull accumulated rent while keeping deposit locked", async function () {
            await agreement.connect(tenant).payRent(); // 1000 USDC rent paid

            const initialBalance = await mockUSDC.balanceOf(landlord1Addr);
            await agreement.connect(landlord1).withdrawRent();

            const finalBalance = await mockUSDC.balanceOf(landlord1Addr);
            expect(finalBalance - initialBalance).to.equal(baseRent);

            // Deposit remains locked inside contract
            expect(await mockUSDC.balanceOf(agreementAddress)).to.equal(securityDeposit);
        });
    });

    describe("Dynamic Landlord Resolution & PropertyNFT Transfer", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            await factory.connect(landlord1).createRentalAgreement(
                propertyId,
                tenantAddr,
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                duration,
                deadline
            );
            agreementAddress = await factory.getAgreementAt(0);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit + baseRent);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should dynamically transfer landlord rights to the new owner of PropertyNFT", async function () {
            expect(await agreement.landlord()).to.equal(landlord1Addr);

            // Transfer property NFT from landlord1 to landlord2
            await propertyNFT.connect(landlord1).transferFrom(landlord1Addr, landlord2Addr, propertyId);

            // Confirm dynamic resolution
            expect(await agreement.landlord()).to.equal(landlord2Addr);

            // Verify landlord1's admin calls now revert
            await expect(
                agreement.connect(landlord1).withdrawRent()
            ).to.be.revertedWithCustomError(agreement, "UnauthorizedLandlord");

            // Tenant pays rent
            await agreement.connect(tenant).payRent();

            // Verify landlord2 can withdraw rent successfully
            const initialBalance = await mockUSDC.balanceOf(landlord2Addr);
            await agreement.connect(landlord2).withdrawRent();
            const finalBalance = await mockUSDC.balanceOf(landlord2Addr);
            expect(finalBalance - initialBalance).to.equal(baseRent);
        });
    });

    describe("Security Deposit State Machine", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            await factory.connect(landlord1).createRentalAgreement(
                propertyId,
                tenantAddr,
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                duration,
                deadline
            );
            agreementAddress = await factory.getAgreementAt(0);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should transition deposit from Locked to Released and refund tenant", async function () {
            expect(await agreement.depositStatus()).to.equal(1); // Locked

            const initialBalance = await mockUSDC.balanceOf(tenantAddr);
            await expect(agreement.connect(landlord1).releaseDeposit())
                .to.emit(agreement, "DepositReleased").withArgs(securityDeposit);

            expect(await agreement.depositStatus()).to.equal(2); // Released
            expect(await mockUSDC.balanceOf(tenantAddr)).to.equal(initialBalance + securityDeposit);
        });

        it("should transition deposit from Locked to Claimed, pay landlord, and refund remainder to tenant", async function () {
            const claimAmount = ethers.parseUnits("1500", 6); // Claim 1500, refund 500
            const remainder = securityDeposit - claimAmount;

            const tenantInitial = await mockUSDC.balanceOf(tenantAddr);
            const landlordInitial = await mockUSDC.balanceOf(landlord1Addr);

            await expect(agreement.connect(landlord1).claimDeposit(claimAmount, "Unpaid bills"))
                .to.emit(agreement, "DepositClaimed").withArgs(claimAmount, "Unpaid bills");

            expect(await agreement.depositStatus()).to.equal(3); // Claimed

            expect(await mockUSDC.balanceOf(landlord1Addr)).to.equal(landlordInitial + claimAmount);
            expect(await mockUSDC.balanceOf(tenantAddr)).to.equal(tenantInitial + remainder);
        });

        it("should reject invalid deposit transitions", async function () {
            // Try to release again after release
            await agreement.connect(landlord1).releaseDeposit();
            await expect(
                agreement.connect(landlord1).releaseDeposit()
            ).to.be.revertedWithCustomError(agreement, "DepositNotLocked");

            // Try to claim after release
            await expect(
                agreement.connect(landlord1).claimDeposit(baseRent, "Damages")
            ).to.be.revertedWithCustomError(agreement, "DepositNotLocked");
        });
    });

    describe("RentalNFT Controller Access Control", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            await factory.connect(landlord1).createRentalAgreement(
                propertyId,
                tenantAddr,
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                duration,
                deadline
            );
            agreementAddress = await factory.getAgreementAt(0);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should restrict RentalNFT actions to the controller contract", async function () {
            const rentalNFTAddr = await agreement.rentalNFT();
            const rentalNFT = await ethers.getContractAt("RentalNFT", rentalNFTAddr);

            // Stranger tries to mint, burn, or setUser on RentalNFT
            await expect(
                rentalNFT.connect(stranger).mint(strangerAddr, 2)
            ).to.be.revertedWithCustomError(rentalNFT, "UnauthorizedController");

            await expect(
                rentalNFT.connect(stranger).setUser(1, strangerAddr, 1000)
            ).to.be.revertedWithCustomError(rentalNFT, "UnauthorizedController");

            await expect(
                rentalNFT.connect(stranger).burn(1)
            ).to.be.revertedWithCustomError(rentalNFT, "UnauthorizedController");
        });
    });

    describe("Termination & Burning of RentalNFT", function () {
        let agreement: any;
        let agreementAddress: string;
        let rentalNFT: any;

        beforeEach(async function () {
            await factory.connect(landlord1).createRentalAgreement(
                propertyId,
                tenantAddr,
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                duration,
                deadline
            );
            agreementAddress = await factory.getAgreementAt(0);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();

            const rentalNFTAddr = await agreement.rentalNFT();
            rentalNFT = await ethers.getContractAt("RentalNFT", rentalNFTAddr);
        });

        it("should burn RentalNFT and clear registry on agreement completion", async function () {
            // Advance time past duration (360 days)
            await ethers.provider.send("evm_increaseTime", [361 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            await expect(agreement.connect(tenant).completeAgreement())
                .to.emit(agreement, "AgreementCompleted")
                .to.emit(rentalNFT, "RentalNFTBurned").withArgs(1);

            expect(await agreement.status()).to.equal(3); // Completed
            expect(await factory.activeRentals(propertyId)).to.equal(ZeroAddress);
        });

        it("should burn RentalNFT on default", async function () {
            // Rent becomes overdue past grace period
            await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]); // 6 days
            await ethers.provider.send("evm_mine", []);

            await expect(agreement.connect(landlord1).declareDefault())
                .to.emit(agreement, "AgreementDefaulted")
                .to.emit(rentalNFT, "RentalNFTBurned").withArgs(1);

            expect(await agreement.status()).to.equal(5); // Defaulted
            expect(await factory.activeRentals(propertyId)).to.equal(ZeroAddress);
        });

        it("should burn RentalNFT on cooperative cancellation", async function () {
            // Landlord cancels
            await agreement.connect(landlord1).cancelAgreement();
            expect(await agreement.status()).to.equal(2); // Still active

            // Tenant cancels -> triggers cancellation
            await expect(agreement.connect(tenant).cancelAgreement())
                .to.emit(agreement, "AgreementCancelled")
                .to.emit(rentalNFT, "RentalNFTBurned").withArgs(1);

            expect(await agreement.status()).to.equal(4); // Cancelled
            expect(await factory.activeRentals(propertyId)).to.equal(ZeroAddress);
        });
    });
});
