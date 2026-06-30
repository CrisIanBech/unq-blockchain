import { expect } from "chai";
import hre from "hardhat";
import { Signer } from "ethers";

describe("PropertyNFT", function () {
    let owner: Signer, landlord1: Signer, stranger: Signer;
    let landlord1Addr: string, strangerAddr: string;
    let propertyNFT: any, rentalNFT: any;

    beforeEach(async function () {
        const connection = await hre.network.getOrCreate("hardhat");
        const ethers = connection.ethers;
        
        [owner, landlord1, stranger] = await ethers.getSigners();
        landlord1Addr = await landlord1.getAddress();
        strangerAddr = await stranger.getAddress();

        const RentalNFT = await ethers.getContractFactory("RentalNFT");
        rentalNFT = await RentalNFT.deploy();

        const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
        propertyNFT = await PropertyNFT.deploy(await rentalNFT.getAddress());
        await rentalNFT.setPropertyNFT(await propertyNFT.getAddress());

        const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
        await propertyNFT.grantRole(MINTER_ROLE, landlord1Addr);

        const tx = await propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://property-metadata-1", 100000n, 200000n);
        await tx.wait();
    });

    describe("PropertyNFT & RentalNFT Linkage", function () {
        it("should restrict minting to accounts with MINTER_ROLE", async function () {
            await expect(
                propertyNFT.connect(stranger).mint(strangerAddr, "ipfs://test", 100000n, 200000n)
            ).to.be.revertedWithCustomError(propertyNFT, "AccessControlUnauthorizedAccount");
        });

        it("should allow minters to mint property tokens and automatically mint mirror RentalNFT", async function () {
            await expect(propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://test-2", 100000n, 200000n))
                .to.emit(propertyNFT, "PropertyMinted")
                .withArgs(2, landlord1Addr, "ipfs://test-2", 100000n, 200000n)
                .to.emit(rentalNFT, "RentalNFTCreated")
                .withArgs(2, 2);

            expect(await propertyNFT.ownerOf(2)).to.equal(landlord1Addr);
            expect(await rentalNFT.ownerOf(2)).to.equal(landlord1Addr);
        });

        it("should revert if coordinates are out of Mercator bounds", async function () {
            const outOfBoundsLat = 20037510n;
            const validLon = 100000n;
            await expect(
                propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://test-bounds", outOfBoundsLat, validLon)
            ).to.be.revertedWith("Invalid latitude");

            const validLat = 100000n;
            const outOfBoundsLon = -20037510n;
            await expect(
                propertyNFT.connect(landlord1).mint(landlord1Addr, "ipfs://test-bounds", validLat, outOfBoundsLon)
            ).to.be.revertedWith("Invalid longitude");
        });
    });
});
