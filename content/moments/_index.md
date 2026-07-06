---
title: Moments
type: landing

sections:
  # Custom block (layouts/partials/blox/moments-list.html): groups moments by
  # year automatically via GroupByDate, newest first. The theme's `collection`
  # block ignored `group_by: year`, which is why grouping never appeared.
  - block: moments-list
    content:
      title: ''
      filters:
        # The folders to display content from
        folders:
          - moments
    design:
      spacing:
        padding: ['20px', 0, '20px', 0]
---
