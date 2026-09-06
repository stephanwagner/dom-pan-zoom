export default class domPanZoom {
  constructor(options = {}) {
    const defaultOptions = {
      // The wrapper and container element
      // You can use an element object or a selector string
      wrapperElement: null,
      panZoomElement: null,

      // Start with a centered position
      // This option overrides options initalPanX and initialPanY
      center: true,

      // Setting the option bounds to 'contain' or 'cover' limits the boundries of the panZoomElement to the wrapperElement
      // This works similar to the CSS property 'background-size: contain / cover'
      // Disable bound by setting this option to 'false'
      // This option might effect the option minZoom
      bounds: 'contain',

      // Minimum and maximum zoom
      minZoom: 0.1,
      maxZoom: 10,

      // Enable or disable user panning and zooming
      panEnabled: true,
      zoomEnabled: true,

      // How many percent to pan by default with the panning methods panLeft, panRight, panUp and panDown
      panStep: 10,

      // How many percent to zoom by default with the methods zoomIn and zoomOut
      zoomStep: 50,

      // The speed in which to zoom when using mouse wheel
      zoomSpeedWheel: 1,

      // When true or a function, require a modifier key before wheel zoom
      mouseWheelRequiresKey: false,

      // Zoom in on double-click
      dblClickZoomEnabled: false,

      // The speed in which to zoom when pinching with touch gestures
      // TODO this seems to not work correctly
      zoomSpeedPinch: 4,

      // Initial zoom
      // Use any zoom value between the options minZoom and maxZoom
      // Use 'cover' or 'contain' to limit the panZoomElement bounds to the wrapperElement
      initialZoom: 'contain',

      // Initial pan in percent
      // The option 'center' has to be 'false' for initial panning to work
      initialPanX: 0,
      initialPanY: 0,

      // Prefer scrolling the page to zooming with mousewheel or panning with touch event
      // TODO how does google do it with tough events (use two fingers) ??
      preferPageScroll: true,

      // The text to show when the option preferPageScroll is enabled
      preferPageScrollText: {
        // TODO Differentiate between mac and windows
      },

      // Transition speed for panning and zooming in milliseconds
      // Higher values are slower
      transitionSpeed: 400,

      // Events
      onInit: null,
      onChange: null,
      onZoom: null,
      onPan: null
    };

    this.options = Object.assign({}, defaultOptions, options);

    this.init();
  }

  // Initialize
  init() {
    // Init containers
    const wrapper = this.getWrapper();
    const container = this.getContainer();

    // Add styles
    this.updateInteractionCursor();
    wrapper.style.overflow = 'hidden';

    // Cache
    this.evCache = [];
    this.pinchDiffCache = 0;
    this.pinchMoveCache = null;

    // Attach events
    this.attachEvents();

    // Store base zoom limits before bounds adjustment
    this.baseMinZoom = this.options.minZoom;
    this.baseMaxZoom = this.options.maxZoom;
    this.adjustMinZoomForBounds();

    // Set initial zoom
    this.zoom = this.sanitizeZoom(this.options.initialZoom);

    // Set initial pan
    this.x = this.options.initialPanX;
    this.y = this.options.initialPanY;

    // Set position
    if (this.options.center) {
      this.center(true);
    } else {
      this.panTo(this.options.initialPanX, this.options.initialPanY, true);
    }

    // Trigger event
    this.fireEvent('onInit', this.getPosition());
  }

  // Update the wrapper cursor based on panEnabled
  updateInteractionCursor() {
    const wrapper = this.getWrapper();
    if (!wrapper) {
      return;
    }

    wrapper.style.cursor = this.options.panEnabled ? 'grab' : '';
  }

  // Check whether wheel zoom is allowed for the current event
  isMouseWheelZoomAllowed(ev) {
    const requirement = this.options.mouseWheelRequiresKey;
    if (!requirement) {
      return true;
    }
    if (typeof requirement === 'function') {
      return requirement(ev);
    }
    return ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey;
  }

  // Fire an event from the options
  fireEvent(event, pass) {
    this.options[event] && this.options[event].bind(this)(pass);
  }

  // Recalculate minZoom from bounds and the configured base minZoom
  adjustMinZoomForBounds() {
    this.options.minZoom = this.baseMinZoom;
    this.options.maxZoom = this.baseMaxZoom;

    if (!this.options.bounds) {
      return;
    }

    const wrapper = this.getWrapper();
    const container = this.getContainer();
    if (!wrapper || !container) {
      return;
    }

    const maxWidth = wrapper.clientWidth;
    const maxHeight = wrapper.clientHeight;
    const panZoomWidth = container.clientWidth;
    const panZoomHeight = container.clientHeight;

    if (!panZoomWidth || !panZoomHeight) {
      return;
    }

    const minZoomX = maxWidth / panZoomWidth;
    const minZoomY = maxHeight / panZoomHeight;

    if (this.options.bounds == 'cover') {
      this.options.minZoom = Math.max(
        this.options.minZoom,
        minZoomX,
        minZoomY
      );
    } else {
      this.options.minZoom = Math.max(
        this.options.minZoom,
        Math.min(minZoomX, minZoomY)
      );
    }
  }

  // Recalculate bounds after the wrapper or panZoom element changes size
  resize() {
    const zoom = this.zoom;
    this.adjustMinZoomForBounds();
    this.zoom = this.sanitizeZoom(zoom);
    this.setPosition(true);
    return this;
  }

  // Attach events
  attachEvents() {
    // Event while mouse moving
    const setPositionEvent = (ev) => {
      if (this.blockPan == true || !this.options.panEnabled) {
        return;
      }

      let event = ev;
      if (ev.touches && ev.touches.length) {
        event = ev.touches[0];
      }

      let movementX = 0;
      let movementY = 0;

      if (this.previousEvent) {
        movementX = event.pageX - this.previousEvent.pageX;
        movementY = event.pageY - this.previousEvent.pageY;
      }

      this.x += movementX;
      this.y += movementY;
      this.setPosition(true);

      this.previousEvent = event;

      // Trigger event
      this.fireEvent('onPan', this.getPosition());
    };

    // Mouse down or touchstart event
    const mouseDownTouchStartEvent = (ev) => {
      if (!this.options.panEnabled) {
        return;
      }

      ev.preventDefault();
      document.body.style.cursor = 'grabbing';
      this.getWrapper().style.cursor = 'grabbing';
      document.addEventListener('mousemove', setPositionEvent, {
        passive: true
      });
      document.addEventListener('touchmove', setPositionEvent, {
        passive: true
      });
    };

    this.getWrapper().addEventListener('mousedown', mouseDownTouchStartEvent, {
      passive: false
    });

    this.getWrapper().addEventListener('touchstart', mouseDownTouchStartEvent, {
      passive: false
    });

    const mouseUpTouchEndEvent = () => {
      this.previousEvent = null;
      document.body.style.cursor = null;
      this.updateInteractionCursor();
      document.removeEventListener('mousemove', setPositionEvent, {
        passive: true
      });
      document.removeEventListener('touchmove', setPositionEvent, {
        passive: true
      });
    };

    document.addEventListener('mouseup', mouseUpTouchEndEvent, {
      passive: true
    });
    document.addEventListener('touchend', mouseUpTouchEndEvent, {
      passive: true
    });

    // Mouse wheel events
    const mouseWheelEvent = (ev) => {
      if (!this.options.zoomEnabled) {
        return;
      }

      if (!this.isMouseWheelZoomAllowed(ev)) {
        return;
      }

      ev.preventDefault();

      // Delta
      let delta = ev.deltaY;
      if (ev.deltaMode > 0) {
        delta *= 100;
      }

      // Speed
      const speed = this.options.zoomSpeedWheel;

      // Adjust speed (https://github.com/anvaka/panzoom/blob/master/index.js#L884)
      const sign = Math.sign(delta);
      const deltaAdjustedSpeed = 1 - sign * Math.min(0.25, Math.abs((speed * delta) / 128));
      const nextZoom = this.sanitizeZoom(this.zoom * deltaAdjustedSpeed);

      // Get offset to center, then adjust
      const offsetToCenter = this.getEventOffsetToCenter(ev);
      this.adjustPositionByZoom(nextZoom, offsetToCenter.x, offsetToCenter.y);

      // Update position
      this.zoom = nextZoom;
      this.setPosition(true);

      // Trigger event
      this.fireEvent('onZoom', this.getPosition());
    };

    this.getWrapper().addEventListener('wheel', mouseWheelEvent, {
      passive: false
    });

    const doubleClickEvent = (ev) => {
      if (!this.options.dblClickZoomEnabled || !this.options.zoomEnabled) {
        return;
      }

      ev.preventDefault();

      const zoomStep = (100 + this.options.zoomStep) / 100;
      const nextZoom = this.sanitizeZoom(this.zoom * zoomStep);
      const offsetToCenter = this.getEventOffsetToCenter(ev);
      this.adjustPositionByZoom(nextZoom, offsetToCenter.x, offsetToCenter.y);
      this.zoom = nextZoom;
      this.setPosition(true);
      this.fireEvent('onZoom', this.getPosition());
    };

    this.getWrapper().addEventListener('dblclick', doubleClickEvent, {
      passive: false
    });

    // Pinch events
    const pointerDownEvent = (ev) => {
      this.evCache.push(ev);
      this.zoomCache = this.zoom;
      this.xCache = this.x;
      this.yCache = this.y;

      if (this.evCache.length == 2) {
        this.blockPan = true;
        this.pinchDiffCache = this.getTouchEventsDistance(
          this.evCache[0],
          this.evCache[1]
        );
        this.touchEventsCenterCache = this.getTouchEventsCenter(
          this.evCache[0],
          this.evCache[1]
        );
      }
    };

    this.getWrapper().addEventListener('pointerdown', pointerDownEvent, {
      passive: false
    });

    const pointerMoveEvent = (ev) => {
      for (let i = 0; i < this.evCache.length; i++) {
        if (ev.pointerId == this.evCache[i].pointerId) {
          this.evCache[i] = ev;
          break;
        }
      }

      // Proceed if two touch gestures detected
      if (this.evCache.length == 2 && this.options.zoomEnabled) {
        // Calculate distance between fingers
        let pinchDiff = this.getTouchEventsDistance(
          this.evCache[0],
          this.evCache[1]
        );
        pinchDiff -= this.pinchDiffCache;

        let pinchDiffPercent = pinchDiff / this.getContainer().clientWidth;
        pinchDiffPercent *= this.options.zoomSpeedPinch;
        pinchDiffPercent += 1;

        const nextZoom = this.sanitizeZoom(this.zoomCache * pinchDiffPercent);

        // Get offset to center, then adjust
        const touchEventsCenter = this.getTouchEventsCenter(
          this.evCache[0],
          this.evCache[1]
        );
        const offsetToCenter = this.getEventOffsetToCenter({
          target: this.evCache[0].target,
          clientX: touchEventsCenter.clientX,
          clientY: touchEventsCenter.clientY
        });
        this.adjustPositionByZoom(nextZoom, offsetToCenter.x, offsetToCenter.y);

        // Adjust position when moving while pinching
        const touchEventsCenterDiff = {
          x: touchEventsCenter.clientX - this.touchEventsCenterCache.clientX,
          y: touchEventsCenter.clientY - this.touchEventsCenterCache.clientY
        };
        this.x = this.xCache + touchEventsCenterDiff.x;
        this.y = this.yCache + touchEventsCenterDiff.y;

        // Update position
        this.zoom = nextZoom;
        this.setPosition(true);

        // Trigger events
        this.fireEvent('onZoom', this.getPosition());
        this.fireEvent('onPan', this.getPosition());
      }
    };

    this.getWrapper().addEventListener('pointermove', pointerMoveEvent, {
      passive: false
    });

    const pointerUpEvent = (ev) => {
      for (var i = 0; i < this.evCache.length; i++) {
        if (this.evCache[i].pointerId == ev.pointerId) {
          this.evCache.splice(i, 1);
          break;
        }
      }

      if (this.evCache.length < 2) {
        this.blockPan = false;
      }
    };

    ['pointerup', 'pointercancel', 'pointerout', 'pointerleave'].forEach(
      (event) => {
        this.getWrapper().addEventListener(event, pointerUpEvent, {
          passive: false
        });
      }
    );

    this._handlers = {
      setPositionEvent,
      mouseDownTouchStartEvent,
      mouseUpTouchEndEvent,
      mouseWheelEvent,
      doubleClickEvent,
      pointerDownEvent,
      pointerMoveEvent,
      pointerUpEvent
    };
  }

  // Remove event listeners so the instance can be replaced safely
  destroy() {
    if (this._destroyed) {
      return this;
    }

    const wrapper = this.getWrapper();
    const handlers = this._handlers;

    if (wrapper && handlers) {
      wrapper.removeEventListener('mousedown', handlers.mouseDownTouchStartEvent);
      wrapper.removeEventListener('touchstart', handlers.mouseDownTouchStartEvent);
      wrapper.removeEventListener('wheel', handlers.mouseWheelEvent);
      wrapper.removeEventListener('dblclick', handlers.doubleClickEvent);
      wrapper.removeEventListener('pointerdown', handlers.pointerDownEvent);
      wrapper.removeEventListener('pointermove', handlers.pointerMoveEvent);

      ['pointerup', 'pointercancel', 'pointerout', 'pointerleave'].forEach(
        (event) => {
          wrapper.removeEventListener(event, handlers.pointerUpEvent);
        }
      );
    }

    if (handlers) {
      document.removeEventListener('mouseup', handlers.mouseUpTouchEndEvent);
      document.removeEventListener('touchend', handlers.mouseUpTouchEndEvent);
      document.removeEventListener('mousemove', handlers.setPositionEvent);
      document.removeEventListener('touchmove', handlers.setPositionEvent);
    }

    this._destroyed = true;
    return this;
  }

  // https://stackoverflow.com/questions/8389156/what-substitute-should-we-use-for-layerx-layery-since-they-are-deprecated-in-web
  getEventOffsetToParent(ev) {
    let el = ev.target;
    let x = 0;
    let y = 0;

    while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
      x += el.offsetLeft - el.scrollLeft;
      y += el.offsetTop - el.scrollTop;
      el = el.offsetParent;
    }

    x = ev.clientX - x;
    y = ev.clientY - y;

    return { x: x, y: y };
  }

  // Get the event offset to the center
  getEventOffsetToCenter(ev) {
    const wrapper = this.getWrapper();
    const container = this.getContainer();
    const diffX = wrapper.clientWidth - container.clientWidth;
    const diffY = wrapper.clientHeight - container.clientHeight;
    const centerX = diffX * 0.5;
    const centerY = diffY * 0.5;

    const offsetToCenter = {
      x: 0,
      y: 0
    };

    if (ev) {
      const offsetToParent = this.getEventOffsetToParent(ev);
      offsetToCenter.x =
        (wrapper.clientWidth / 2 - offsetToParent.x - window.scrollX) * -1;
      offsetToCenter.y =
        (wrapper.clientHeight / 2 - offsetToParent.y - window.scrollY) * -1;
    }

    const offsetX = this.x - centerX - offsetToCenter.x;
    const offsetY = this.y - centerY - offsetToCenter.y;

    return {
      x: offsetX,
      y: offsetY
    };
  }

  // Get the offset for zooming while keeping a content point fixed on screen
  getContentPointOffsetToCenter(contentX, contentY) {
    const wrapper = this.getWrapper();
    const container = this.getContainer();
    const diffX = wrapper.clientWidth - container.clientWidth;
    const diffY = wrapper.clientHeight - container.clientHeight;
    const centerX = diffX * 0.5;
    const centerY = diffY * 0.5;

    const pointInWrapperX = container.offsetLeft + contentX;
    const pointInWrapperY = container.offsetTop + contentY;

    const offsetToCenter = {
      x: (wrapper.clientWidth / 2 - pointInWrapperX) * -1,
      y: (wrapper.clientHeight / 2 - pointInWrapperY) * -1
    };

    const offsetX = this.x - centerX - offsetToCenter.x;
    const offsetY = this.y - centerY - offsetToCenter.y;

    return {
      x: offsetX,
      y: offsetY
    };
  }

  // Get the distance between two touch events
  getTouchEventsDistance(ev1, ev2) {
    return Math.abs(Math.hypot(ev1.pageX - ev2.pageX, ev1.pageY - ev2.pageY));
  }

  // Get the center point between two touch events
  getTouchEventsCenter(ev1, ev2) {
    return {
      pageX: (ev1.pageX + ev2.pageX) / 2,
      pageY: (ev1.pageY + ev2.pageY) / 2,
      clientX: (ev1.clientX + ev2.clientX) / 2,
      clientY: (ev1.clientY + ev2.clientY) / 2
    };
  }

  // Get current position values
  getPosition() {
    return {
      zoom: this.zoom,
      x: this.x,
      y: this.y
    };
  }

  // Initialize
  setPosition(instant) {
    this.transition(!instant);

    // Fit to bounds
    if (this.options.bounds) {
      const wrapper = this.getWrapper();
      const container = this.getContainer();
      const wrapperWidth = wrapper.clientWidth;
      const wrapperHeight = wrapper.clientHeight;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const containerZoomWidth = containerWidth * this.zoom;
      const containerZoomHeight = containerHeight * this.zoom;

      const upperOffsetX = (containerWidth / 2) * (this.zoom - 1);
      const lowerOffsetX = upperOffsetX * -1 + wrapperWidth - containerWidth;

      if (containerZoomWidth < wrapperWidth) {
        this.x < upperOffsetX && (this.x = upperOffsetX);
        this.x > lowerOffsetX && (this.x = lowerOffsetX);
      } else {
        this.x = Math.min(this.x, upperOffsetX);
        this.x = Math.max(this.x, lowerOffsetX);
      }

      const upperOffsetY = (containerHeight / 2) * (this.zoom - 1);
      const lowerOffsetY = upperOffsetY * -1 + wrapperHeight - containerHeight;

      if (containerZoomHeight < wrapperHeight) {
        this.y < upperOffsetY && (this.y = upperOffsetY);
        this.y > lowerOffsetY && (this.y = lowerOffsetY);
      } else {
        this.y = Math.min(this.y, upperOffsetY);
        this.y = Math.max(this.y, lowerOffsetY);
      }
    }

    // Set position
    this.getContainer().style.transform =
      'matrix(' +
      this.zoom +
      ', 0, 0, ' +
      this.zoom +
      ', ' +
      this.x +
      ', ' +
      this.y +
      ')';

    // Trigger event
    this.fireEvent('onChange', this.getPosition());

    // Return instance
    return this;
  }

  // Sanitize zoom value
  sanitizeZoom(zoom) {
    // Get values for 'cover' and 'contain'
    if (zoom == 'cover' || zoom == 'contain') {
      const wrapper = this.getWrapper();
      const container = this.getContainer();

      const maxWidth = wrapper.clientWidth;
      const maxHeight = wrapper.clientHeight;

      const panZoomWidth = container.clientWidth;
      const panZoomHeight = container.clientHeight;

      const minZoomX = maxWidth / panZoomWidth;
      const minZoomY = maxHeight / panZoomHeight;

      // TODO is first cebter OK?
      this.center(true, true);

      if (zoom == 'cover') {
        zoom = Math.max(minZoomX, minZoomY);
      } else {
        zoom = Math.min(minZoomX, minZoomY);
      }
    }

    // Adjust for minZoom
    if (zoom < this.options.minZoom) {
      zoom = this.options.minZoom;
    }

    // Adjust for maxZoom
    if (zoom > this.options.maxZoom) {
      zoom = this.options.maxZoom;
    }

    return zoom;
  }

  // Getter for zoom
  getZoom() {
    return this.zoom;
  }

  // Reset to the initial zoom and pan position
  reset(arg) {
    let instant = false;
    let zoom = this.options.initialZoom;
    let panX = this.options.initialPanX;
    let panY = this.options.initialPanY;
    let useCenter = this.options.center;

    if (typeof arg === 'boolean') {
      instant = arg;
    } else if (arg && typeof arg === 'object') {
      instant = arg.instant === true;
      if (arg.zoom !== undefined) {
        zoom = arg.zoom;
      }
      if (arg.panX !== undefined) {
        panX = arg.panX;
        useCenter = false;
      }
      if (arg.panY !== undefined) {
        panY = arg.panY;
        useCenter = false;
      }
      if (arg.center !== undefined) {
        useCenter = arg.center;
      }
    }

    this.zoom = this.sanitizeZoom(zoom);

    if (useCenter) {
      this.center(true, true);
    } else {
      this.panTo(panX, panY, true, true);
    }

    this.setPosition(instant);
    this.fireEvent('onZoom', this.getPosition());
    this.fireEvent('onPan', this.getPosition());
    return this;
  }

  // Zoom to
  zoomTo(zoom, instant) {
    // Sanitize zoom
    zoom = this.sanitizeZoom(zoom);

    // Get offset to center, then adjust
    const offsetToCenter = this.getEventOffsetToCenter();
    this.adjustPositionByZoom(zoom, offsetToCenter.x, offsetToCenter.y);

    // Set new zoom
    this.zoom = zoom;
    this.setPosition(instant);

    // Trigger event
    this.fireEvent('onZoom', this.getPosition());

    // Return instance
    return this;
  }

  // Zoom to a level while keeping a content point fixed on screen
  zoomToAt(zoom, point, instant) {
    zoom = this.sanitizeZoom(zoom);

    const container = this.getContainer();
    const contentX = point.percent
      ? (point.x / 100) * container.clientWidth
      : point.x;
    const contentY = point.percent
      ? (point.y / 100) * container.clientHeight
      : point.y;

    const offsetToCenter = this.getContentPointOffsetToCenter(
      contentX,
      contentY
    );
    this.adjustPositionByZoom(zoom, offsetToCenter.x, offsetToCenter.y);
    this.zoom = zoom;
    this.setPosition(instant);

    this.fireEvent('onZoom', this.getPosition());
    return this;
  }

  // Zoom in
  zoomIn(step, instant) {
    return this.zoomInOut(step, instant, 'in');
  }

  // Zoom out
  zoomOut(step, instant) {
    return this.zoomInOut(step, instant, 'out');
  }

  // Zoom in or out
  zoomInOut(step, instant, direction) {
    // Step is an optional attribute
    if (step === true || step === false) {
      instant = step;
      step = null;
    }
    step = step || this.options.zoomStep;

    // Calculate nextZoom
    const currentZoom = this.zoom;
    let zoomStep = (100 + step) / 100;
    if (direction === 'out') {
      zoomStep = 1 / zoomStep;
    }
    const nextZoom = currentZoom * zoomStep;

    // Update zoom
    return this.zoomTo(nextZoom, instant);
  }

  // Adjust position when zooming
  adjustPositionByZoom(zoom, x, y) {
    const currentZoom = this.zoom;
    const zoomGrowth = (zoom - currentZoom) / currentZoom;

    const container = this.getContainer();
    const maxOffsetX = container.clientWidth * 0.5 * currentZoom;
    const maxOffsetY = container.clientHeight * 0.5 * currentZoom;

    x > maxOffsetX && (x = Math.min(x, maxOffsetX));
    x < maxOffsetX * -1 && (x = Math.max(x, maxOffsetX * -1));

    y > maxOffsetY && (y = Math.min(y, maxOffsetY));
    y < maxOffsetY * -1 && (y = Math.max(y, maxOffsetY * -1));

    this.x += x * zoomGrowth;
    this.y += y * zoomGrowth;
  }

  // Center container within wrapper
  center(instant, ignorePosition) {
    return this.panTo(50, 50, instant, ignorePosition);
  }

  // Getters for pan
  getPan(pixelValues) {
    return {
      x: this.getPanX(pixelValues),
      y: this.getPanY(pixelValues)
    };
  }

  getPanX(pixelValues) {
    const wrapper = this.getWrapper();
    const container = this.getContainer();
    let panX = wrapper.clientWidth * 0.5 + this.x * -1;
    panX += (this.zoom - 1) * (container.clientWidth * 0.5);
    const percentX = (panX / (container.clientWidth * this.zoom)) * 100;
    return pixelValues ? panX : percentX;
  }

  getPanY(pixelValues) {
    const wrapper = this.getWrapper();
    const container = this.getContainer();
    let panY = wrapper.clientHeight * 0.5 + this.y * -1;
    panY += (this.zoom - 1) * (container.clientHeight * 0.5);
    const percentY = (panY / (container.clientHeight * this.zoom)) * 100;
    return pixelValues ? panY : percentY;
  }

  // Pan to position
  panTo(x, y, instant, ignorePosition) {
    const wrapper = this.getWrapper();
    const container = this.getContainer();

    let panX = ((container.clientWidth * this.zoom * x) / 100) * -1;
    panX += (this.zoom - 1) * (container.clientWidth * 0.5);
    panX += wrapper.clientWidth * 0.5;

    let panY = ((container.clientHeight * this.zoom * y) / 100) * -1;
    panY += (this.zoom - 1) * (container.clientHeight * 0.5);
    panY += wrapper.clientHeight * 0.5;

    this.x = panX;
    this.y = panY;

    // Update position
    if (!ignorePosition) {
      this.setPosition(instant);
    }

    // Trigger event
    this.fireEvent('onPan', this.getPosition());

    // Return instance
    return this;
  }

  panLeft(step, instant) {
    return this.pan(step, instant, 'left');
  }

  panRight(step, instant) {
    return this.pan(step, instant, 'right');
  }

  panUp(step, instant) {
    return this.pan(step, instant, 'up');
  }

  panDown(step, instant) {
    return this.pan(step, instant, 'down');
  }

  pan(step, instant, direction) {
    if (step === true || step === false) {
      instant = step;
      step = null;
    }
    step = step || this.options.panStep;

    const container = this.getContainer();
    const panWidth = ((container.clientWidth * step) / 100) * this.zoom;
    const panHeight = ((container.clientHeight * step) / 100) * this.zoom;

    direction === 'left' && (this.x += panWidth * -1);
    direction === 'right' && (this.x += panWidth);
    direction === 'up' && (this.y += panHeight * -1);
    direction === 'down' && (this.y += panHeight);

    // Update position
    this.setPosition(instant);

    // Trigger event
    this.fireEvent('onPan', this.getPosition());

    // Return instance
    return this;
  }

  // Get the wrapper element
  getWrapper() {
    // Return element if it is cached
    if (this.wrapperElement) {
      return this.wrapperElement;
    }

    // Abort if option is empty
    if (!this.options.wrapperElement) {
      throw new Error('The option wrapperElement is required.');
    }

    // Find the element if selector provided
    if (typeof this.options.wrapperElement === 'string') {
      this.options.wrapperElement = document.querySelector(
        this.options.wrapperElement
      );
    }

    // Cache element if valid
    if (
      this.options.wrapperElement &&
      this.options.wrapperElement instanceof Element
    ) {
      this.wrapperElement = this.options.wrapperElement;
      return this.options.wrapperElement;
    }

    throw new Error(
      'The option wrapperElement needs to be a valid selector string or an instance of Element.'
    );
  }

  // Get the container element
  getContainer() {
    // Return element if it is cached
    if (this.containerElement) {
      return this.containerElement;
    }

    // Abort if option is empty
    if (!this.options.panZoomElement) {
      throw new Error('The option panZoomElement is required.');
    }

    // Find the element if selector provided
    if (typeof this.options.panZoomElement === 'string') {
      this.options.panZoomElement = document.querySelector(
        this.options.panZoomElement
      );
    }

    // Cache element if valid
    if (
      this.options.panZoomElement &&
      this.options.panZoomElement instanceof Element
    ) {
      this.containerElement = this.options.panZoomElement;
      return this.options.panZoomElement;
    }

    throw new Error(
      'The option panZoomElement needs to be a valid selector string or an instance of Element.'
    );
  }

  // Enable or disable transitions
  transition(enabled) {
    this.getContainer().style.transition = enabled
      ? 'transform ' + this.options.transitionSpeed + 'ms'
      : null;
  }
}
