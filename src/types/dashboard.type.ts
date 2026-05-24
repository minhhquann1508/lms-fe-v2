export interface DashboardOverview {
  totalCourses: number;
  purchasedCourses: number;
  averageRating: number;
  revenue: number;
  totalReviews: number;
  totalDiscussions: number;
}

export interface DashboardCourseLeaderboardItem {
  id: string;
  name: string;
  thumbnail: string | null;
  authorName: string | null;
  authorAvatar: string | null;
  price: number;
  rating: number;
  reviewCount: number;
  discussionCount: number;
  purchasedCount: number;
  averageProgress: number;
  revenue: number;
}

export interface DashboardCourseHighlights {
  mostStudied: DashboardCourseLeaderboardItem[];
  highestRated: DashboardCourseLeaderboardItem[];
  mostDiscussed: DashboardCourseLeaderboardItem[];
  bestSelling: DashboardCourseLeaderboardItem[];
  needsAttention: DashboardCourseLeaderboardItem[];
}
