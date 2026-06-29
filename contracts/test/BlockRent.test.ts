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

    let RentalNFT: any;
    let rentalNFT: any;

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

    async function deployAgreement(landlord: Signer, propId: number = propertyId, tAddr: string = tenantAddr): Promise<string> {
        const propNFTAddr = await propertyNFT.getAddress();
        const usdcAddr = await mockUSDC.getAddress();
        const rNFTAddr = await rentalNFT.getAddress();
        
        // Static call to get the return value (address)
        const agreementAddress = await factory.connect(landlord).createRentalAgreement.staticCall(
            propNFTAddr,
            propId,
            tAddr,
            usdcAddr,
            rNFTAddr,
            baseRent,
            securityDeposit,
            inflationBps,
            lateFeeBps,
            gracePeriod,
            duration,
            deadline
        );

        // Execute the transaction
        const tx = await factory.connect(landlord).createRentalAgreement(
            propNFTAddr,
            propId,
            tAddr,
            usdcAddr,
            rNFTAddr,
            baseRent,
            securityDeposit,
            inflationBps,
            lateFeeBps,
            gracePeriod,
            duration,
            deadline
        );
        await tx.wait();

        return agreementAddress;
    }

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

        // 1. Deploy RentalNFT
        RentalNFT = await ethers.getContractFactory("RentalNFT");
        rentalNFT = await RentalNFT.deploy();

        // 2. Deploy PropertyNFT
        PropertyNFT = await ethers.getContractFactory("PropertyNFT");
        propertyNFT = await PropertyNFT.deploy(await rentalNFT.getAddress());

        // 2b. Link RentalNFT to PropertyNFT
        await rentalNFT.setPropertyNFT(await propertyNFT.getAddress());

        // 3. Deploy MockUSDC
        MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();

        // 4. Deploy RentalAgreementFactory (Stateless)
        RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
        factory = await RentalAgreementFactory.deploy();

        // 5. Grant MINTER_ROLE on PropertyNFT to landlord1
        const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
        await propertyNFT.grantRole(MINTER_ROLE, landlord1Addr);

        // 6. Landlord1 mints a property NFT (this automatically mints the corresponding RentalNFT with ID 1)
        const tx = await propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://property-metadata-1");
        await tx.wait();
        
        propertyId = 1;

        // Faucet some USDC to tenant and approve
        await mockUSDC.mint(tenantAddr, ethers.parseUnits("50000", 6));

        // Setup deadline
        const latestBlock = await ethers.provider.getBlock("latest");
        deadline = latestBlock!.timestamp + 7 * 24 * 60 * 60; // 7 days from now
    });

    describe("PropertyNFT & RentalNFT Linkage", function () {
        it("should restrict minting to accounts with MINTER_ROLE", async function () {
            await expect(
                propertyNFT.connect(stranger).mint(strangerAddr, "ipfs://test")
            ).to.revert(ethers);
        });

        it("should allow minters to mint property tokens and automatically mint mirror RentalNFT", async function () {
            await expect(propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://test-2"))
                .to.emit(propertyNFT, "PropertyMinted")
                .withArgs(2, landlord1Addr, "ipfs://test-2")
                .to.emit(rentalNFT, "RentalNFTCreated")
                .withArgs(2, 2);

            expect(await propertyNFT.ownerOf(2)).to.equal(landlord1Addr);
            expect(await rentalNFT.ownerOf(2)).to.equal(landlord1Addr);
        });
    });

    describe("RentalAgreementFactory", function () {
        it("Se crea correctamente el factory", async function () {
            expect(await factory.getAddress()).to.not.equal(ZeroAddress);
        });

        it("El que crea el contrato no es el dueño del nft de la propiedad -> falla", async function () {
            const propNFTAddr = await propertyNFT.getAddress();
            const usdcAddr = await mockUSDC.getAddress();
            const rNFTAddr = await rentalNFT.getAddress();
            
            await expect(
                factory.connect(stranger).createRentalAgreement(
                    propNFTAddr,
                    propertyId,
                    tenantAddr,
                    usdcAddr,
                    rNFTAddr,
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

        it("Si quiero crear un contrato de una propiedad ya alquilada, antes de que se venza por completo -> falla", async function () {
            // First, create and activate an agreement
            const agreementAddress = await deployAgreement(landlord1);
            
            // Delegate PropertyNFT approvals to the agreement for activation
            await propertyNFT.connect(landlord1).approve(agreementAddress, propertyId);
            
            // Activate it
            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
            const agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
            
            // Verify it is active/occupied
            expect(await rentalNFT.userOf(propertyId)).to.equal(tenantAddr);
            
            // Now attempt to create a second agreement for the same property, while it is still occupied -> should revert
            const propNFTAddr = await propertyNFT.getAddress();
            const usdcAddr = await mockUSDC.getAddress();
            const rNFTAddr = await rentalNFT.getAddress();
            
            await expect(
                factory.connect(landlord1).createRentalAgreement(
                    propNFTAddr,
                    propertyId,
                    tenantAddr,
                    usdcAddr,
                    rNFTAddr,
                    baseRent,
                    securityDeposit,
                    inflationBps,
                    lateFeeBps,
                    gracePeriod,
                    duration,
                    deadline
                )
            ).to.be.revertedWithCustomError(factory, "PropertyAlreadyRented");
        });
    });

    describe("RentalAgreement Lifecycle & Dual-Party Approval", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            agreementAddress = await deployAgreement(landlord1);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);
        });

        it("should initialize in PendingSignatures state", async function () {
            expect(await agreement.status()).to.equal(1); // PendingSignatures
            expect(await agreement.depositStatus()).to.equal(0); // None
        });

        it("should lock security deposit and transition to Active once both approve and delegation is set", async function () {
            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);

            // Tenant approves first
            await expect(agreement.connect(tenant).approveAgreement())
                .to.emit(agreement, "TenantApproved").withArgs(tenantAddr)
                .to.emit(agreement, "DepositLocked").withArgs(securityDeposit);

            expect(await agreement.tenantApproved()).to.be.true;
            expect(await agreement.landlordApproved()).to.be.false;
            expect(await agreement.status()).to.equal(1); // Still PendingSignatures

            // Landlord delegates operator permissions on PropertyNFT
            await propertyNFT.connect(landlord1).approve(agreementAddress, propertyId);

            // Landlord approves second
            await expect(agreement.connect(landlord1).approveAgreement())
                .to.emit(agreement, "LandlordApproved").withArgs(landlord1Addr)
                .to.emit(agreement, "AgreementActivated");

            expect(await agreement.landlordApproved()).to.be.true;
            expect(await agreement.status()).to.equal(2); // Active

            // Verify RentalNFT occupancy is registered to tenant
            expect(await rentalNFT.userOf(propertyId)).to.equal(tenantAddr);
        });

        it("should revert approval if deadline has passed", async function () {
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);

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
            agreementAddress = await deployAgreement(landlord1);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit + baseRent * 20n);
            await propertyNFT.connect(landlord1).approve(agreementAddress, propertyId);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should allow tenant to pay rent without late fees inside grace period", async function () {
            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "RentPaid")
                .withArgs(0, baseRent, 0); // monthIndex = 0, amount = 1000, lateFee = 0

            expect(await mockUSDC.balanceOf(agreementAddress)).to.equal(securityDeposit + baseRent);
        });

        it("should apply late fees if paid after grace period", async function () {
            await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]); // 6 days
            await ethers.provider.send("evm_mine", []);

            const expectedLateFee = (baseRent * BigInt(lateFeeBps)) / 10000n; // 10% = 100 USDC

            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "LateFeeApplied").withArgs(0, expectedLateFee)
                .to.emit(agreement, "RentPaid").withArgs(0, baseRent, expectedLateFee);

            expect(await mockUSDC.balanceOf(agreementAddress)).to.equal(securityDeposit + baseRent + expectedLateFee);
        });

        it("should apply period-based inflation correctly", async function () {
            for (let i = 0; i < 12; i++) {
                await agreement.connect(tenant).payRent();
            }

            const expectedRent = (baseRent * 10500n) / 10000n; // 1050 USDC

            await expect(agreement.connect(tenant).payRent())
                .to.emit(agreement, "RentPaid")
                .withArgs(12, expectedRent, 0);
        });

        it("should allow landlord to pull rent while keeping deposit locked", async function () {
            await agreement.connect(tenant).payRent();

            const initialBalance = await mockUSDC.balanceOf(landlord1Addr);
            await agreement.connect(landlord1).withdrawRent();

            const finalBalance = await mockUSDC.balanceOf(landlord1Addr);
            expect(finalBalance - initialBalance).to.equal(baseRent);

            expect(await mockUSDC.balanceOf(agreementAddress)).to.equal(securityDeposit);
        });
    });

    describe("Dynamic Landlord Resolution & PropertyNFT Transfer", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            agreementAddress = await deployAgreement(landlord1);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit + baseRent);
            await propertyNFT.connect(landlord1).approve(agreementAddress, propertyId);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should dynamically transfer landlord rights to the new owner of PropertyNFT", async function () {
            expect(await agreement.landlord()).to.equal(landlord1Addr);

            // Transfer property NFT from landlord1 to landlord2
            await propertyNFT.connect(landlord1).transferFrom(landlord1Addr, landlord2Addr, propertyId);

            expect(await agreement.landlord()).to.equal(landlord2Addr);

            await expect(
                agreement.connect(landlord1).withdrawRent()
            ).to.be.revertedWithCustomError(agreement, "UnauthorizedLandlord");

            await agreement.connect(tenant).payRent();

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
            agreementAddress = await deployAgreement(landlord1);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
            await propertyNFT.connect(landlord1).approve(agreementAddress, propertyId);
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
            const claimAmount = ethers.parseUnits("1500", 6);
            const remainder = securityDeposit - claimAmount;

            const tenantInitial = await mockUSDC.balanceOf(tenantAddr);
            const landlordInitial = await mockUSDC.balanceOf(landlord1Addr);

            await expect(agreement.connect(landlord1).claimDeposit(claimAmount, "Unpaid bills"))
                .to.emit(agreement, "DepositClaimed").withArgs(claimAmount, "Unpaid bills");

            expect(await agreement.depositStatus()).to.equal(3); // Claimed

            expect(await mockUSDC.balanceOf(landlord1Addr)).to.equal(landlordInitial + claimAmount);
            expect(await mockUSDC.balanceOf(tenantAddr)).to.equal(tenantInitial + remainder);
        });
    });

    describe("RentalNFT Access Control & Invariants", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            agreementAddress = await deployAgreement(landlord1);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
            await propertyNFT.connect(landlord1).approve(agreementAddress, propertyId);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should restrict setUser to owner or approved operator in PropertyNFT", async function () {
            // First clear occupancy using authorized caller
            await propertyNFT.connect(landlord1).approve(ownerAddr, propertyId);
            await rentalNFT.connect(owner).setUser(propertyId, ZeroAddress, 0);
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);

            // Now stranger tries to setUser on vacant property -> should revert
            await expect(
                rentalNFT.connect(stranger).setUser(propertyId, strangerAddr, 1000)
            ).to.be.revertedWithCustomError(rentalNFT, "UnauthorizedCaller");

            // Re-assign using landlord1 directly
            await rentalNFT.connect(landlord1).setUser(propertyId, tenantAddr, 2000000000);
            expect(await rentalNFT.userOf(propertyId)).to.equal(tenantAddr);
        });

        it("should forbid transfer of RentalNFT tokens", async function () {
            await expect(
                rentalNFT.connect(landlord1).transferFrom(landlord1Addr, strangerAddr, propertyId)
            ).to.be.revertedWithCustomError(rentalNFT, "TransferForbidden");
        });
    });

    describe("Termination & Occupancy Release of RentalNFT", function () {
        let agreement: any;
        let agreementAddress: string;

        beforeEach(async function () {
            agreementAddress = await deployAgreement(landlord1);
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
            await propertyNFT.connect(landlord1).approve(agreementAddress, propertyId);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should clear occupancy and Factory index on agreement completion", async function () {
            await ethers.provider.send("evm_increaseTime", [361 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            await expect(agreement.connect(tenant).completeAgreement())
                .to.emit(agreement, "AgreementCompleted");

            expect(await agreement.status()).to.equal(3); // Completed
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);
        });

        it("should clear occupancy on default", async function () {
            await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            await expect(agreement.connect(landlord1).declareDefault())
                .to.emit(agreement, "AgreementDefaulted");

            expect(await agreement.status()).to.equal(5); // Defaulted
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);
        });

        it("should clear occupancy on cooperative cancellation", async function () {
            await agreement.connect(landlord1).cancelAgreement();
            expect(await agreement.status()).to.equal(2); // Still active

            await expect(agreement.connect(tenant).cancelAgreement())
                .to.emit(agreement, "AgreementCancelled");

            expect(await agreement.status()).to.equal(4); // Cancelled
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);
        });
    });
});
