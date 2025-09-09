---
title: Managing Collections
description: Describes how collections are added and deleted.
order: 4
layout: post
published: true
---

# Managing Collections

Collections are groups of related posts (e.g., articles, stories, events). They help organize content and provide automatically generated index pages. Each collection lives in its own folder, typically prefixed with an underscore (e.g., `_articles`).

This page explains how to add, modify, and delete collections, as well as how to add them to the site navigation.

---

## What Is a Collection?

- A **collection** is a folder of related posts, each stored in its own subfolder containing an `index.md` file.  
  Example:  
```bash
_articles
  - monument-valley
    - index.md
  - yosemite
    - index.md
```

- Collections are defined in the Jekyll configuration file (`_config.yml`).
- Each collection can generate its own listing page (e.g., `/articles`).

---

## Adding a New Collection

1. **Edit the Jekyll configuration**
 - Open `_config.yml` in the repository root.
 - Add a new section under `collections:`. Example:
   ```yaml
   collections:
     articles:
       output: true
     stories:
       output: true
     mynewcollection:
       output: true
   ```
 - `output: true` makes the collection visible as web pages.

2. **Create the collection folder and index page**
 - In GitHub, click **Add file → Create new file**.
 - For the filename, type:  
   `mynewcollection/index.md`  
   (This automatically creates the `mynewcollection` folder and the `index.md` file.)
 - Paste in the following front matter:
   ```yaml
   ---
   layout: collection
   title: "My New Collection"
   collection: mynewcollection
   ---
   ```
 - Commit the file.  
   This sets up the collection’s listing page.

3. **Add posts to the collection**
 - Inside GitHub, navigate to `_mynewcollection`.
 - Follow the steps in [Managing Posts and Pages](posts-pages) to create a post folder (e.g., `_mynewcollection/post-name/index.md`).

---

## Modifying a Collection

- **Change the title or description**  
- Edit the collection’s `index.md` file (e.g., `mynewcollection/index.md`).
- **Adjust collection behavior**  
- Update `_config.yml` (e.g., add sorting rules, defaults, or permalinks).
- **Update posts within the collection**  
- Navigate to `_mynewcollection` and edit posts as needed.

---

## Deleting a Collection

1. Delete the collection folder (e.g., `_myoldcollection`).
2. Delete the collection’s `index.md` file (e.g., `myoldcollection/index.md`).
3. Remove the collection entry from `_config.yml`.
4. Remove the collection reference from `nav_pages` (see below).
5. Commit your changes.

⚠️ This will remove all posts in the collection and break any links pointing to them.

---

## Adding a Collection to Site Navigation

Navigation is controlled by the `nav_pages` list in `_config.yml`. Example:

```yaml
nav_pages:
- index.md
- _articles/index.md
- _admin/index.md
- _examples/index.md
- about/index.md
- contact.md
```

To add your new collection:

1. Open _config.yml.
2. Add the collection’s index page to nav_pages. Example:

    ```yaml
    nav_pages:
    - index.md
    - _articles/index.md
    - _stories/index.md
    - about/index.md
    - contact.md
    ```

    Here, _stories/index.md points to the listing page of the new stories collection.

3. Commit the change.
4. The collection now appears in the site’s navigation bar.

## Summary

- Add a collection by updating _config.yml, creating a folder with its index page, and then adding posts.
- Modify collections by editing their index page or settings.
- Delete a collection by removing its folder, index page, and config entry.
- Add to navigation by including the collection’s index.md in the nav_pages list of _config.yml.