"use client";

import { useState, useEffect, useCallback } from "react";
import CreateRating from "./CreateRating";
import { fetchReviewsByBookId } from "@/features/library/api/reviews.queries";
import type { Review } from "@/payload-types";
import { Star } from "lucide-react";

const BookRatings = ({ bookId }: { bookId: number }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      const result = await fetchReviewsByBookId(bookId, 1);
      setReviews(result.docs);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchReviews();
  }, [bookId, fetchReviews]);

  return (
    <div className="flex flex-col gap-6">
      <CreateRating bookId={bookId} />

      {loading ? (
        <div className="text-center text-muted-foreground py-8">
          جاري التحميل...
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Star className="size-10 mb-3 opacity-40" />
          <p className="text-sm">لا توجد تقييمات بعد</p>
          <p className="text-xs mt-1">كن أول من يقيّم هذا الكتاب</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pe-2">
          {reviews.map((review) => (
            <div key={review.id} className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={
                      star <= (review.rating || 0)
                        ? "text-primary"
                        : "text-gray-300"
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
              <p className="text-sm">{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { BookRatings };
export default BookRatings;
