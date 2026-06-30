import { expect } from "chai";
import hre from "hardhat";
import { Signer, ZeroAddress } from "ethers";

let ethers: any;

describe("RentalAgreement Extensive Tests", function () {
    let owner: Signer, landlord: Signer, landlord2: Signer, tenant: Signer, stranger: Signer;
    let landlordAddr: string, landlord2Addr: string, tenantAddr: string, strangerAddr: string;

    let propertyNFT: any, rentalNFT: any, mockUSDC: any, factory: any;

    let baseRent: bigint, securityDeposit: bigint;
    const inflationBps = 500; // 5%
    const lateFeeBps = 1000; // 10%
    const gracePeriod = 5 * 24 * 60 * 60; // 5 days
    const duration = 360 * 24 * 60 * 60; // 360 days
    const paymentPeriod = 30 * 24 * 60 * 60;
    const inflationAdjustmentInterval = 12;
    let deadline: number;
    let propertyId = 1;

    async function deploySystem() {
        const connection = await hre.network.getOrCreate("hardhat");
        ethers = connection.ethers;

        [owner, landlord, landlord2, tenant, stranger] = await ethers.getSigners();
        landlordAddr = await landlord.getAddress();
        landlord2Addr = await landlord2.getAddress();
        tenantAddr = await tenant.getAddress();
        strangerAddr = await stranger.getAddress();

        baseRent = ethers.parseUnits("1000", 6);
        securityDeposit = ethers.parseUnits("2000", 6);

        const RentalNFT = await ethers.getContractFactory("RentalNFT");
        rentalNFT = await RentalNFT.deploy();

        const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
        propertyNFT = await PropertyNFT.deploy(await rentalNFT.getAddress());

        await rentalNFT.setPropertyNFT(await propertyNFT.getAddress());

        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();

        const Factory = await ethers.getContractFactory("RentalAgreementFactory");
        factory = await Factory.deploy();

        const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
        await propertyNFT.grantRole(MINTER_ROLE, landlordAddr);

        await propertyNFT.connect(landlord).mint(landlordAddr, "ipfs://prop", 0n, 0n);
        
        await mockUSDC.mint(tenantAddr, ethers.parseUnits("50000", 6));
    }

    async function deployAgreement(propId: number = propertyId): Promise<any> {
        const latestBlock = await ethers.provider.getBlock("latest");
        deadline = latestBlock.timestamp + 7 * 24 * 60 * 60;

        const agreementAddress = await factory.connect(landlord).createRentalAgreement.staticCall(
            await propertyNFT.getAddress(),
            propId,
            tenantAddr,
            await mockUSDC.getAddress(),
            await rentalNFT.getAddress(),
            baseRent,
            securityDeposit,
            inflationBps,
            lateFeeBps,
            gracePeriod,
            duration,
            deadline
        );

        await factory.connect(landlord).createRentalAgreement(
            await propertyNFT.getAddress(), propId, tenantAddr, await mockUSDC.getAddress(),
            await rentalNFT.getAddress(), baseRent, securityDeposit, inflationBps, lateFeeBps, gracePeriod, duration, deadline
        );

        return ethers.getContractAt("RentalAgreement", agreementAddress);
    }

    beforeEach(async function () {
        await deploySystem();
    });

    describe("Phase 1: PendingSignatures Lifecycle", function () {
        let agreement: any;
        beforeEach(async function () {
            agreement = await deployAgreement();
            await mockUSDC.connect(tenant).approve(await agreement.getAddress(), ethers.MaxUint256);
            await propertyNFT.connect(landlord).approve(await agreement.getAddress(), propertyId);
        });

        it("Tenant approves first, locking deposit. Landlord approves second, activating.", async function () {
            await agreement.connect(tenant).approveAgreement();
            expect(await agreement.depositStatus()).to.equal(1); // Locked
            expect(await agreement.status()).to.equal(1); // PendingSignatures

            await agreement.connect(landlord).approveAgreement();
            expect(await agreement.status()).to.equal(2); // Active
        });

        it("Landlord approves first (no deposit locked). Tenant approves second, locking deposit and activating simultaneously.", async function () {
            await agreement.connect(landlord).approveAgreement();
            expect(await agreement.depositStatus()).to.equal(0); // None
            expect(await agreement.status()).to.equal(1); // PendingSignatures

            await agreement.connect(tenant).approveAgreement();
            expect(await agreement.depositStatus()).to.equal(1); // Locked
            expect(await agreement.status()).to.equal(2); // Active
        });

        it("Time passes deadline -> checkExpiration triggers Expired, and approveAgreement reverts.", async function () {
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            await expect(agreement.connect(landlord).checkExpiration())
                .to.emit(agreement, "AgreementExpired");
            expect(await agreement.status()).to.equal(6); // Expired

            await expect(agreement.connect(landlord).approveAgreement()).to.be.revertedWithCustomError(agreement, "InvalidState");
        });

        it("Landlord cancels during PendingSignatures -> state becomes Cancelled.", async function () {
            await agreement.connect(landlord).cancelAgreement();
            expect(await agreement.status()).to.equal(4); // Cancelled
        });

        it("Tenant cancels after approving (deposit locked) -> state becomes Cancelled AND deposit is refunded.", async function () {
            await agreement.connect(tenant).approveAgreement();
            expect(await agreement.depositStatus()).to.equal(1); // Locked

            const balanceBefore = await mockUSDC.balanceOf(tenantAddr);
            await agreement.connect(tenant).cancelAgreement();
            
            expect(await agreement.status()).to.equal(4); // Cancelled
            expect(await agreement.depositStatus()).to.equal(2); // Released
            
            const balanceAfter = await mockUSDC.balanceOf(tenantAddr);
            expect(balanceAfter - balanceBefore).to.equal(securityDeposit);
        });
    });

    describe("Phase 2: Active Lifecycle (Payments & Inflation)", function () {
        let agreement: any;
        beforeEach(async function () {
            agreement = await deployAgreement();
            await mockUSDC.connect(tenant).approve(await agreement.getAddress(), ethers.MaxUint256);
            await propertyNFT.connect(landlord).approve(await agreement.getAddress(), propertyId);
            await agreement.connect(landlord).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("Tenant pays rent exactly on time.", async function () {
            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "RentPaid").withArgs(0, baseRent, 0);
        });

        it("Tenant pays rent late but avoids default, incurs late fee.", async function () {
            await ethers.provider.send("evm_increaseTime", [gracePeriod + 100]);
            await ethers.provider.send("evm_mine", []);

            const expectedLateFee = (baseRent * BigInt(lateFeeBps)) / 10000n;
            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "LateFeeApplied").withArgs(0, expectedLateFee)
                .to.emit(agreement, "RentPaid").withArgs(0, baseRent, expectedLateFee);
        });

        it("Rent inflation applies exactly on the interval boundary.", async function () {
            // Pay 12 months
            for (let i = 0; i < 12; i++) {
                await agreement.connect(tenant).payRent();
            }

            const expectedRent = (baseRent * 10500n) / 10000n;
            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "RentPaid").withArgs(12, expectedRent, 0);
        });

        it("Landlord can withdraw partial rents while leaving the deposit intact.", async function () {
            await agreement.connect(tenant).payRent(); // 1 month rent

            const balanceBefore = await mockUSDC.balanceOf(landlordAddr);
            await agreement.connect(landlord).withdrawRent();
            const balanceAfter = await mockUSDC.balanceOf(landlordAddr);

            expect(balanceAfter - balanceBefore).to.equal(baseRent);
            expect(await mockUSDC.balanceOf(await agreement.getAddress())).to.equal(securityDeposit);
        });

        it("Reverts if landlord tries to withdraw when only the deposit remains in escrow.", async function () {
            await expect(agreement.connect(landlord).withdrawRent()).to.be.revertedWithCustomError(agreement, "NoRentToWithdraw");
        });
    });

    describe("Phase 3: Termination & Terminal States", function () {
        let agreement: any;
        beforeEach(async function () {
            agreement = await deployAgreement();
            await mockUSDC.connect(tenant).approve(await agreement.getAddress(), ethers.MaxUint256);
            await propertyNFT.connect(landlord).approve(await agreement.getAddress(), propertyId);
            await agreement.connect(landlord).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("completeAgreement fails if called before duration ends.", async function () {
            await expect(agreement.connect(landlord).completeAgreement()).to.be.revertedWithCustomError(agreement, "LeaseTermNotEnded");
        });

        it("completeAgreement succeeds after duration ends and clears RentalNFT occupancy.", async function () {
            await ethers.provider.send("evm_increaseTime", [duration + 10]);
            await ethers.provider.send("evm_mine", []);

            await agreement.connect(tenant).completeAgreement();
            expect(await agreement.status()).to.equal(3); // Completed
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);
        });

        it("declareDefault fails if tenant is up to date or still in grace period.", async function () {
            await expect(agreement.connect(landlord).declareDefault()).to.be.revertedWithCustomError(agreement, "RentNotOverdue");

            await ethers.provider.send("evm_increaseTime", [gracePeriod - 100]);
            await ethers.provider.send("evm_mine", []);

            await expect(agreement.connect(landlord).declareDefault()).to.be.revertedWithCustomError(agreement, "RentNotOverdue");
        });

        it("declareDefault succeeds if tenant misses payment beyond grace period.", async function () {
            await ethers.provider.send("evm_increaseTime", [gracePeriod + 100]);
            await ethers.provider.send("evm_mine", []);

            await agreement.connect(landlord).declareDefault();
            expect(await agreement.status()).to.equal(5); // Defaulted
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);
        });

        it("cancelAgreement from only Landlord during Active state does nothing (just marks intent).", async function () {
            await agreement.connect(landlord).cancelAgreement();
            expect(await agreement.status()).to.equal(2); // Still Active
            expect(await rentalNFT.userOf(propertyId)).to.equal(await agreement.getAddress());
        });

        it("cancelAgreement from Tenant after Landlord successfully changes state to Cancelled and clears occupancy.", async function () {
            await agreement.connect(landlord).cancelAgreement();
            await agreement.connect(tenant).cancelAgreement();
            
            expect(await agreement.status()).to.equal(4); // Cancelled
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);
        });
    });

    describe("Phase 4: Deposit State Machine", function () {
        let agreement: any;
        beforeEach(async function () {
            agreement = await deployAgreement();
            await mockUSDC.connect(tenant).approve(await agreement.getAddress(), ethers.MaxUint256);
            await propertyNFT.connect(landlord).approve(await agreement.getAddress(), propertyId);
            await agreement.connect(landlord).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("Release deposit perfectly refunds tenant. Further releases/claims revert.", async function () {
            const balanceBefore = await mockUSDC.balanceOf(tenantAddr);
            await agreement.connect(landlord).releaseDeposit();
            const balanceAfter = await mockUSDC.balanceOf(tenantAddr);

            expect(balanceAfter - balanceBefore).to.equal(securityDeposit);
            expect(await agreement.depositStatus()).to.equal(2); // Released

            await expect(agreement.connect(landlord).releaseDeposit()).to.be.revertedWithCustomError(agreement, "DepositNotLocked");
            await expect(agreement.connect(landlord).claimDeposit(100, "reason")).to.be.revertedWithCustomError(agreement, "DepositNotLocked");
        });

        it("Claim full deposit pays landlord.", async function () {
            const balanceBefore = await mockUSDC.balanceOf(landlordAddr);
            await agreement.connect(landlord).claimDeposit(securityDeposit, "Damage");
            const balanceAfter = await mockUSDC.balanceOf(landlordAddr);

            expect(balanceAfter - balanceBefore).to.equal(securityDeposit);
            expect(await agreement.depositStatus()).to.equal(3); // Claimed
        });

        it("Claim partial deposit pays landlord X and refunds tenant Y.", async function () {
            const claimAmount = ethers.parseUnits("500", 6);
            const remainder = securityDeposit - claimAmount;

            const lBalanceBefore = await mockUSDC.balanceOf(landlordAddr);
            const tBalanceBefore = await mockUSDC.balanceOf(tenantAddr);

            await agreement.connect(landlord).claimDeposit(claimAmount, "Partial damage");

            const lBalanceAfter = await mockUSDC.balanceOf(landlordAddr);
            const tBalanceAfter = await mockUSDC.balanceOf(tenantAddr);

            expect(lBalanceAfter - lBalanceBefore).to.equal(claimAmount);
            expect(tBalanceAfter - tBalanceBefore).to.equal(remainder);
            expect(await agreement.depositStatus()).to.equal(3); // Claimed
        });

        it("Claiming 0 or claiming > securityDeposit reverts.", async function () {
            await expect(agreement.connect(landlord).claimDeposit(0, "Zero")).to.be.revertedWithCustomError(agreement, "InvalidClaimAmount");
            await expect(agreement.connect(landlord).claimDeposit(securityDeposit + 1n, "Too much")).to.be.revertedWithCustomError(agreement, "InvalidClaimAmount");
        });

        it("Non-landlord trying to release or claim reverts.", async function () {
            await expect(agreement.connect(stranger).releaseDeposit()).to.be.revertedWithCustomError(agreement, "UnauthorizedLandlord");
            await expect(agreement.connect(tenant).claimDeposit(100, "Self claim")).to.be.revertedWithCustomError(agreement, "UnauthorizedLandlord");
        });
    });

    describe("Dynamic Landlord Resolution & PropertyNFT Transfer", function () {
        let agreement: any;
        beforeEach(async function () {
            agreement = await deployAgreement();
            await mockUSDC.connect(tenant).approve(await agreement.getAddress(), securityDeposit + baseRent * 10n);
            await propertyNFT.connect(landlord).approve(await agreement.getAddress(), propertyId);
            await agreement.connect(landlord).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should dynamically transfer landlord rights to the new owner of PropertyNFT", async function () {
            expect(await agreement.landlord()).to.equal(landlordAddr);

            // Transfer property NFT from landlord to landlord2
            await propertyNFT.connect(landlord).transferFrom(landlordAddr, landlord2Addr, propertyId);

            expect(await agreement.landlord()).to.equal(landlord2Addr);

            await expect(
                agreement.connect(landlord).withdrawRent()
            ).to.be.revertedWithCustomError(agreement, "UnauthorizedLandlord");

            await agreement.connect(tenant).payRent();

            const initialBalance = await mockUSDC.balanceOf(landlord2Addr);
            await agreement.connect(landlord2).withdrawRent();
            const finalBalance = await mockUSDC.balanceOf(landlord2Addr);
            expect(finalBalance - initialBalance).to.equal(baseRent);
        });
    });
});
