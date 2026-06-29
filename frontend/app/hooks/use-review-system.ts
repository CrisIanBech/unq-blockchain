import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi"
import { CONTRACTS } from "@/lib/contracts"
import ReviewSystemAbi from "@/lib/abi/ReviewSystem.json"
import FactoryAbi from "@/lib/abi/RentalAgreementFactory.json"
import AgreementAbi from "@/lib/abi/RentalAgreement.json"
import { useState, useEffect, useCallback } from "react"
import { createPublicClient, http } from "viem"
import { localhost } from "wagmi/chains"

export interface OnChainReview {
  author: `0x${string}`
  agreement: `0x${string}`
  rating: number
  comment: string
  timestamp: bigint
}

const publicClient = createPublicClient({
  chain: localhost,
  transport: http("http://127.0.0.1:8545"),
})

export function useReviewSystem(propertyId: bigint) {
  const { address } = useAccount()

  const { data: reviewCount, refetch: refetchCount } = useReadContract({
    address: CONTRACTS.reviewSystem,
    abi: ReviewSystemAbi,
    functionName: "getReviewCount",
    args: [propertyId],
  })

  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
    error: writeError,
    reset,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const [reviews, setReviews] = useState<OnChainReview[]>([])

  const fetchReviews = useCallback(async () => {
    try {
      const count = await publicClient.readContract({
        address: CONTRACTS.reviewSystem,
        abi: ReviewSystemAbi,
        functionName: "getReviewCount",
        args: [propertyId],
      }) as bigint

      if (count === 0n) {
        setReviews([])
        return
      }

      const fetched: OnChainReview[] = []
      for (let i = 0; i < Number(count); i++) {
        const result = await publicClient.readContract({
          address: CONTRACTS.reviewSystem,
          abi: ReviewSystemAbi,
          functionName: "getReview",
          args: [propertyId, BigInt(i)],
        }) as unknown as OnChainReview
        fetched.push(result)
      }
      setReviews(fetched)
    } catch {
      setReviews([])
    }
  }, [propertyId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  useEffect(() => {
    if (isConfirmed) {
      refetchCount()
      fetchReviews()
      reset()
    }
  }, [isConfirmed, refetchCount, fetchReviews, reset])

  function postReview(rating: number, comment: string) {
    writeContract({
      address: CONTRACTS.reviewSystem,
      abi: ReviewSystemAbi,
      functionName: "postReview",
      args: [propertyId, rating, comment],
    })
  }

  const [canPostReview, setCanPostReview] = useState(false)

  const checkCanPost = useCallback(async () => {
    if (!address || propertyId === 0n) {
      setCanPostReview(false)
      return
    }
    try {
      const agreementAddr = await publicClient.readContract({
        address: CONTRACTS.factory,
        abi: FactoryAbi,
        functionName: "activeRentals",
        args: [propertyId],
      }) as `0x${string}`

      if (agreementAddr === "0x0000000000000000000000000000000000000000") {
        setCanPostReview(false)
        return
      }

      const tenant = await publicClient.readContract({
        address: agreementAddr,
        abi: AgreementAbi,
        functionName: "tenant",
      }) as `0x${string}`

      if (tenant.toLowerCase() !== address.toLowerCase()) {
        setCanPostReview(false)
        return
      }

      const alreadyReviewed = await publicClient.readContract({
        address: CONTRACTS.reviewSystem,
        abi: ReviewSystemAbi,
        functionName: "hasReviewed",
        args: [agreementAddr],
      }) as boolean

      setCanPostReview(!alreadyReviewed)
    } catch {
      setCanPostReview(false)
    }
  }, [address, propertyId])

  useEffect(() => {
    checkCanPost()
  }, [checkCanPost])

  return {
    reviews,
    reviewCount: Number(reviewCount ?? 0n),
    canPostReview,
    postReview,
    isWriting,
    isConfirming,
    isConfirmed,
    writeError,
    txHash,
  }
}
