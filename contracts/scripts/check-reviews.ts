import hre from "hardhat";
async function main() {
  const connection = await hre.network.connect("localhost");
  const ethers = connection.ethers;
  const rs = await ethers.getContractAt("ReviewSystem", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
  const count = await rs.getReviewCount(1);
  console.log("Review count for property 1:", count.toString());
  for (let i = 0; i < Number(count); i++) {
    const r = await rs.getReview(1, i);
    console.log(`Review #${i}:`, JSON.stringify({ author: r.author, rating: Number(r.rating), comment: r.comment, timestamp: Number(r.timestamp) }));
  }
  const factory = await ethers.getContractAt("RentalAgreementFactory", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
  const activeRental = await factory.activeRentals(1);
  console.log("Active rental:", activeRental);
  if (activeRental !== "0x0000000000000000000000000000000000000000") {
    console.log("Has reviewed:", await rs.hasReviewed(activeRental));
  }
}
main().catch(console.error);
