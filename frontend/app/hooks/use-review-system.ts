import { useState, useEffect, useCallback } from "react"
import { ReviewsService } from "@/lib/services/reviews-service"
import { WalletService } from "@/lib/services/wallet-service"
import { ReviewDTO } from "@models/contract-dtos"

export type { ReviewDTO }

export function useReviewSystem(propertyId: number) {
  const [reviews, setReviews] = useState<ReviewDTO[]>([])
  const [reviewCount, setReviewCount] = useState(0)
  const [canPostReview, setCanPostReview] = useState(false)
  const [isWriting, setIsWriting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [writeError, setWriteError] = useState<Error | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const fetchReviews = useCallback(async () => {
    if (propertyId <= 0) { setReviews([]); setReviewCount(0); return }
    try {
      const all = await ReviewsService.getAllReviews(propertyId)
      setReviews(all)
      setReviewCount(all.length)
    } catch {
      setReviews([])
      setReviewCount(0)
    }
  }, [propertyId])

  const checkCanPost = useCallback(async () => {
    if (propertyId <= 0) { setCanPostReview(false); return }
    try {
      const account = await WalletService.getCurrentAccount()
      if (!account) { setCanPostReview(false); return }
      const can = await ReviewsService.canPostReview(propertyId, account)
      setCanPostReview(can)
    } catch {
      setCanPostReview(false)
    }
  }, [propertyId])

  useEffect(() => { fetchReviews() }, [fetchReviews])
  useEffect(() => { checkCanPost() }, [checkCanPost])
  useEffect(() => {
    setIsWriting(false)
    setIsConfirming(false)
    setIsConfirmed(false)
    setWriteError(null)
    setTxHash(null)
  }, [propertyId])

  async function postReview(rating: number, comment: string) {
    setIsWriting(true)
    setIsConfirming(false)
    setIsConfirmed(false)
    setWriteError(null)
    setTxHash(null)
    try {
      const hash = await ReviewsService.postReview(propertyId, rating, comment)
      setTxHash(hash)
      setIsWriting(false)
      setIsConfirming(true)
      setIsConfirmed(true)
      fetchReviews()
      checkCanPost()
    } catch (error: any) {
      setIsWriting(false)
      setWriteError(error)
    }
  }

  return {
    reviews,
    reviewCount,
    canPostReview,
    postReview,
    isWriting,
    isConfirming,
    isConfirmed,
    writeError,
    txHash,
  }
}
