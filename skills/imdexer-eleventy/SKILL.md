---
name: imdexer-eleventy
description: Use when working on an Eleventy site that has imdexer-eleventy in its package.json - when adding, changing or removing an image in a template or page, writing an img tag or an image URL, setting up or changing the plugin or its zones in the Eleventy config, or when a build fails with "Missing image data for image", "No zone found for image", "Missing `alt` attribute", "No image found with width", or an index format version error.
license: Proprietary
metadata:
  author: TechAurelian
  version: "2.0.0"
---

# imdexer-eleventy

imdexer-eleventy is an Eleventy plugin that adds one shortcode, which writes a complete `<img>` tag, and one filter, which returns an image URL. It never opens an image: widths and heights come from index files, which are JSON files that the `imdexer` command-line tool generates from the image files.

Everything needed to use the plugin is on this page. Do not read its source code in `node_modules`. This page describes version 2.0.0, which reads index format version 2.

In a site that uses the plugin, write images with its shortcode and filter, not as hand-written `<img>` tags or URLs. The shortcode is what gives every image its `width` and `height`.

## First, read the site's setup

Names and locations differ per site. Find the `addPlugin` call for `imdexer-eleventy` in the Eleventy config file and note:

- `imgShortcode` and `imgUrlFilter` - the names the site gave the shortcode and the filter. The examples below use `image` and `imageUrl`; use the site's names.
- `zones` - one entry per place where images live. Each zone has a `prefix` (such as `static://`), a `baseUrl`, and an `imdexer` object, loaded from an index file a few lines above. Note which index file belongs to which zone.

Then check that this page fits the site: open one of those index files. It should start with `"version": 2`. If it has no `version` field, the site is still on an older plugin and index format; say so to the user before changing anything, because this page does not describe that version.

## Image sources

An image source is the text passed to the shortcode or the filter: the prefix of a zone followed by the path of the image exactly as the index of that zone holds it.

`static://apps/hero.png` = the entry `"apps/hero.png"` in the index of the `static://` zone.

- Copy the path from the index: same case, forward slashes, no leading slash.
- If the site has only one zone, write the path without any prefix. With a single zone the prefix is not removed, and the lookup fails.
- A zone's `baseUrl` and the path are joined with exactly one slash to form the URL.

An index has two kinds of entries:

```json
"branding/logo.svg": [100,50],
"apps/hero.png": {"320w": [320,180], "1280w": [1280,720]}
```

- The first is a single image, with its `[width, height]`.
- The second is a group: one image in several widths. Its files are `apps/hero_320w.png` and `apps/hero_1280w.png` (the group path with the separator and the variant name before the extension; the separator is the `separator` field of the index). No file named `apps/hero.png` exists. The source of a group is always the group path, `static://apps/hero.png`, and never the name of one of its files.

## The shortcode

It takes one object. In Nunjucks, write keyword arguments separated by commas:

```njk
{% image src="static://apps/hero.png", alt="The app on a phone", class="rounded", lazy=false, sizes="(min-width: 768px) 50vw, 100vw" %}
```

| Argument | Default | Meaning |
| --- | --- | --- |
| `src` | | The image source. Required. |
| `alt` | | Required; the build fails without it. Pass `alt=""` for a decorative image. |
| `class` | none | The `class` attribute. |
| `lazy` | `true` | Adds `loading="lazy"`. Pass `lazy=false` for an image that is visible when the page opens, such as a hero. |
| `sizes` | `"auto"` | The `sizes` attribute. Groups only. |
| `defaultImageWidth` | the largest variant | A number: the pixel width of the variant used for `src`, `width` and `height`. Groups only. A variant with exactly that width must be in the index. |

- No other arguments exist. Anything else, such as `title`, `id` or `style`, is silently dropped. If the tag needs more, wrap it in an element that carries it.
- `alt` and `class` are written into the tag as they are, so they must not contain a double quote.
- Browsers accept `sizes="auto"` only on lazy-loaded images. With `lazy=false` on a group, always pass a real `sizes` value that matches the layout; if the layout width is not known, ask or say that the value is a guess.
- These rules are for the tags you write. If an existing tag that is not part of the task breaks one of them, report it and leave it as it is.

What comes out:

```html
<!-- single image -->
<img loading="lazy" width="100" height="50" src="/assets/images/branding/logo.svg" alt="Logo" />

<!-- group -->
<img loading="lazy" sizes="auto" width="1280" height="720" srcset="https://static.example.com/images/apps/hero_320w.png 320w, https://static.example.com/images/apps/hero_1280w.png 1280w" src="https://static.example.com/images/apps/hero_1280w.png" alt="The app on a phone" />
```

## The filter

It takes an image source and returns the URL. For a group, that is the URL of the largest variant. Use it wherever a URL is needed and not a tag:

```njk
<meta property="og:image" content="{{ 'static://apps/hero.png' | imageUrl }}">
```

## Adding or changing an image

1. Put the image files in the directory of the right zone. That can be another repository than the site. For several widths, name the files `<name>_<width>w.<ext>`; for a single image, keep the separator (usually `_`) out of the file name, or it becomes a group.
2. Regenerate the index of that zone with `imdexer`. The plugin reads only the index, so a new image does not exist for it until the index has it, and a replaced image keeps its old `width` and `height` until the index is rebuilt. Follow the imdexer skill for the command; the site's documentation records where to run it. Never edit an index by hand.
3. Write the shortcode or filter call, with the path as it now appears in the index.
4. Build the site and read the generated tag once: `width`, `height` and `srcset` should match the files. The tag has a double space where an optional attribute is absent, which is harmless.

The indexes are loaded when Eleventy starts. A development server that is already running does not see a regenerated index until it is restarted.

## Build errors

| Message | Cause and fix |
| --- | --- |
| `Missing image data for image: <path>` | The index of the zone has no such path; the message shows it without the prefix. Either the index was not regenerated after the image was added, or the path is misspelled, or it names a variant file (`hero_320w.png`) and not its group (`hero.png`), or a prefix was written on a single-zone site. Compare with the index file. |
| `No zone found for image: <src>` | The source starts with no zone's prefix. Check the prefix against the config. |
| ``Missing `alt` attribute for image: <path>`` | No `alt` was passed. Add one, empty for decorative images. |
| `No image found with width <n> for image: <path>` | `defaultImageWidth` matches no variant. Use a width listed for the group in the index. |
| `imdexer-eleventy reads indexes in format version 2, but the index of zone "<zone>" is in ...` | That index was written by an older imdexer. Regenerate it with imdexer 2.0.0 or later, using that zone's usual command with `--rebuild`. |

## Setting up the plugin in a site

```js
import fs from 'node:fs';
import imdexerEleventy from 'imdexer-eleventy';

export default function (eleventyConfig) {
  const localIndex = JSON.parse(fs.readFileSync('./config/local-imdexer.json', 'utf8'));
  const staticIndex = JSON.parse(fs.readFileSync('./config/static-imdexer.json', 'utf8'));

  eleventyConfig.addPlugin(imdexerEleventy, {
    imgShortcode: 'image',
    imgUrlFilter: 'imageUrl',
    zones: [
      { prefix: 'local://', imdexer: localIndex, baseUrl: '/assets/images/' },
      { prefix: 'static://', imdexer: staticIndex, baseUrl: 'https://static.example.com/images/' },
    ],
  });
}
```

- Install with `npm install github:TechAurelian-D/imdexer-eleventy`; the package is not in the npm registry. If npm refuses Git dependencies, add `allow-git=root` to the site's `.npmrc`. The plugin needs Eleventy 3 or higher.
- `imdexer` is the parsed content of an index file, not its path.
- Leaving out `imgShortcode` or `imgUrlFilter` adds no shortcode or no filter.
- With several zones, every zone needs a `prefix`; the first zone whose prefix matches the start of the source is used.
- Generate each index from the directory that its zone's `baseUrl` points to, so that the paths in the index are the paths under that URL. Record the command for each index in the site's documentation.
