---
title: Tag Management
description: How to add, delete, or rename tags.
order: 3
layout: post
published: true
---

# Managing Tags

Tags are keywords that group related posts across collections. For example, multiple posts in `_articles` and `_stories` may share the tag `architecture`, letting users browse all posts with that tag.  

This page explains how to add, rename, and delete tags.

---

## How Tags Work

- Tags are defined in the **front matter** of a post, using the `tags:` field.  
- Multiple tags are space-separated (e.g., `tags: history architecture`).  
- Tag indexes are generated automatically by the theme — you do not need to create tag pages manually.  
- Tags must be a single word. For multi-word tags, use hyphens (e.g., `civil-war`).

---

## Adding a Tag

1. **Open a post for editing**
   - Navigate to the post file (e.g., `_articles/monument-valley/index.md`).
   - Click the pencil icon to edit.

2. **Add the tag in the front matter**
   - Example front matter with tags:
     ```yaml
     ---
     title: "Monument Valley"
     description: "Exploring the iconic landscapes of the Southwest"
     author: "Jane Doe"
     date: 2025-09-01
     tags: history landscape southwest
     ---
     ```
   - Here, three tags are assigned: `history`, `landscape`, and `southwest`.

3. **Commit your changes**
   - Save and commit the file.  
   - The new tag will automatically appear in the site’s tag index and on the post’s page.

---

## Renaming a Tag

Renaming requires updating all posts that use the tag:

1. **Search for the old tag**
   - In GitHub, use the repository search (top-left search bar) to find all occurrences of the tag.
   - Example: search for `tags: history`.

2. **Edit each post**
   - Replace the old tag with the new one in the front matter.
   - Example:  
     Change `tags: history landscape` → `tags: heritage landscape`.

3. **Commit your changes**
   - Once updated, the new tag will appear in indexes.  
   - The old tag will no longer exist on the site.

---

## Deleting a Tag

To remove a tag:

1. **Edit each post that uses the tag**
   - Open the post file.
   - Remove the tag from the `tags:` list.
   - Example:  
     Change `tags: history landscape` → `tags: landscape`.

2. **Commit your changes**
   - Once no posts reference a tag, it disappears from the site’s tag index.

---

## Tips for Managing Tags

- Keep tags consistent (e.g., use `civil-war` everywhere, not `CivilWar` or `civil war`).  
- Use **lowercase** to avoid duplicates.  
- Don’t create too many tags — group content meaningfully rather than tagging every word.  

---

## Summary

- **Add a tag** by editing a post’s front matter and including it in `tags:`.  
- **Rename a tag** by updating all posts that use it.  
- **Delete a tag** by removing it from all posts.  
- Tag indexes are updated automatically when posts are committed.
