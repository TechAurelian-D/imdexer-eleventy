# imdexer-eleventy

An Eleventy plugin that generates `<img>` tags and image URLs from [imdexer](https://github.com/TechAurelian-D/imdexer) indexes. It adds one shortcode and one filter:

- The shortcode writes an `<img>` tag with the `width` and `height` of the image, which prevents layout shifts while the page loads. For an image that exists in several widths, it also writes `srcset` and `sizes`, so the browser downloads the file that fits.
- The filter returns the full URL of an image.

The plugin never opens an image. Everything it knows comes from the index, a JSON file that imdexer builds from the image files, so the images can live anywhere: in the site, in another repository, or on a CDN. Each such place is a zone, with its own index and its own base URL.

## Requirements

- Eleventy 3 or higher.
- Indexes in format version 2, which imdexer 2.0.0 and later write.

## Installation

The plugin is not published to the npm registry. Install it from its Git repository:

```bash
$ npm install github:TechAurelian-D/imdexer-eleventy
```

If npm refuses Git dependencies, allow direct ones by adding `allow-git=root` to the `.npmrc` file of the site.

## Configuration

Load each index and add the plugin in the Eleventy configuration file:

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

| Option | Description |
| --- | --- |
| `imgShortcode` | The name of the shortcode. Leave it out to add no shortcode. |
| `imgUrlFilter` | The name of the filter. Leave it out to add no filter. |
| `zones` | The list of zones. Required. |

Each zone has these properties:

| Property | Description |
| --- | --- |
| `imdexer` | The content of the index of the zone, as a parsed object and not as a file path. |
| `baseUrl` | The URL that the image paths of the index are added to. It can be a full URL or a path of the site. |
| `prefix` | The text that an image source starts with to select this zone. It can be any text; a form like `static://` is easy to recognize. Required when there are several zones. |

The index is read when Eleventy starts. After generating an index again, restart a running development server so it picks up the change.

### Image sources and zones

An image source is the text that a template passes to the shortcode or the filter. It is the path of the image exactly as the index holds it, with the prefix of its zone in front: `static://apps/hero.png` is the image `apps/hero.png` in the index of the `static://` zone.

- With several zones, the first zone whose prefix the source starts with is used, and the prefix is removed. A zone without a prefix is never selected.
- With a single zone, the source is used as it is. Do not write a prefix, because it is not removed.

The paths of an index are relative to the directory that imdexer was run from, so generate each index from the directory that the `baseUrl` of its zone points to. The base URL and the path are joined with exactly one slash.

For an image that exists in several widths, the source is the path of the group and not the name of one of its files. imdexer builds a group from the files `apps/hero_320w.png` and `apps/hero_1280w.png`, and its path is `apps/hero.png`. The imdexer documentation explains how file names become groups.

## The image shortcode

The shortcode takes one object as its argument. In Nunjucks, write it as keyword arguments:

```njk
{% image src="static://apps/hero.png", alt="The app on a phone", class="rounded", sizes="(min-width: 768px) 50vw, 100vw" %}
```

| Argument | Default | Description |
| --- | --- | --- |
| `src` | | The image source. Required. |
| `alt` | | The alternative text. Required. Pass an empty text for a decorative image. |
| `class` | none | The `class` attribute. |
| `lazy` | `true` | Whether to add `loading="lazy"`. Pass `false` for images that are visible when the page opens. |
| `sizes` | `auto` | The `sizes` attribute. Used for groups only. |
| `defaultImageWidth` | the largest | The width in pixels of the variant to use for `src`, `width` and `height`. Used for groups only. A variant with exactly this width must exist. |

Other arguments are ignored. The values of `alt` and `class` are written as they are, so they must not contain double quotes.

A single image produces a plain tag:

```html
<img loading="lazy" width="100" height="50" src="/assets/images/branding/logo.svg" alt="Logo" />
```

A group produces a responsive tag. `srcset` lists every variant with its real width, and `src`, `width` and `height` come from the largest variant, or from the one that `defaultImageWidth` names:

```html
<img loading="lazy" sizes="auto" width="1280" height="720" srcset="https://static.example.com/images/apps/hero_320w.png 320w, https://static.example.com/images/apps/hero_1280w.png 1280w" src="https://static.example.com/images/apps/hero_1280w.png" alt="The app on a phone" />
```

Browsers accept `sizes="auto"` only on lazy-loaded images. When you pass `lazy=false` for a group, pass `sizes` as well.

## The image URL filter

The filter takes an image source and returns its URL. For a group, it returns the URL of the largest variant:

```njk
<meta property="og:image" content="{{ 'static://apps/hero.png' | imageUrl }}">
```

## Errors

The plugin stops the build when it cannot produce a correct result:

| Message | Cause |
| --- | --- |
| `imdexer-eleventy reads indexes in format version 2, but the index of zone ... is in ...` | An index is in another format. Generate it again with imdexer 2.0.0 or later. |
| `No zone found for image: ...` | The source starts with the prefix of no zone. |
| `Missing image data for image: ...` | The index of the zone has no such path. The image is new and the index was not updated, the path is misspelled, or it names a variant file and not its group. The message shows the path without the prefix. |
| ``Missing `alt` attribute for image: ...`` | No `alt` argument was passed. |
| `No image found with width ... for image: ...` | No variant of the group has the width passed as `defaultImageWidth`. |

## Agent skill

The `skills/imdexer-eleventy/` directory is an [Agent Skill](https://agentskills.io) that teaches an AI coding agent to use the shortcode and the filter in a site. To make it available in every project, link it into your personal skills directory. For Claude Code:

```bash
# macOS and Linux
$ ln -s /path/to/imdexer-eleventy/skills/imdexer-eleventy ~/.claude/skills/imdexer-eleventy
```

```powershell
# Windows
> New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills\imdexer-eleventy" -Target "D:\path\to\imdexer-eleventy\skills\imdexer-eleventy"
```

The skill describes the version of the plugin it is shipped with, which can be newer than the version a site has installed.

## Tests

```bash
$ npm test
```
