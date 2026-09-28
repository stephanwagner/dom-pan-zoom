import domPanZoom from '../src/index.js';

export function setLayoutSize(element, width, height) {
  Object.assign(element.style, {
    width: `${width}px`,
    height: `${height}px`
  });

  for (const prop of ['offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight']) {
    Object.defineProperty(element, prop, {
      configurable: true,
      get() {
        return prop.includes('Width') ? width : height;
      }
    });
  }
}

export function createFixture(options = {}) {
  const wrapper = document.createElement('div');
  const content = document.createElement('div');

  Object.assign(wrapper.style, {
    position: 'relative',
    overflow: 'hidden'
  });

  setLayoutSize(wrapper, 800, 400);
  setLayoutSize(content, 800, 400);

  Object.defineProperty(content, 'offsetLeft', {
    configurable: true,
    value: 0
  });
  Object.defineProperty(content, 'offsetTop', {
    configurable: true,
    value: 0
  });

  wrapper.appendChild(content);
  document.body.appendChild(wrapper);

  const instance = new domPanZoom({
    wrapperElement: wrapper,
    panZoomElement: content,
    bounds: false,
    initialZoom: 1,
    center: true,
    transitionSpeed: 0,
    ...options
  });

  return {
    wrapper,
    content,
    instance,
    destroy() {
      instance.destroy();
      wrapper.remove();
    }
  };
}

export function getTransform(content) {
  const match = content.style.transform.match(
    /matrix\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/
  );

  if (!match) {
    return null;
  }

  return {
    scaleX: parseFloat(match[1]),
    scaleY: parseFloat(match[4]),
    translateX: parseFloat(match[5]),
    translateY: parseFloat(match[6])
  };
}

export function dispatchPageEvent(target, type, { pageX = 0, pageY = 0, cancelable = true } = {}) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable
  });
  Object.defineProperty(event, 'pageX', { configurable: true, value: pageX });
  Object.defineProperty(event, 'pageY', { configurable: true, value: pageY });
  target.dispatchEvent(event);
  return event;
}

export function dispatchWheel(
  target,
  { deltaY = -100, altKey = false, clientX = 400, clientY = 200 } = {}
) {
  const event = new WheelEvent('wheel', {
    deltaY,
    altKey,
    clientX,
    clientY,
    bubbles: true,
    cancelable: true
  });

  target.dispatchEvent(event);
  return event;
}
