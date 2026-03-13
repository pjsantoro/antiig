# AntiIG - Instagram Feed Filter

Chrome extension that filters your Instagram feed to only show posts from people you follow. Hides suggested posts, ads, sponsored content, and the explore page.

## What it hides

- Suggested posts in your feed
- Sponsored posts / ads
- "Suggested Posts" section after "You're all caught up"
- Suggested accounts sidebar
- Explore and Reels pages
- Explore and From Meta nav links

## Install

1. Download or clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `antiig` folder

The extension icon will appear in your toolbar. Click it to toggle filtering on/off.

## Notes

- Instagram updates its DOM frequently, so detection heuristics may need tweaking over time
- The extension runs only on `instagram.com` and requires no special permissions beyond page access
