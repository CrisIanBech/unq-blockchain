import { expect } from "chai";
import hre from "hardhat";
import { Signer, ZeroAddress } from "ethers";

let ethers: any;

describe("Review Tests", function () {
    let owner: Signer;
    let landlord: Signer;
    let tenant: Signer;
    let stranger: Signer;

    let ownerAddr: string;
    let landlordAddr: string;
    let tenantAddr: string;
    let strangerAddr: string;

    let propertyNFT: any;
    let rentalNFT: any;
    let mockUSDC: any;
    let factory: any;
    let reviewSystem: any;

    let baseRent: bigint;
    let securityDeposit: bigint;
    const inflationBps = 500;
    const lateFeeBps = 1000;
    const gracePeriod = 5 * 24 * 60 * 60;
    const paymentPeriod = 30 * 24 * 60 * 60;
    const inflationAdjustmentInterval = 12;
    const duration = 360 * 24 * 60 * 60;
    let deadline: number;
    let propertyId: number;

    beforeEach(async function () {
        const connection = await hre.network.getOrCreate("hardhat");
        ethers = connection.ethers;
        baseRent = ethers.parseUnits("1000", 6);
        securityDeposit = ethers.parseUnits("2000", 6);

        [owner, landlord, tenant, stranger] = await ethers.getSigners();
        ownerAddr = await owner.getAddress();
        landlordAddr = await landlord.getAddress();
        tenantAddr = await tenant.getAddress();
        strangerAddr = await stranger.getAddress();

        const RentalNFT = await ethers.getContractFactory("RentalNFT");
        rentalNFT = await RentalNFT.deploy();
        const rentalNFTAddr = await rentalNFT.getAddress();

        const PropertyNFT = await ethers.getContractFactory("PropertyNFT");
        propertyNFT = await PropertyNFT.deploy(rentalNFTAddr);
        const propertyNFTAddr = await propertyNFT.getAddress();

        await rentalNFT.setPropertyNFT(propertyNFTAddr);

        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();

        const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreementFactory");
        factory = await RentalAgreementFactory.deploy();

        const Review = await ethers.getContractFactory("Review");
        reviewSystem = await Review.deploy(
            await propertyNFT.getAddress(),
            await factory.getAddress()
        );

        const MINTER_ROLE = await propertyNFT.MINTER_ROLE();
        await propertyNFT.grantRole(MINTER_ROLE, landlordAddr);

        const tx = await propertyNFT.connect(landlord).mint(landlordAddr, "ipfs://property-metadata-1", 0n, 0n);
        await tx.wait();
        propertyId = 1;

        await mockUSDC.mint(tenantAddr, ethers.parseUnits("50000", 6));

        const latestBlock = await ethers.provider.getBlock("latest");
        deadline = latestBlock!.timestamp + 7 * 24 * 60 * 60;
    });

    async function createAndActivateAgreement(): Promise<string> {
        const agreementAddress = await factory.connect(landlord).createRentalAgreement.staticCall(
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
        );

        await factory.connect(landlord).createRentalAgreement(
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
        );
        const agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

        await propertyNFT.connect(landlord).approve(agreementAddress, propertyId);
        await mockUSDC.connect(tenant).approve(agreementAddress, securityDeposit);
        await agreement.connect(landlord).approveAgreement();
        await agreement.connect(tenant).approveAgreement();

        return agreementAddress;
    }

    describe("Post Review - Validation", function () {
        it("should revert if rating is 0", async function () {
            await createAndActivateAgreement();
            await expect(
                reviewSystem.connect(tenant).postReview(propertyId, 0, "Bad")
            ).to.be.revertedWithCustomError(reviewSystem, "InvalidRating");
        });

        it("should revert if rating is above 5", async function () {
            await createAndActivateAgreement();
            await expect(
                reviewSystem.connect(tenant).postReview(propertyId, 6, "Great")
            ).to.be.revertedWithCustomError(reviewSystem, "InvalidRating");
        });

        it("should revert if comment exceeds 280 characters", async function () {
            await createAndActivateAgreement();
            const longComment = "a".repeat(281);
            await expect(
                reviewSystem.connect(tenant).postReview(propertyId, 5, longComment)
            ).to.be.revertedWithCustomError(reviewSystem, "CommentTooLong");
        });

        it("should revert if there is no active rental for the property", async function () {
            await expect(
                reviewSystem.connect(tenant).postReview(propertyId, 5, "Nice")
            ).to.be.revertedWithCustomError(reviewSystem, "NoActiveOrCompletedRental");
        });

        it("should revert if caller is not the tenant of the rental", async function () {
            await createAndActivateAgreement();
            await expect(
                reviewSystem.connect(stranger).postReview(propertyId, 5, "Nice")
            ).to.be.revertedWithCustomError(reviewSystem, "NotTenantOfRental");
        });

        it("should revert if the same tenant tries to review the same agreement twice", async function () {
            const agreementAddress = await createAndActivateAgreement();
            await reviewSystem.connect(tenant).postReview(propertyId, 4, "Good place");

            await expect(
                reviewSystem.connect(tenant).postReview(propertyId, 5, "Actually great")
            ).to.be.revertedWithCustomError(reviewSystem, "ReviewAlreadyPosted");
        });
    });

    describe("Post Review - Success", function () {
        it("should post a review and emit ReviewPosted event", async function () {
            const agreementAddress = await createAndActivateAgreement();

            await expect(reviewSystem.connect(tenant).postReview(propertyId, 5, "Excellent!"))
                .to.emit(reviewSystem, "ReviewPosted")
                .withArgs(propertyId, tenantAddr, agreementAddress, 5, "Excellent!");
        });

        it("should store the review correctly", async function () {
            const agreementAddress = await createAndActivateAgreement();
            await reviewSystem.connect(tenant).postReview(propertyId, 3, "Decent");

            expect(await reviewSystem.getReviewCount(propertyId)).to.equal(1);

            const review = await reviewSystem.getReview(propertyId, 0);
            expect(review.author).to.equal(tenantAddr);
            expect(review.agreement).to.equal(agreementAddress);
            expect(review.rating).to.equal(3);
            expect(review.comment).to.equal("Decent");
            expect(review.timestamp).to.be.gt(0);
        });

        it("should mark agreement as reviewed in hasReviewed mapping", async function () {
            const agreementAddress = await createAndActivateAgreement();
            expect(await reviewSystem.hasReviewed(agreementAddress)).to.be.false;

            await reviewSystem.connect(tenant).postReview(propertyId, 4, "Good");

            expect(await reviewSystem.hasReviewed(agreementAddress)).to.be.true;
        });

        it("should allow multiple reviews for the same property from different agreements", async function () {
            const agreementAddress = await createAndActivateAgreement();
            await reviewSystem.connect(tenant).postReview(propertyId, 5, "Great!");

            const agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await agreement.connect(landlord).cancelAgreement();
            await agreement.connect(tenant).cancelAgreement();

            const latestBlock = await ethers.provider.getBlock("latest");
            const newDeadline = latestBlock!.timestamp + 7 * 24 * 60 * 60;

            const agreement2Addr = await factory.connect(landlord).createRentalAgreement.staticCall(
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
                newDeadline
            );

            await factory.connect(landlord).createRentalAgreement(
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
                newDeadline
            );
            const agreement2 = await ethers.getContractAt("RentalAgreement", agreement2Addr);

            await propertyNFT.connect(landlord).approve(agreement2Addr, propertyId);
            await mockUSDC.connect(tenant).approve(agreement2Addr, securityDeposit);
            await agreement2.connect(landlord).approveAgreement();
            await agreement2.connect(tenant).approveAgreement();

            await reviewSystem.connect(tenant).postReview(propertyId, 4, "Second stay");

            expect(await reviewSystem.getReviewCount(propertyId)).to.equal(2);
        });
    });

    describe("Review Retrieval", function () {
        it("should return 0 reviews for a property with no reviews", async function () {
            expect(await reviewSystem.getReviewCount(propertyId)).to.equal(0);
        });

        it("should return correct count after posting reviews", async function () {
            await createAndActivateAgreement();
            await reviewSystem.connect(tenant).postReview(propertyId, 5, "Top!");

            expect(await reviewSystem.getReviewCount(propertyId)).to.equal(1);
            expect(await reviewSystem.getReviewCount(999)).to.equal(0);
        });
    });

    describe("Review after agreement completion", function () {
        it("should allow review when agreement is Active", async function () {
            await createAndActivateAgreement();
            await expect(
                reviewSystem.connect(tenant).postReview(propertyId, 5, "Active review")
            ).to.not.revert(ethers);
        });

        it("should revert review when agreement is Cancelled", async function () {
            const agreementAddress = await createAndActivateAgreement();
            const agreement = await ethers.getContractAt("RentalAgreement", agreementAddress);

            await agreement.connect(landlord).cancelAgreement();
            await agreement.connect(tenant).cancelAgreement();

            expect(await agreement.status()).to.equal(4);

            await expect(
                reviewSystem.connect(tenant).postReview(propertyId, 3, "Cancelled review")
            ).to.be.revertedWithCustomError(reviewSystem, "NoActiveOrCompletedRental");
        });
    });

    describe("Landlord Reviews", function () {
        it("should allow landlord to post a review and check mapping", async function () {
            await expect(reviewSystem.connect(landlord).postReview(propertyId, 5, "Best property ever!"))
                .to.emit(reviewSystem, "ReviewPosted");

            expect(await reviewSystem.getReviewCount(propertyId)).to.equal(1);
            expect(await reviewSystem.hasReviewedLandlordGeneral(propertyId)).to.be.true;

            await expect(
                reviewSystem.connect(landlord).postReview(propertyId, 4, "Another review")
            ).to.be.revertedWithCustomError(reviewSystem, "ReviewAlreadyPosted");
        });

        it("should allow landlord to review a specific active agreement", async function () {
            const agreementAddress = await createAndActivateAgreement();

            await expect(reviewSystem.connect(landlord).postReview(propertyId, 4, "Excellent tenant"))
                .to.emit(reviewSystem, "ReviewPosted");

            expect(await reviewSystem.hasReviewedLandlord(agreementAddress)).to.be.true;

            await expect(
                reviewSystem.connect(landlord).postReview(propertyId, 5, "Duplicate")
            ).to.be.revertedWithCustomError(reviewSystem, "ReviewAlreadyPosted");
        });
    });
});


