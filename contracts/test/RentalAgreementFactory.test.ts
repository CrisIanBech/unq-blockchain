import { expect } from "chai";
import hre from "hardhat";
import { Signer, ZeroAddress } from "ethers";

let ethers: any;

describe("RentalAgreementFactory", function () {
    let owner: Signer, landlord1: Signer, tenant: Signer, stranger: Signer;
    let landlord1Addr: string, tenantAddr: string, strangerAddr: string;
    let propertyNFT: any, rentalNFT: any, mockUSDC: any, factory: any;

    const propertyId = 1;
    let baseRent: bigint, securityDeposit: bigint;
    const inflationBps = 500;
    const lateFeeBps = 1000;
    const gracePeriod = 5 * 24 * 60 * 60;
    const duration = 360 * 24 * 60 * 60;
    const paymentPeriod = 30 * 24 * 60 * 60;
    const inflationAdjustmentInterval = 12;
    let deadline: number;

    beforeEach(async function () {
        const connection = await hre.network.getOrCreate("hardhat");
        ethers = connection.ethers;
        
        [owner, landlord1, tenant, stranger] = await ethers.getSigners();
        landlord1Addr = await landlord1.getAddress();
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
        await propertyNFT.grantRole(MINTER_ROLE, landlord1Addr);

        await propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://prop", 100000n, 200000n);
        await mockUSDC.mint(tenantAddr, ethers.parseUnits("50000", 6));

        const latestBlock = await ethers.provider.getBlock("latest");
        deadline = latestBlock.timestamp + 7 * 24 * 60 * 60;
    });

    async function deployAgreement(landlord: Signer, propId: number = propertyId, tAddr: string = tenantAddr): Promise<string> {
        const agreementAddress = await factory.connect(landlord).createRentalAgreement.staticCall(
            await propertyNFT.getAddress(),
            propId,
            tAddr,
            await mockUSDC.getAddress(),
            await rentalNFT.getAddress(),
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

        await factory.connect(landlord).createRentalAgreement(
            await propertyNFT.getAddress(),
            propId,
            tAddr,
            await mockUSDC.getAddress(),
            await rentalNFT.getAddress(),
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

        return agreementAddress;
    }

    it("Se crea correctamente el factory", async function () {
        expect(await factory.getAddress()).to.not.equal(ZeroAddress);
    });

    it("El que crea el contrato no es el dueño del nft de la propiedad -> falla", async function () {
        await expect(
            factory.connect(stranger).createRentalAgreement(
                await propertyNFT.getAddress(),
                propertyId,
                tenantAddr,
                await mockUSDC.getAddress(),
                await rentalNFT.getAddress(),
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                paymentPeriod,
                inflationAdjustmentInterval,
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
        expect(await rentalNFT.userOf(propertyId)).to.equal(agreementAddress);
        
        // Now attempt to create a second agreement for the same property, while it is still occupied -> should revert
        await expect(
            factory.connect(landlord1).createRentalAgreement(
                await propertyNFT.getAddress(),
                propertyId,
                tenantAddr,
                await mockUSDC.getAddress(),
                await rentalNFT.getAddress(),
                baseRent,
                securityDeposit,
                inflationBps,
                lateFeeBps,
                gracePeriod,
                paymentPeriod,
                inflationAdjustmentInterval,
                duration,
                deadline
            )
        ).to.be.revertedWithCustomError(factory, "PropertyAlreadyRented");
    });
});
