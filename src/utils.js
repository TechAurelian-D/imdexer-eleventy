/**
 * Copyright 2024-2025 The Hello World Writer (https://www.thehelloworldwriter.com/). All rights reserved.
 * See LICENSE in the project root for license information.
 * @author TechAurelian <dev@techaurelian.com> (https://techaurelian.com)
 */

// @ts-check

import path from 'node:path';

import { PACKAGE_NAME, SUPPORTED_FORMAT_VERSION } from './consts.js';

/**
 * The width and height of an image, in this order.
 * @typedef {[number, number]} Dimensions
 */

/**
 * The content of an imdexer index file.
 * @typedef {Object} Imdexer
 * @property {number} version The version of the index format.
 * @property {string} separator The separator between the group name and the variant name.
 * @property {Object<string, Dimensions | Object<string, Dimensions>>} images The dimensions of
 * each single image, or of each variant of a group, keyed by image path.
 */

/**
 * One image file that an index entry describes.
 * @typedef {Object} ImageFile
 * @property {string} path The path to the image file, relative to the base URL of its zone.
 * @property {number} width The width of the image.
 * @property {number} height The height of the image.
 */

/**
 * @typedef {Object} ImageZone
 * @property {string} [prefix] The prefix for the image source.
 * @property {Imdexer} imdexer The imdexer object containing data for the images.
 * @property {string} baseUrl The base URL for the images.
 */

/**
 * @typedef {Object} ImageData
 * @property {string} imageSrc The image source without prefix.
 * @property {Imdexer} imdexer The imdexer object containing data for the images.
 * @property {string} baseUrl The base URL for the images.
 */

/**
 * Checks that the index of every zone is in the format this plugin reads.
 *
 * @param {Array<ImageZone>} zones The array of image zones.
 * @throws {Error} If an index is in another format, naming the zone and how to regenerate it.
 */
export function assertSupportedIndexes(zones) {
  for (const zone of zones) {
    if (zone.imdexer?.version !== SUPPORTED_FORMAT_VERSION) {
      const found = zone.imdexer?.version ? `format version ${zone.imdexer.version}` : 'an older format';
      throw new Error(
        `${PACKAGE_NAME} reads indexes in format version ${SUPPORTED_FORMAT_VERSION}, but the index of zone `
        + `"${zone.prefix ?? zone.baseUrl}" is in ${found}. Regenerate it with: imdexer --rebuild`
      );
    }
  }
}

/**
 * Gets the image files that the index records for an image source.
 *
 * @param {Imdexer} imdexer The imdexer object containing data for the images.
 * @param {string} src The image source without prefix.
 * @returns {{ isGroup: boolean, files: Array<ImageFile> }} The single file of an ungrouped image,
 * or one file per variant of a group.
 * @throws {Error} If the index does not hold the image.
 */
export function getImageFiles(imdexer, src) {
  const entry = imdexer.images[src];
  if (!entry) {
    throw new Error(`Missing image data for image: ${src}`);
  }

  if (Array.isArray(entry)) {
    return { isGroup: false, files: [{ path: src, width: entry[0], height: entry[1] }] };
  }

  // A variant file is named after its group, with the variant name added before the extension
  const extension = path.posix.extname(src);
  const stem = src.slice(0, src.length - extension.length);
  const files = Object.entries(entry).map(([variant, [width, height]]) => ({
    path: `${stem}${imdexer.separator}${variant}${extension}`,
    width,
    height,
  }));

  return { isGroup: true, files };
}

/**
 * Finds the widest of the given image files.
 *
 * @param {Array<ImageFile>} files The image files to compare.
 * @returns {ImageFile} The file with the largest width.
 */
export function getLargestFile(files) {
  return files.reduce((a, b) => (a.width > b.width ? a : b));
}

/**
 * Joins two paths using the POSIX path separator, ensuring that there is only one separator
 * between them.
 *
 * @param {string} path1 The first path.
 * @param {string} path2 The second path.
 * @returns {string} The joined path.
 */
export function joinPosixPath(path1, path2) {
  if (!path1 || !path2) return path1 + path2;
  return path1.replace(/\/$/, '') + '/' + path2.replace(/^\//, '');
};

/**
 * Gets the image data for the specified image source based on the available zones.
 *
 * @param {string} src The source of the image.
 * @param {Array<ImageZone>} zones The array of image zones.
 * @returns {ImageData} The image data object containing the image source, imdexer, and base URL.
 */
export function getImageData(src, zones) {

  // If there is only one entry in the zones array, return its data
  if (zones.length === 1) {
    return {
      imageSrc: src, // There should be no prefix to remove
      imdexer: zones[0].imdexer,
      baseUrl: zones[0].baseUrl,
    }
  }

  // Otherwise, find the zone that matches the image source based on the prefix, and return its data
  for (const zone of zones) {
    if (zone.prefix && src.startsWith(zone.prefix)) {
      return {
        imageSrc: src.slice(zone.prefix.length), // Remove the prefix from the image source
        imdexer: zone.imdexer,
        baseUrl: zone.baseUrl,
      }
    }
  }

  // If no zone matches the image source, throw an error
  throw new Error(`No zone found for image: ${src}`);
}

