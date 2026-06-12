# Rating Engine

## Global Score

An Echelon user score is a 1.0-5.0 value driven by **published media ratings** and **community participation**.

- Published media ratings contribute to the global score.
- Person-to-person ratings are disabled (App Store Guideline 1.2 compliance).
- Media score is the average of each rated published media item, so one highly-rated post does not erase all other media performance.
- New accounts start at a neutral score (3.0). Profile photos are avatars only; no appearance analysis.

## Media Ratings

Media ratings are the primary rating surface.

- A user can rate each published media item once (posts, stories, reels).
- Media ratings are displayed on the media item and roll into the author's global score.
- Rating media resets the inactivity timer (see below).

## Inactivity Decay

If a user does not rate any media for a full 24-hour period, their own score decreases by 1%.

- Each consecutive inactive day applies another 1% decrease.
- Rating a media item resets the inactivity timer.
- Decay is tracked so the same inactive day is not applied repeatedly.

## Followers

Follower changes affect the followed user by percentage, not by a fixed score amount. The rate depends on the follower's score quality.

- Low-quality follower (3 stars or less): followed user score increases by 0.01%; losing that follower decreases it by 0.01%.
- 4-star follower: followed user score increases by 0.05%; losing that follower decreases it by 0.05%.
- 5-star follower: followed user score increases by 0.1%; losing that follower decreases it by 0.1%.

## Match

Match likes and passes do **not** change another user's score.

- The visible pass action is labeled "NEXT"; matches still happen when both users like each other.

## Lens Visibility

Lens is on by default for new users and can be turned off in Settings.

- The map shows followed users who have Lens on and a recent location.
- Lens proximity scanning is for discovery only; person ratings from Lens are disabled.
