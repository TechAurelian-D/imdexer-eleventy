/**
 * Copyright 2024-2025 The Hello World Writer (https://www.thehelloworldwriter.com/). All rights reserved.
 * See LICENSE in the project root for license information.
 * @author TechAurelian <dev@techaurelian.com> (https://techaurelian.com)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import imdexerEleventy from '../.eleventy.js';

/** An index in the current format, with one single image and one group. */
const INDEX = {
  version: 2,
  separator: '_',
  images: {
    'icons/logo.svg': [100, 50],
    'apps/hero.png': { '150w': [150, 333], '600w': [600, 1333] },
  },
};

/**
 * Registers the plugin on a stand-in for the Eleventy configuration object.
 *
 * @param {Array<Object>} zones The image zones to configure the plugin with.
 * @returns {{ img: Function, url: Function }} The registered shortcode and filter.
 */
function setUp(zones) {
  const registered = {};
  const eleventyConfig = {
    addShortcode: (name, fn) => { registered[name] = fn; },
    addFilter: (name, fn) => { registered[name] = fn; },
  };

  imdexerEleventy(eleventyConfig, { imgShortcode: 'img', imgUrlFilter: 'url', zones });

  return registered;
}

describe('image shortcode', () => {
  const { img } = setUp([{ imdexer: INDEX, baseUrl: 'https://cdn.example.com/images/' }]);

  it('generates a simple tag for a single image', () => {
    assert.equal(
      img({ src: 'icons/logo.svg', alt: 'Logo' }),
      '<img loading="lazy" width="100" height="50" src="https://cdn.example.com/images/icons/logo.svg"  alt="Logo" />',
    );
  });

  it('generates a responsive tag for a group, with the largest variant as the default', () => {
    assert.equal(
      img({ src: 'apps/hero.png', alt: 'Hero', class: 'hero', lazy: false }),
      '<img  sizes="auto" width="600" height="1333" '
      + 'srcset="https://cdn.example.com/images/apps/hero_150w.png 150w, https://cdn.example.com/images/apps/hero_600w.png 600w" '
      + 'src="https://cdn.example.com/images/apps/hero_600w.png" class="hero" alt="Hero" />',
    );
  });

  it('uses the variant with the requested width as the default', () => {
    const tag = img({ src: 'apps/hero.png', alt: '', defaultImageWidth: 150 });

    assert.match(tag, / width="150" height="333" /);
    assert.match(tag, / src="https:\/\/cdn\.example\.com\/images\/apps\/hero_150w\.png" /);
  });

  it('fails when no variant has the requested width', () => {
    assert.throws(
      () => img({ src: 'apps/hero.png', alt: '', defaultImageWidth: 300 }),
      /No image found with width 300/,
    );
  });

  it('fails for an image that is not in the index', () => {
    assert.throws(() => img({ src: 'missing.png', alt: '' }), /Missing image data for image: missing\.png/);
  });

  it('fails when the alt text is missing', () => {
    assert.throws(() => img({ src: 'icons/logo.svg' }), /Missing `alt` attribute/);
  });
});

describe('image URL filter', () => {
  const { url } = setUp([
    { prefix: 'local://', imdexer: INDEX, baseUrl: '/images' },
    { prefix: 'static://', imdexer: { ...INDEX, separator: '--' }, baseUrl: 'https://cdn.example.com' },
  ]);

  it('returns the URL of a single image', () => {
    assert.equal(url('local://icons/logo.svg'), '/images/icons/logo.svg');
  });

  it('returns the URL of the largest variant of a group', () => {
    assert.equal(url('local://apps/hero.png'), '/images/apps/hero_600w.png');
  });

  it('builds variant names with the separator of the index', () => {
    assert.equal(url('static://apps/hero.png'), 'https://cdn.example.com/apps/hero--600w.png');
  });

  it('fails for an image that matches no zone', () => {
    assert.throws(() => url('other://icons/logo.svg'), /No zone found for image/);
  });
});

describe('index format check', () => {
  it('rejects an index in the old format and says how to regenerate it', () => {
    const oldIndex = { 'icons/logo.svg': { width: 100, height: 50 } };

    assert.throws(
      () => setUp([{ prefix: 'static://', imdexer: oldIndex, baseUrl: '/' }]),
      /format version 2.*zone "static:\/\/".*imdexer --rebuild/s,
    );
  });

  it('rejects an index in a newer format', () => {
    assert.throws(() => setUp([{ imdexer: { ...INDEX, version: 3 }, baseUrl: '/' }]), /format version 2/);
  });
});
