import { expect } from "chai";
import hre from "hardhat";
import { Signer, ZeroAddress } from "ethers";

let ethers: any;

describe("RentalNFT Tests", function () {
    let owner: Signer, landlord1: Signer, tenant: Signer, stranger: Signer;
    let ownerAddr: string, landlord1Addr: string, tenantAddr: string, strangerAddr: string;
    let propertyNFT: any, rentalNFT: any, mockUSDC: any, factory: any, agreementAddress: string;

    const propertyId = 1;
    const securityDeposit = 2000n * 1000000n;

    beforeEach(async function () {
        const connection = await hre.network.getOrCreate("hardhat");
        ethers = connection.ethers;
        
        [owner, landlord1, tenant, stranger] = await ethers.getSigners();
        ownerAddr = await owner.getAddress();
        landlord1Addr = await landlord1.getAddress();
        tenantAddr = await tenant.getAddress();
        strangerAddr = await stranger.getAddress();

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
        await propertyNFT.grantRole(MINTER_ROLE, landlord1Addr);

        await propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://prop", 100000n, 200000n);
        await mockUSDC.mint(tenantAddr, ethers.parseUnits("50000", 6));

        // Create an agreement
        const latestBlock = await ethers.provider.getBlock("latest");
        const deadline = latestBlock.timestamp + 7 * 24 * 60 * 60;
        
        agreementAddress = await factory.connect(landlord1).createRentalAgreement.staticCall(
            await propertyNFT.getAddress(), propertyId, tenantAddr, await mockUSDC.getAddress(),
            await rentalNFT.getAddress(), ethers.parseUnits("1000", 6), securityDeposit, 
            500, 1000, 5*24*60*60, 360*24*60*60, deadline
        );

        await factory.connect(landlord1).createRentalAgreement(
            await propertyNFT.getAddress(), propertyId, tenantAddr, await mockUSDC.getAddress(),
            await rentalNFT.getAddress(), ethers.parseUnits("1000", 6), securityDeposit, 
            500, 1000, 5*24*60*60, 360*24*60*60, deadline
        );
    });

    describe("RentalNFT Access Control & Invariants", function () {
        let agreement: any;

        beforeEach(async function () {
            agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);
            await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
            await propertyNFT.connect(landlord1).approve(agreementAddress, propertyId);
            await agreement.connect(landlord1).approveAgreement();
            await agreement.connect(tenant).approveAgreement();
        });

        it("should restrict setUser to owner or approved operator in PropertyNFT", async function () {
            await propertyNFT.connect(landlord1).approve(ownerAddr, propertyId);
            await rentalNFT.connect(owner).setUser(propertyId, ZeroAddress, 0);
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);

            await expect(
                rentalNFT.connect(stranger).setUser(propertyId, strangerAddr, 1000)
            ).to.be.revertedWithCustomError(rentalNFT, "UnauthorizedCaller");

            await rentalNFT.connect(landlord1).setUser(propertyId, tenantAddr, 2000000000);
            expect(await rentalNFT.userOf(propertyId)).to.equal(tenantAddr);
        });

        it("should forbid transfer of RentalNFT tokens", async function () {
            await expect(
                rentalNFT.connect(landlord1).transferFrom(landlord1Addr, strangerAddr, propertyId)
            ).to.be.revertedWithCustomError(rentalNFT, "TransferForbidden");
        });

        it("should restrict retrieve to the currently assigned user of the RentalNFT", async function () {
            await expect(
                rentalNFT.connect(stranger).retrieve(propertyId)
            ).to.be.revertedWithCustomError(rentalNFT, "UnauthorizedCaller");

            await propertyNFT.connect(landlord1).approve(ownerAddr, propertyId);
            await rentalNFT.connect(owner).setUser(propertyId, ZeroAddress, 0); 
            await rentalNFT.connect(landlord1).setUser(propertyId, strangerAddr, 2000000000);
            expect(await rentalNFT.userOf(propertyId)).to.equal(strangerAddr);

            await rentalNFT.connect(stranger).retrieve(propertyId);
            expect(await rentalNFT.userOf(propertyId)).to.equal(ZeroAddress);
        });
    });

    describe("RentalNFT Direct Interaction", function () {
        let testPropId: number;

        beforeEach(async function () {
            testPropId = 99;
            await propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://test-rental", 0n, 0n);
            const tx = await propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://test-rental-direct", 0n, 0n);
            const receipt = await tx.wait();
            const event = receipt.logs.find((log: any) => log.fragment && log.fragment.name === 'PropertyMinted');
            testPropId = Number(event.args[0]);
        });

        it("should allow the owner with permissions to set the UserInfo", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const expires = latestBlock.timestamp + 3600;
            await expect(rentalNFT.connect(landlord1).setUser(testPropId, tenantAddr, expires))
                .to.emit(rentalNFT, "UpdateUser").withArgs(testPropId, tenantAddr, expires);
            
            expect(await rentalNFT.userOf(testPropId)).to.equal(tenantAddr);
            expect(await rentalNFT.userExpires(testPropId)).to.equal(expires);
        });

        it("should allow an approved operator to set the UserInfo", async function () {
            await propertyNFT.connect(landlord1).approve(ownerAddr, testPropId);
            const latestBlock = await ethers.provider.getBlock("latest");
            const expires = latestBlock.timestamp + 3600;
            
            await expect(rentalNFT.connect(owner).setUser(testPropId, tenantAddr, expires))
                .to.emit(rentalNFT, "UpdateUser").withArgs(testPropId, tenantAddr, expires);
        });

        it("should revert setUser when the property is already occupied", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const expires = latestBlock.timestamp + 3600;
            await rentalNFT.connect(landlord1).setUser(testPropId, tenantAddr, expires);
            
            await expect(
                rentalNFT.connect(landlord1).setUser(testPropId, strangerAddr, expires + 1000)
            ).to.be.revertedWithCustomError(rentalNFT, "PropertyAlreadyOccupied");
        });

        it("should revert retrieve if the caller is not the tenant", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const expires = latestBlock.timestamp + 3600;
            await rentalNFT.connect(landlord1).setUser(testPropId, tenantAddr, expires);

            await expect(
                rentalNFT.connect(stranger).retrieve(testPropId)
            ).to.be.revertedWithCustomError(rentalNFT, "UnauthorizedCaller");
        });

        it("should successfully retrieve and clear UserInfo if the caller is the tenant", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const expires = latestBlock.timestamp + 3600;
            await rentalNFT.connect(landlord1).setUser(testPropId, tenantAddr, expires);

            await expect(rentalNFT.connect(tenant).retrieve(testPropId))
                .to.emit(rentalNFT, "UpdateUser").withArgs(testPropId, ZeroAddress, 0);

            expect(await rentalNFT.userOf(testPropId)).to.equal(ZeroAddress);
            expect(await rentalNFT.userExpires(testPropId)).to.equal(0);
        });

        it("should return zero address for userOf if the contract has expired, while userExpires still returns the timestamp", async function () {
            const latestBlock = await ethers.provider.getBlock("latest");
            const expires = latestBlock.timestamp + 3600;
            await rentalNFT.connect(landlord1).setUser(testPropId, tenantAddr, expires);
            
            await ethers.provider.send("evm_increaseTime", [4000]);
            await ethers.provider.send("evm_mine", []);

            expect(await rentalNFT.userOf(testPropId)).to.equal(ZeroAddress);
            expect(await rentalNFT.userExpires(testPropId)).to.equal(expires);
        });

        it("should revert transferFrom and safeTransferFrom", async function () {
            await expect(
                rentalNFT.connect(landlord1).transferFrom(landlord1Addr, strangerAddr, testPropId)
            ).to.be.revertedWithCustomError(rentalNFT, "TransferForbidden");

            await expect(
                rentalNFT.connect(landlord1)["safeTransferFrom(address,address,uint256)"](landlord1Addr, strangerAddr, testPropId)
            ).to.be.revertedWithCustomError(rentalNFT, "TransferForbidden");
        });
    });
});
