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

  it('cover / contain fall back to zoom 1 while content is unmeasured', () => {
    const { content, instance } = setup({ bounds: 'contain', minZoom: 0.1 });

    // e.g. the element is inside a hidden (display: none) parent
    setLayoutSize(content, 0, 0);
    instance.resize();

    for (const zoom of ['contain', 'cover']) {
      instance.reset({ zoom, instant: true });

      expect(instance.getZoom()).toBe(1);
      expect(instance.getMinZoom()).toBe(0.1);
      expect(Number.isFinite(instance.x)).toBe(true);
      expect(Number.isFinite(instance.y)).toBe(true);
    }
  });

  it('getPanBounds returns null without bounds', () => {
    const { instance } = setup({ bounds: false });

    expect(instance.getPanBounds()).toBe(null);
  });

  it('getPanBounds matches where panning gets clamped', () => {
    // Wrapper and content are both 800x400
    const { instance } = setup({ bounds: 'contain', initialZoom: 2 });

    expect(instance.getPanBounds()).toEqual({
      minX: -400,
      maxX: 400,
      minY: -200,
      maxY: 200
    });

    for (let i = 0; i < 20; i++) instance.panLeft(true);
    for (let i = 0; i < 20; i++) instance.panUp(true);
    expect([instance.x, instance.y]).toEqual([-400, -200]);

    for (let i = 0; i < 20; i++) instance.panRight(true);
    for (let i = 0; i < 20; i++) instance.panDown(true);
    expect([instance.x, instance.y]).toEqual([400, 200]);
  });

  it('getPanBounds locks both axes when the content exactly fits', () => {
    const { instance } = setup({ bounds: 'contain', initialZoom: 1 });

    expect(instance.getPanBounds()).toEqual({
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0
    });
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

  it('bounds raise the effective minZoom without mutating options', () => {
    const { content, instance } = setup({
      bounds: 'contain',
      minZoom: 0.1,
      maxZoom: 5,
      initialZoom: 1
    });

    expect(instance.getMinZoom()).toBe(1);
    expect(instance.getMaxZoom()).toBe(5);
    expect(instance.options.minZoom).toBe(0.1);
    expect(instance.options.maxZoom).toBe(5);

    setLayoutSize(content, 1600, 800);
    instance.resize();

    expect(instance.getMinZoom()).toBe(0.5);
    expect(instance.options.minZoom).toBe(0.1);
  });

  it('effective zoom limits match options when bounds are disabled', () => {
    const { instance } = setup({ bounds: false, minZoom: 0.2, maxZoom: 4 });

    expect(instance.getMinZoom()).toBe(0.2);
    expect(instance.getMaxZoom()).toBe(4);
  });

  it('cover bounds raise the effective minZoom to fill the wrapper', () => {
    const { content, instance } = setup({ bounds: 'cover', minZoom: 0.1 });

    setLayoutSize(content, 1600, 400);
    instance.resize();

    expect(instance.getMinZoom()).toBe(1);
    expect(instance.options.minZoom).toBe(0.1);
  });

  it('effective minZoom never exceeds maxZoom when bounds need more', () => {
    const { content, instance } = setup({ bounds: 'cover', maxZoom: 1 });

    setLayoutSize(content, 400, 400);
    instance.resize();

    expect(instance.getMinZoom()).toBe(1);
    expect(instance.getMaxZoom()).toBe(1);
    expect(instance.getZoom()).toBe(instance.getMinZoom());
  });

  it('getMinZoom returns the minZoom option before bounds are computed', () => {
    let minZoomDuringInit;
    class Probe extends domPanZoom {
      // attachEvents() runs in init() before adjustMinZoomForBounds()
      attachEvents() {
        minZoomDuringInit = this.getMinZoom();
        super.attachEvents();
      }
    }

    const { wrapper, content } = setup();
    const probe = new Probe({ wrapperElement: wrapper, panZoomElement: content, minZoom: 0.3 });
    probe.destroy();

    expect(minZoomDuringInit).toBe(0.3);
  });

  it('zoom option changes apply without calling resize', () => {
    const { instance } = setup({ bounds: false, minZoom: 0.1, maxZoom: 10 });

    instance.options.maxZoom = 2;
    instance.zoomTo(5, true);
    expect(instance.getZoom()).toBe(2);

    instance.options.minZoom = 0.5;
    instance.zoomTo(0.2, true);
    expect(instance.getZoom()).toBe(0.5);
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
