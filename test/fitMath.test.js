import { describe, expect, it } from 'vitest';
import {
  clampAxisToBounds,
  computeFitZoom,
  getAxisBounds
} from '../src/core/fitMath.js';

describe('computeFitZoom', () => {
  const wrapper = { width: 400, height: 300 };
  const container = { width: 800, height: 300 };

  it('contain uses the smaller axis ratio', () => {
    expect(computeFitZoom(wrapper, container, 'contain')).toBe(0.5);
  });

  it('cover uses the larger axis ratio', () => {
    expect(computeFitZoom(wrapper, container, 'cover')).toBe(1);
  });

  it('treats any other mode as contain', () => {
    expect(computeFitZoom(wrapper, container, true)).toBe(0.5);
  });

  it('returns null while the container is unmeasured', () => {
    const empty = { width: 0, height: 0 };
    expect(computeFitZoom(wrapper, { width: 0, height: 300 }, 'contain')).toBe(
      null
    );
    expect(computeFitZoom(wrapper, { width: 800, height: 0 }, 'cover')).toBe(
      null
    );
    expect(computeFitZoom(empty, empty, 'contain')).toBe(null);
  });

  it('returns 1 when the sizes already match', () => {
    const size = { width: 200, height: 100 };
    expect(computeFitZoom(size, size, 'contain')).toBe(1);
    expect(computeFitZoom(size, size, 'cover')).toBe(1);
  });
});

describe('getAxisBounds', () => {
  // Wrapper 400px, container 200px
  it('returns min <= max whether the container is smaller or larger', () => {
    expect(getAxisBounds(400, 200, 1)).toEqual({ min: 0, max: 200 });
    expect(getAxisBounds(400, 200, 4)).toEqual({ min: -100, max: 300 });
  });

  it('collapses to one position when the container fills the wrapper', () => {
    expect(getAxisBounds(400, 200, 2)).toEqual({ min: 100, max: 100 });
  });
});

describe('clampAxisToBounds', () => {
  // Wrapper 400px, container 200px
  it('keeps a smaller zoomed container inside the wrapper', () => {
    // zoom 1: allowed range is [0, 200]
    expect(clampAxisToBounds(-50, 400, 200, 1)).toBe(0);
    expect(clampAxisToBounds(100, 400, 200, 1)).toBe(100);
    expect(clampAxisToBounds(250, 400, 200, 1)).toBe(200);
  });

  it('keeps a larger zoomed container covering the wrapper', () => {
    // zoom 4: zoomed width 800, center-origin offset 300, range [-100, 300]
    expect(clampAxisToBounds(-500, 400, 200, 4)).toBe(-100);
    expect(clampAxisToBounds(0, 400, 200, 4)).toBe(0);
    expect(clampAxisToBounds(500, 400, 200, 4)).toBe(300);
  });

  it('pins the position when the zoomed container fills the wrapper', () => {
    // zoom 2: zoomed width 400 = wrapper, only offset 100 is allowed
    expect(clampAxisToBounds(-50, 400, 200, 2)).toBe(100);
    expect(clampAxisToBounds(250, 400, 200, 2)).toBe(100);
  });
});
