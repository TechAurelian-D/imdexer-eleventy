/**
 * Copyright TechAurelian (https://techaurelian.com). All rights reserved.
 * See LICENSE in the project root for license information.
 */

// @ts-check

import { joinPosixPath, getImageData, getImageFiles, getLargestFile } from './utils.js';

/**
 * Adds the specified imageUrl filter to Eleventy.
 *
 * @param {{ addFilter: Function }} eleventyConfig The Eleventy configuration object.
 * @param {string} filterName The name of the filter.
 * @param {Array<import('./utils.js').ImageZone>} zones The array of image zones.
 */
export function addImageUrlFilter(eleventyConfig, filterName, zones) {
  /**
   * Returns the image URL with the correct path for the provided image source.
   * 
   * If the image source is a grouped image, the URL for the largest image in the group is returned.
   * 
   * @param {string} src The image source.
   * @returns {string} The image URL.
   */
  const imageUrl = function(src) {
    // Get the image data based on the available zones
    /** @type {import('./utils.js').ImageData} */
    const data = getImageData(src, zones);

    // A single image has one file, so the largest file is the right one for both kinds
    const { files } = getImageFiles(data.imdexer, data.imageSrc);
    return joinPosixPath(data.baseUrl, getLargestFile(files).path);
  };

  // Add the filter to Eleventy
  eleventyConfig.addFilter(filterName, imageUrl);
}
