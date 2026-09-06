import { afterEach, describe, expect, it, vi } from 'vitest';
import domPanZoom from '../src/index.js';
import { createFixture, getTransform, setLayoutSize } from './helpers.js';

describe('domPanZoom API', () => {
  /** @type {ReturnType<typeof createFixture>[]} */
  const fixtures = [];

  afterEach(() => {
    while (fixtures.length) {
      fixtures.pop().destroy();
    }
  });

  function setup(options) {
    const fixture = createFixture(options);
    fixtures.push(fixture);
    return fixture;
  }

  it('initializes with the configured zoom and centered pan', () => {
    const { instance } = setup({ initialZoom: 1.5 });

    expect(instance.getZoom()).toBe(1.5);
    expect(instance.getPan().x).toBeCloseTo(50, 1);
    expect(instance.getPan().y).toBeCloseTo(50, 1);
  });

  it('reset restores the initial zoom and pan', () => {
    const { instance } = setup({ initialZoom: 1.5 });

    instance.zoomTo(3, true);
    instance.panTo(20, 80, true);

    instance.reset(true);

    expect(instance.getZoom()).toBe(1.5);
    expect(instance.getPan().x).toBeCloseTo(50, 1);
    expect(instance.getPan().y).toBeCloseTo(50, 1);
  });

  it('reset accepts option overrides', () => {
    const { instance } = setup({ initialZoom: 1, center: false, initialPanX: 10, initialPanY: 20 });

    instance.reset({ zoom: 2, panX: 30, panY: 40, instant: true });

    expect(instance.getZoom()).toBe(2);
    expect(instance.getPan().x).toBeCloseTo(30, 1);
    expect(instance.getPan().y).toBeCloseTo(40, 1);
  });

  it('resize reclamps zoom when bounds minZoom increases', () => {
    const { wrapper, content, instance } = setup({
      bounds: 'contain',
      minZoom: 0.1,
      initialZoom: 1
    });

    setLayoutSize(wrapper, 400, 200);
    setLayoutSize(content, 800, 400);

    instance.resize();
    const zoomAfterShrink = instance.getZoom();

    expect(zoomAfterShrink).toBeGreaterThanOrEqual(0.5);
    expect(getTransform(content)).not.toBeNull();
  });

  it('zoomToAt changes zoom while updating the transform', () => {
    const { content, instance } = setup({ initialZoom: 1 });

    const before = getTransform(content);
    instance.zoomToAt(2, { x: 100, y: 50 }, true);
    const after = getTransform(content);

    expect(instance.getZoom()).toBe(2);
    expect(after.scaleX).toBe(2);
    expect(after.translateX).not.toBe(before.translateX);
    expect(after.translateY).not.toBe(before.translateY);
  });

  it('zoomToAt accepts percent coordinates', () => {
    const { instance } = setup({ initialZoom: 1 });

    instance.zoomToAt(2, { x: 25, y: 50, percent: true }, true);

    expect(instance.getZoom()).toBe(2);
  });

  it('zoomIn and zoomOut change zoom relative to zoomStep', () => {
    const { instance } = setup({ initialZoom: 1, zoomStep: 50 });

    instance.zoomIn(true);
    expect(instance.getZoom()).toBe(1.5);

    instance.zoomOut(true);
    expect(instance.getZoom()).toBe(1);
  });

  describe('constructor validation', () => {
    it('throws when wrapperElement is missing', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(
        () =>
          new domPanZoom({
            panZoomElement: document.createElement('div')
          })
      ).toThrow('The option wrapperElement is required.');

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('throws when panZoomElement is missing', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(
        () =>
          new domPanZoom({
            wrapperElement: document.createElement('div')
          })
      ).toThrow('The option panZoomElement is required.');

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('throws when a selector matches no element', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(
        () =>
          new domPanZoom({
            wrapperElement: '#missing-wrapper',
            panZoomElement: document.createElement('div')
          })
      ).toThrow(
        'The option wrapperElement needs to be a valid selector string or an instance of Element.'
      );

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('throws when an option is not a selector string or Element', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(
        () =>
          new domPanZoom({
            wrapperElement: document.createElement('div'),
            panZoomElement: 42
          })
      ).toThrow(
        'The option panZoomElement needs to be a valid selector string or an instance of Element.'
      );

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
