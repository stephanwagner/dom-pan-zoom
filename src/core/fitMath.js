/**
 * Pure helpers for fitting the panZoom element to the wrapper. They take
 * plain numbers and never touch the DOM, so they are easy to unit test.
 */

/**
 * @typedef {object} Size
 * @property {number} width
 * @property {number} height
 */

/**
 * Zoom level at which the container fits the wrapper, like CSS
 * `background-size: cover / contain`.
 *
 * `'cover'` fills the wrapper (the larger of the two axis ratios); anything
 * else is treated as `'contain'` (the smaller ratio, so the whole container
 * stays visible).
 *
 * Returns `null` while the container is unmeasured (zero width or height, e.g.
 * inside a `display: none` parent), since no zoom level can fit it.
 *
 * @param {Size} wrapper Wrapper size in pixels.
 * @param {Size} container Unscaled container size in pixels.
 * @param {'cover' | 'contain'} mode Fit mode.
 * @returns {number | null} Fit zoom level, or `null` if it can't be computed.
 */
export function computeFitZoom(wrapper, container, mode) {
  if (!container.width || !container.height) {
    return null;
  }

  const zoomX = wrapper.width / container.width;
  const zoomY = wrapper.height / container.height;
  return mode === 'cover' ? Math.max(zoomX, zoomY) : Math.min(zoomX, zoomY);
}

/**
 * Clamp a translation along one axis so the zoomed container stays within the
 * wrapper's bounds.
 *
 * The container is scaled around its center, so at `zoom` its edge has moved
 * by `containerSize / 2 * (zoom - 1)`. The allowed range runs between that
 * offset and the offset that aligns the opposite edges. When the zoomed
 * container is smaller than the wrapper, it is kept inside the wrapper; when
 * it is larger, it is kept covering the wrapper.
 *
 * @param {number} position Current translation in pixels.
 * @param {number} wrapperSize Wrapper width or height in pixels.
 * @param {number} containerSize Unscaled container width or height in pixels.
 * @param {number} zoom Current zoom level.
 * @returns {number} Clamped translation in pixels.
 */
export function clampAxisToBounds(position, wrapperSize, containerSize, zoom) {
  const upperOffset = (containerSize / 2) * (zoom - 1);
  const lowerOffset = upperOffset * -1 + wrapperSize - containerSize;
  const min = Math.min(upperOffset, lowerOffset);
  const max = Math.max(upperOffset, lowerOffset);
  return Math.min(Math.max(position, min), max);
}
