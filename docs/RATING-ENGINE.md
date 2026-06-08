# Rating Engine

## Global Score

An Echelon user score is a 1.0-5.0 value.

- Direct person ratings contribute 25% of the global score.
- Published media ratings contribute 75% of the global score.
- If only one side has ratings, that side is used until the other side has data.
- Media score is the average of each rated published media item, so one highly-rated post does not erase all other media performance.

## Direct Ratings

Direct user ratings include Lens/map ratings, chat ratings, call ratings, and video-call ratings.

- A user can rate the same person directly only once every 24 hours.
- The 24-hour limit is shared across direct methods. Rating someone from Lens blocks rating that same person from chat/call until the cooldown expires, and vice versa.
- Lens/map ratings require a follow connection and both users having Lens on.
- There is no distance requirement for Lens/map ratings.

## Media Ratings

Media ratings are independent from direct user ratings.

- A user can rate each published media item once.
- Rating media does not consume the 24-hour direct person rating cooldown.
- Media ratings are displayed on the media item and also roll into the author global score through the 75% media component.

## Inactivity Decay

If a user does not rate anyone or any media for a full 24-hour period, their own score decreases by 1%.

- Each consecutive inactive day applies another 1% decrease.
- Rating either a person or a media item resets the inactivity timer.
- Decay is tracked so the same inactive day is not applied repeatedly.

## Followers

Follower changes affect the followed user by percentage, not by a fixed score amount. The rate depends on the follower's score quality.

- Low-quality follower (3 stars or less): followed user score increases by 0.01%; losing that follower decreases it by 0.01%.
- 4-star follower: followed user score increases by 0.05%; losing that follower decreases it by 0.05%.
- 5-star follower: followed user score increases by 0.1%; losing that follower decreases it by 0.1%.

## Match

Match likes and passes apply lightweight percentage nudges to the shown user's score.

- Match like: shown user score increases by 0.05%.
- Match pass / Next: shown user score decreases by 0.05%.
- The visible pass action is labeled "NEXT"; matches still happen when both users like each other.

## Lens Visibility

Lens is on by default for new users and can be turned off in Settings.

- The map shows followed users who have Lens on and a recent location.
- Turning Lens off hides the user from Lens/map rating discovery and prevents them from using Lens ratings.
