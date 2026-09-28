import { afterEach, describe, expect, it, vi } from 'vitest';
import domPanZoom from '../src/index.js';
import { createFixture, dispatchPageEvent, dispatchWheel } from './helpers.js';

describe('domPanZoom options', () => {
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

  it('panEnabled false removes the grab cursor', () => {
    const { wrapper } = setup({ panEnabled: false });

    expect(wrapper.style.cursor).toBeFalsy();
  });

  it('panEnabled true sets the grab cursor', () => {
    const { wrapper } = setup({ panEnabled: true });

    expect(wrapper.style.cursor).toBe('grab');
  });

  it('zoomEnabled false ignores wheel zoom', () => {
    const { wrapper, instance } = setup({ zoomEnabled: false, initialZoom: 1 });

    dispatchWheel(wrapper, { deltaY: -120 });

    expect(instance.getZoom()).toBe(1);
  });

  it('mouseWheelRequiresKey true blocks wheel zoom without a modifier', () => {
    const { wrapper, instance } = setup({
      mouseWheelRequiresKey: true,
      initialZoom: 1
    });

    dispatchWheel(wrapper, { deltaY: -120 });

    expect(instance.getZoom()).toBe(1);
  });

  it('mouseWheelRequiresKey true allows wheel zoom with a modifier', () => {
    const { instance } = setup({
      mouseWheelRequiresKey: true,
      initialZoom: 1
    });

    expect(
      instance.isMouseWheelZoomAllowed({ altKey: true, ctrlKey: false, metaKey: false, shiftKey: false })
    ).toBe(true);
    expect(
      instance.isMouseWheelZoomAllowed({ altKey: false, ctrlKey: false, metaKey: false, shiftKey: false })
    ).toBe(false);
  });

  it('wheel zoom works when mouseWheelRequiresKey is disabled', () => {
    const { wrapper, instance } = setup({
      mouseWheelRequiresKey: false,
      initialZoom: 1
    });

    dispatchWheel(wrapper, { deltaY: -120 });

    expect(instance.getZoom()).toBeGreaterThan(1);
  });

  it('mouseWheelRequiresKey accepts a custom function', () => {
    const allowWheel = vi.fn(() => false);
    const { wrapper, instance } = setup({
      mouseWheelRequiresKey: allowWheel,
      initialZoom: 1
    });

    dispatchWheel(wrapper, { deltaY: -120 });

    expect(allowWheel).toHaveBeenCalled();
    expect(instance.getZoom()).toBe(1);
  });

  it('dblClickZoomEnabled zooms in at the cursor position', () => {
    const { wrapper, instance } = setup({
      dblClickZoomEnabled: true,
      initialZoom: 1,
      zoomStep: 50
    });

    wrapper.dispatchEvent(
      new MouseEvent('dblclick', {
        clientX: 400,
        clientY: 200,
        bubbles: true,
        cancelable: true
      })
    );

    expect(instance.getZoom()).toBe(1.5);
  });

  it('dblClickZoomEnabled respects zoomEnabled false', () => {
    const { wrapper, instance } = setup({
      dblClickZoomEnabled: true,
      zoomEnabled: false,
      initialZoom: 1
    });

    wrapper.dispatchEvent(
      new MouseEvent('dblclick', {
        clientX: 400,
        clientY: 200,
        bubbles: true,
        cancelable: true
      })
    );

    expect(instance.getZoom()).toBe(1);
  });

  it('does not attach document pan listeners until a drag starts', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    setup();

    const documentEventTypes = addSpy.mock.calls.map(([type]) => type);
    expect(documentEventTypes).not.toContain('mouseup');
    expect(documentEventTypes).not.toContain('touchend');
    expect(documentEventTypes).not.toContain('mousemove');
    expect(documentEventTypes).not.toContain('touchmove');

    addSpy.mockRestore();
  });

  it('attaches document pan listeners on mousedown and removes them on mouseup', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { wrapper } = setup();

    wrapper.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        pageX: 100,
        pageY: 100
      })
    );

    const added = addSpy.mock.calls.map(([type]) => type);
    expect(added).toEqual(expect.arrayContaining(['mousemove', 'mouseup', 'touchmove', 'touchend', 'touchcancel']));

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    const removed = removeSpy.mock.calls.map(([type]) => type);
    expect(removed).toEqual(expect.arrayContaining(['mousemove', 'mouseup', 'touchmove', 'touchend', 'touchcancel']));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('does not run another instance pan cleanup on document mouseup', () => {
    const first = setup({ panEnabled: true });
    const second = setup({ panEnabled: true });

    first.wrapper.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        pageX: 40,
        pageY: 40
      })
    );

    expect(first.instance._documentPanListening).toBe(true);
    expect(second.instance._documentPanListening).toBeFalsy();

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(first.instance._documentPanListening).toBe(false);
    expect(second.wrapper.style.cursor).toBe('grab');
  });

  it('keeps panning on document mousemove after mousedown', () => {
    const { wrapper, instance } = setup({ initialZoom: 1, bounds: false });
    const xBefore = instance.getPosition().x;

    dispatchPageEvent(wrapper, 'mousedown', { pageX: 100, pageY: 100, cancelable: true });
    dispatchPageEvent(document, 'mousemove', { pageX: 100, pageY: 100 });
    dispatchPageEvent(document, 'mousemove', { pageX: 140, pageY: 100 });

    expect(instance.getPosition().x).toBe(xBefore + 40);

    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });

  it('destroy removes in-progress document pan listeners', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { wrapper, instance } = setup();

    wrapper.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        pageX: 100,
        pageY: 100
      })
    );

    instance.destroy();

    const removed = removeSpy.mock.calls.map(([type]) => type);
    expect(removed).toEqual(expect.arrayContaining(['mousemove', 'mouseup', 'touchmove', 'touchend']));
    expect(instance._documentPanListening).toBe(false);

    removeSpy.mockRestore();
  });

  it('destroy removes listeners so a replaced instance respects new options', () => {
    const { wrapper, content, instance: first } = setup({
      zoomEnabled: true,
      initialZoom: 1
    });

    first.destroy();

    const second = new domPanZoom({
      wrapperElement: wrapper,
      panZoomElement: content,
      bounds: false,
      initialZoom: 1,
      center: true,
      transitionSpeed: 0,
      zoomEnabled: false
    });

    dispatchWheel(wrapper, { deltaY: -120 });

    expect(second.getZoom()).toBe(1);
    second.destroy();
  });
});
