/**
 * Copyright TechAurelian (https://techaurelian.com). All rights reserved.
 * See LICENSE in the project root for license information.
 */

// @ts-check

import { PACKAGE_NAME } from './consts.js';
import { joinPosixPath, getImageData, getImageFiles, getLargestFile } from './utils.js';

/**
 * @typedef {Object} ShortcodeArgs
 * @property {string} src The image source.
 * @property {string} alt The alt attribute for the image.
 * @property {string} [class] The class attribute for the image.
 * @property {boolean} [lazy] Whether to use lazy loading for the image.
 * @property {string} [sizes] The sizes attribute for the image.
 * @property {number} [defaultImageWidth] The width of the default image to use for the src attribute.
 */

/**
 * Adds the specified image shortcode to Eleventy.
 *
 * @param {{ addShortcode: Function }} eleventyConfig The Eleventy configuration object.
 * @param {string} shortcodeName The name of the shortcode.
 * @param {Array<import('./utils.js').ImageZone>} zones The array of image zones.
 */
export function addImageShortcode(eleventyConfig, shortcodeName, zones) {

  /**
   * Returns the content for the image shortcode, which is a HTML image tag with attributes
   * computed from the provided arguments.
   * @param {ShortcodeArgs} args The arguments for the shortcode.
   * @returns {string} The HTML image tag.
   */
  const imageShortcode = function (args) {

    // Get the image data based on the optional prefix and available zones
    /** @type {import('./utils.js').ImageData} */
    const data = getImageData(args.src, zones);

    // Generate and return the HTML image tag
    return generateImageTag({ alt: args.alt, baseUrl: data.baseUrl, classAttr: args.class, imdexer: data.imdexer, lazy: args.lazy, sizes: args.sizes, src: data.imageSrc, defaultImageWidth: args.defaultImageWidth });
  };

  // Add the shortcode to Eleventy
  eleventyConfig.addShortcode(shortcodeName, imageShortcode);
}

/**
 * @typedef {Object} ImageTagOptions
 * @property {string} alt The alt attribute for the image.
 * @property {string} baseUrl The base URL for the images.
 * @property {string} [classAttr] The class attribute for the image.
 * @property {number} [defaultImageWidth] The width of the default image to use for the src attribute.
 * @property {import('./utils.js').Imdexer} imdexer The imdexer object containing data for the images.
 * @property {boolean} [lazy] Whether to use lazy loading for the image.
 * @property {string} [sizes] The sizes attribute for the image.
 * @property {string} src The source of the image.
 */

/**
 * Generates an image tag for the specified image.
 *
 * @param {ImageTagOptions} options The options for the image tag. 
 * @returns {string} The HTML image tag.
 */
function generateImageTag({ alt, baseUrl, classAttr, defaultImageWidth, imdexer, lazy = true, sizes = 'auto', src }) {

  if (!imdexer) {
    throw new Error(`${PACKAGE_NAME} requires an imdexer object.`);
  }

  // Check if alt text is provided. This is required for accessibility.
  // For decorative images, use an empty string for the alt attribute.
  if (alt === undefined) {
    throw new Error(`Missing \`alt\` attribute for image: ${src}`);
  }

  if (!src) {
    throw new Error(`Missing \`src\` attribute for image: ${src}`);
  }

  // Get the image files from the imdexer
  const { isGroup, files } = getImageFiles(imdexer, src);

  // If this is a single (non-grouped) image, return a simple image tag
  if (!isGroup) {
    const { width, height } = files[0];

    // Correctly join the base URL and the image source
    const fullSrc = joinPosixPath(baseUrl, src);

    // Add the lazy loading attribute if it's set to true
    const loadingAttr = lazy ? 'loading="lazy"' : '';

    // Return the image tag
    return `<img ${loadingAttr} width="${width}" height="${height}" src="${fullSrc}" ${classAttr ? `class="${classAttr}"` : ''} alt="${alt}" />`;
  }

  // If we are here, this is a grouped image, so let's generate a responsive image tag

  // Generate the srcset attribute
  const srcset = files.map(file => `${joinPosixPath(baseUrl, file.path)} ${file.width}w`).join(', ');

  // If defaultImageWidth is provided, find the image with that width
  let defaultFile;
  if (defaultImageWidth) {
    defaultFile = files.find(file => file.width === defaultImageWidth);
    if (!defaultFile) {
      throw new Error(`No image found with width ${defaultImageWidth} for image: ${src}`);
    }
  } else {
    // Otherwise, find the largest image based on the width
    defaultFile = getLargestFile(files);
  }

  // Get the full source of the default image
  const defaultImage = joinPosixPath(baseUrl, defaultFile.path);

  // Get the width and height of the default image
  const { width, height } = defaultFile;

  // Add the lazy loading attribute if it's set to true
  const loadingAttr = lazy ? 'loading="lazy"' : '';

  // Return the image tag with all the responsive image attributes
  return `<img ${loadingAttr} sizes="${sizes}" width="${width}" height="${height}" srcset="${srcset}" src="${defaultImage}" ${classAttr ? `class="${classAttr}"` : ''} alt="${alt}" />`;
}
