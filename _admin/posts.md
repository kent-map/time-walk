---
title: Managing Posts and Pages
description: Describes how posts and site pages are added, deleted and modified.
order: 2
layout: post
published: true
---

# Managing Posts and Pages

This guide explains how to add, edit, publish, rename, and delete **posts** and **pages** on your Jekyll site hosted with GitHub Pages. It also covers the differences between posts and pages, and how to write content using Juncture-enhanced Markdown.

---

## Posts vs. Pages

Although posts and pages share the same underlying Markdown format, they serve different purposes in your site:

- **Posts**
  - Typically belong to a *collection* (e.g., `_articles`, `_stories`, `_events`).
  - Appear in automatically generated indexes or feeds.
  - Usually include metadata such as `date`, `tags`, and `author`.
  - Suitable for news, articles, event announcements, or anything time-based or grouped.

- **Pages**
  - Stand-alone content, not part of a collection.
  - Typically found at the top navigation level (e.g., `/about`, `/contact`).
  - Do not require metadata like `author` or `tags`, though front matter is still used for title and permalink.
  - Suitable for evergreen information.

Both posts and pages use the same Markdown writing style, including Juncture enhancements (see below).

---

## Adding a New Post

1. **Copy the post template**
   - Open the [post template file](https://raw.githubusercontent.com/juncture-digital/template/main/_admin/template/index.md).
   - Copy all of the text.

2. **Create a new file in the post collection**
   - Navigate to the collection folder (e.g., [`_articles`](_articles)).
   - In GitHub, click **Add file → Create new file**.
   - Enter the file name using this pattern:  
     `short-descriptive-name/index.md`  
     Example: `monument-valley/index.md`

3. **Paste the template**
   - In the file editor, paste the template text.
   - This provides the *front matter* used for indexing and display.

4. **Edit the front matter**
   - Update the following fields:
     - **title**: The post title as you want it displayed.
     - **description**: A short summary.
     - **author**: Your name.
     - **date**: Publish date in `YYYY-MM-DD` format.
     - **tags**: Space-separated list of tags (see [Adding a tag](add-tag)).
     - **thumbnail**: Optional thumbnail image path.
     - **permalink**: Optional; overrides default URL.
     - **published**: Set to `false` while drafting. Change to `true` when ready.
     - **featured**: Set to `true` to highlight on the collection index.

---

## Adding a New Page

1. **Choose a location**
   - Pages typically live in the root of the repository (not in `_articles` or other collections).
   - Example: an `about/index.md` page becomes `/about` on the site.

2. **Create the file**
   - In GitHub, click **Add file → Create new file**.
   - Name it using a short identifier followed by `/index.md`.  
     Example: `about/index.md`.

3. **Add front matter**
   - At minimum, include:
     ```yaml
     ---
     title: "About"
     permalink: /about/
     ---
     ```

4. **Add page content**
   - Write your content using Juncture-enhanced Markdown.

---

## Writing Content with Juncture-Enhanced Markdown

The site uses **Kramdown** (GitHub Pages’ Markdown processor) with Juncture extensions:

- **Basic Markdown**: Headings, lists, links, images, blockquotes, etc.
- **Kramdown Features**: Attribute blocks, footnotes.
- **Juncture Enhancements**: Interactive elements like image viewers, maps, and timelines.
  - Example:  
    ```juncture
    `image src=wc:Sunflower_sky_backdrop.jpg`
    ```
    creates an interactive IIIF image viewer using a Wikimedia Commons hosted image.

See the [Markdown Guide](markdown-guide) and [Juncture documentation](https://www.junctire-digital.io) for more information.  Examples can be found in the [examples](/examples) collection in this template.

---

## Publishing a Post or Page

- A post/page is **live** when:
  - The file is committed to the main branch, **and**
  - Its front matter includes `published: true` (for posts).

- Changes usually appear on the live site within a few minutes after saving.

---

## Modifying a Post or Page

1. Navigate to the file in GitHub.
2. Click the pencil (edit) icon.
3. Make your changes.
4. Commit the changes to save.

---

## Renaming a Post or Page

- Renaming requires creating a new folder and file, then deleting the old one.
- Steps:
  1. Copy the existing file’s contents into a new file with the desired name (e.g., `new-name/index.md`).
  2. Commit the new file.
  3. Delete the old folder/file.
  4. Update any internal links to point to the new URL.

> ⚠️ Renaming changes the page’s URL, which may break bookmarks and links.

---

## Deleting a Post or Page

1. Navigate to the file in GitHub.
2. Open the file and click the **trash can** icon.
3. Commit the deletion.

If the page was published, its URL will no longer work after deletion.

---

## Summary

- **Posts** belong to collections and have rich metadata.  
- **Pages** are stand-alone and best for evergreen content.  
- Both use Juncture-enhanced Markdown for interactive elements.  
- Publishing is controlled by committing the file and, for posts, setting `published: true`.  
- Renaming or deleting requires care, as it affects URLs.
