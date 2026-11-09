/**
 * Zoom level: a number (1 is the original size) or `'cover'` / `'contain'`
 * to fit the panZoom element to the wrapper.
 * @typedef {number | 'cover' | 'contain'} DomPanZoomZoom
 */

/**
 * Current zoom and translation of the panZoom element.
 * @typedef {object} DomPanZoomPosition
 * @property {number} zoom Current zoom level.
 * @property {number} x Horizontal translation in pixels.
 * @property {number} y Vertical translation in pixels.
 */

/**
 * Event callback. Called with `this` set to the domPanZoom instance.
 * @callback DomPanZoomEventCallback
 * @this {domPanZoom}
 * @param {DomPanZoomPosition} position Position after the change.
 * @returns {void}
 */

/**
 * Options for the domPanZoom constructor. Only `wrapperElement` and
 * `panZoomElement` are required.
 * @typedef {object} DomPanZoomOptions
 * @property {Element | string} wrapperElement The wrapper element, or a
 *   selector for it. The wrapper clips the panZoom element.
 * @property {Element | string} panZoomElement The element to pan and zoom,
 *   or a selector for it.
 * @property {boolean} [center=true] Start with a centered position. Overrides
 *   `initialPanX` and `initialPanY`.
 * @property {'contain' | 'cover' | false} [bounds='contain'] Limit the
 *   panZoom element to the wrapper, similar to CSS `background-size`. Can
 *   raise the effective minimum zoom, see {@link domPanZoom#getMinZoom}.
 *   `false` disables bounds.
 * @property {number} [minZoom=0.1] Minimum zoom.
 * @property {number} [maxZoom=10] Maximum zoom.
 * @property {boolean} [panEnabled=true] Allow panning by mouse drag or touch.
 * @property {boolean} [zoomEnabled=true] Allow zooming by wheel, pinch or
 *   double-click.
 * @property {number} [panStep=10] Default step in percent for `panLeft()`,
 *   `panRight()`, `panUp()` and `panDown()`.
 * @property {number} [zoomStep=50] Default step in percent for `zoomIn()`
 *   and `zoomOut()`.
 * @property {number} [zoomSpeedWheel=1] Mouse wheel zoom speed.
 * @property {boolean | ((ev: WheelEvent) => boolean)} [mouseWheelRequiresKey=false]
 *   When `true`, wheel zoom requires alt, ctrl, meta or shift. A function
 *   receives the wheel event and returns whether to zoom.
 * @property {boolean} [dblClickZoomEnabled=false] Zoom in at the cursor on
 *   double-click.
 * @property {number} [zoomSpeedPinch=4] Pinch zoom speed.
 * @property {DomPanZoomZoom} [initialZoom='contain'] Initial zoom level.
 * @property {number} [initialPanX=0] Initial horizontal pan in percent.
 *   Ignored while `center` is `true`.
 * @property {number} [initialPanY=0] Initial vertical pan in percent.
 *   Ignored while `center` is `true`.
 * @property {number} [transitionSpeed=400] Transition duration in
 *   milliseconds for non-instant pans and zooms.
 * @property {DomPanZoomEventCallback | null} [onInit=null] Called once after
 *   initialization.
 * @property {DomPanZoomEventCallback | null} [onChange=null] Called whenever
 *   the position is applied.
 * @property {DomPanZoomEventCallback | null} [onZoom=null] Called after zooming.
 * @property {DomPanZoomEventCallback | null} [onPan=null] Called after panning.
 */

/**
 * Pan and zoom any DOM element inside a wrapper element.
 */
export default class domPanZoom {
  /**
   * Create an instance and initialize it.
   * @param {DomPanZoomOptions} options
   * @throws {Error} When `wrapperElement` or `panZoomElement` is missing, is
   *   not an Element, or is a selector that matches nothing.
   */
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

    // Minimum zoom required by bounds, computed in adjustMinZoomForBounds()
    this.boundsMinZoom = 0;

    this.init();
  }

  /**
   * Initialize the instance. The constructor calls this. Has no effect on an
   * initialized instance, so listeners are never attached twice. After
   * {@link domPanZoom#destroy}, attaches the listeners again and reapplies
   * the initial zoom and pan.
   * @returns {this}
   */
  init() {
    if (this._initialized) {
      return this;
    }

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
    this.previousEvent = null;
    this.blockPan = false;

    // Attach events
    this.attachEvents();
    this._initialized = true;

    // Compute the minimum zoom required by bounds
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

    return this;
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
    if (this.options[event]) {
      this.options[event].bind(this)(pass);
    }
  }

  // Recalculate the minimum zoom required by bounds, leaving this.options
  // untouched (getMinZoom combines both)
  adjustMinZoomForBounds() {
    this.boundsMinZoom = 0;

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

    if (this.options.bounds === 'cover') {
      this.boundsMinZoom = Math.max(minZoomX, minZoomY);
    } else {
      this.boundsMinZoom = Math.min(minZoomX, minZoomY);
    }
  }

  /**
   * Recalculate bounds after the wrapper or panZoom element changes size, or
   * after changing `options.bounds`. Clamps the current zoom and position to
   * the new limits.
   * @returns {this}
   */
  resize() {
    const zoom = this.zoom;
    this.adjustMinZoomForBounds();
    this.zoom = this.sanitizeZoom(zoom);
    this.setPosition(true);
    return this;
  }

  // Attach events
  attachEvents() {
    // Aborting this signal in destroy() removes every listener below
    this._abort = new AbortController();
    const { signal } = this._abort;

    // Event while mouse moving
    const setPositionEvent = (ev) => {
      if (this.blockPan === true || !this.options.panEnabled) {
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

    let mouseUpTouchEndEvent;

    const addDocumentPanListeners = () => {
      if (this._documentPanListening) {
        return;
      }

      this._documentPanListening = true;
      document.addEventListener('mousemove', setPositionEvent, {
        passive: true,
        signal
      });
      document.addEventListener('touchmove', setPositionEvent, {
        passive: true,
        signal
      });
      document.addEventListener('mouseup', mouseUpTouchEndEvent, {
        passive: true,
        signal
      });
      document.addEventListener('touchend', mouseUpTouchEndEvent, {
        passive: true,
        signal
      });
      document.addEventListener('touchcancel', mouseUpTouchEndEvent, {
        passive: true,
        signal
      });
    };

    const removeDocumentPanListeners = () => {
      if (!this._documentPanListening) {
        return;
      }

      this._documentPanListening = false;
      document.removeEventListener('mousemove', setPositionEvent);
      document.removeEventListener('touchmove', setPositionEvent);
      document.removeEventListener('mouseup', mouseUpTouchEndEvent);
      document.removeEventListener('touchend', mouseUpTouchEndEvent);
      document.removeEventListener('touchcancel', mouseUpTouchEndEvent);
    };

    mouseUpTouchEndEvent = () => {
      this.previousEvent = null;
      document.body.style.cursor = null;
      this.updateInteractionCursor();
      removeDocumentPanListeners();
    };

    // Mouse down or touchstart event
    const mouseDownTouchStartEvent = (ev) => {
      if (!this.options.panEnabled) {
        return;
      }

      ev.preventDefault();
      document.body.style.cursor = 'grabbing';
      this.getWrapper().style.cursor = 'grabbing';
      addDocumentPanListeners();
    };

    this.getWrapper().addEventListener('mousedown', mouseDownTouchStartEvent, {
      passive: false,
      signal
    });

    this.getWrapper().addEventListener('touchstart', mouseDownTouchStartEvent, {
      passive: false,
      signal
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
      passive: false,
      signal
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
      passive: false,
      signal
    });

    // Pinch events
    const pointerDownEvent = (ev) => {
      this.evCache.push(ev);
      this.zoomCache = this.zoom;
      this.xCache = this.x;
      this.yCache = this.y;

      if (this.evCache.length === 2) {
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
      passive: false,
      signal
    });

    const pointerMoveEvent = (ev) => {
      for (let i = 0; i < this.evCache.length; i++) {
        if (ev.pointerId === this.evCache[i].pointerId) {
          this.evCache[i] = ev;
          break;
        }
      }

      // Proceed if two touch gestures detected
      if (this.evCache.length === 2 && this.options.zoomEnabled) {
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
      passive: false,
      signal
    });

    const pointerUpEvent = (ev) => {
      for (var i = 0; i < this.evCache.length; i++) {
        if (this.evCache[i].pointerId === ev.pointerId) {
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
          passive: false,
          signal
        });
      }
    );
  }

  /**
   * Remove all event listeners and reset the cursors. Call before creating a
   * new instance on the same elements. {@link domPanZoom#init} re-initializes
   * a destroyed instance.
   * @returns {this}
   */
  destroy() {
    if (!this._initialized) {
      return this;
    }

    // Aborting removes the mouseup handler, so reset a mid-drag cursor here
    if (this._documentPanListening) {
      document.body.style.cursor = '';
    }
    this.getWrapper().style.cursor = '';

    this._abort.abort();
    this._abort = null;
    this._documentPanListening = false;
    this._initialized = false;
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

  /**
   * Get the current zoom and translation.
   * @returns {DomPanZoomPosition}
   */
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
        if (this.x < upperOffsetX) {
          this.x = upperOffsetX;
        }
        if (this.x > lowerOffsetX) {
          this.x = lowerOffsetX;
        }
      } else {
        this.x = Math.min(this.x, upperOffsetX);
        this.x = Math.max(this.x, lowerOffsetX);
      }

      const upperOffsetY = (containerHeight / 2) * (this.zoom - 1);
      const lowerOffsetY = upperOffsetY * -1 + wrapperHeight - containerHeight;

      if (containerZoomHeight < wrapperHeight) {
        if (this.y < upperOffsetY) {
          this.y = upperOffsetY;
        }
        if (this.y > lowerOffsetY) {
          this.y = lowerOffsetY;
        }
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
    if (zoom === 'cover' || zoom === 'contain') {
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

      if (zoom === 'cover') {
        zoom = Math.max(minZoomX, minZoomY);
      } else {
        zoom = Math.min(minZoomX, minZoomY);
      }
    }

    // Adjust for minZoom
    const minZoom = this.getMinZoom();
    if (zoom < minZoom) {
      zoom = minZoom;
    }

    // Adjust for maxZoom
    const maxZoom = this.getMaxZoom();
    if (zoom > maxZoom) {
      zoom = maxZoom;
    }

    return zoom;
  }

  /**
   * Get the current zoom level.
   * @returns {number}
   */
  getZoom() {
    return this.zoom;
  }

  /**
   * Get the effective minimum zoom. Bounds can raise it above
   * `options.minZoom` so the content still fits, but it never exceeds
   * {@link domPanZoom#getMaxZoom}, which wins when the two conflict.
   * @returns {number}
   */
  getMinZoom() {
    return Math.min(
      Math.max(this.options.minZoom, this.boundsMinZoom),
      this.getMaxZoom()
    );
  }

  /**
   * Get the maximum zoom (the current `maxZoom` option).
   * @returns {number}
   */
  getMaxZoom() {
    return this.options.maxZoom;
  }

  /**
   * Reset to the initial zoom and pan from the options.
   * @param {boolean | object} [arg] `true` to reset instantly, or an object
   *   that overrides the initial values.
   * @param {DomPanZoomZoom} [arg.zoom] Zoom to reset to.
   * @param {number} [arg.panX] Horizontal pan in percent. Turns off centering.
   * @param {number} [arg.panY] Vertical pan in percent. Turns off centering.
   * @param {boolean} [arg.center] Center the content. Takes precedence over
   *   `panX` and `panY`.
   * @param {boolean} [arg.instant=false] Skip the transition.
   * @returns {this}
   */
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

  /**
   * Zoom to a level, keeping the center of the wrapper fixed.
   * @param {DomPanZoomZoom} zoom Target zoom, clamped to the zoom limits.
   * @param {boolean} [instant=false] Skip the transition.
   * @returns {this}
   */
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

  /**
   * Zoom to a level while keeping a point of the content fixed on screen.
   * @param {DomPanZoomZoom} zoom Target zoom, clamped to the zoom limits.
   * @param {object} point Point in the unzoomed panZoom element.
   * @param {number} point.x Horizontal coordinate, in pixels or percent.
   * @param {number} point.y Vertical coordinate, in pixels or percent.
   * @param {boolean} [point.percent=false] Read `x` and `y` as percent of the
   *   panZoom element's size.
   * @param {boolean} [instant=false] Skip the transition.
   * @returns {this}
   */
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

  /**
   * Zoom in by a percentage of the current zoom.
   * @param {number | boolean} [step=options.zoomStep] Step in percent. Pass a
   *   boolean here instead to use the default step and set `instant`.
   * @param {boolean} [instant=false] Skip the transition.
   * @returns {this}
   */
  zoomIn(step, instant) {
    return this.zoomInOut(step, instant, 'in');
  }

  /**
   * Zoom out by a percentage of the current zoom.
   * @param {number | boolean} [step=options.zoomStep] Step in percent. Pass a
   *   boolean here instead to use the default step and set `instant`.
   * @param {boolean} [instant=false] Skip the transition.
   * @returns {this}
   */
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

    if (x > maxOffsetX) {
      x = maxOffsetX;
    }
    if (x < -maxOffsetX) {
      x = -maxOffsetX;
    }

    if (y > maxOffsetY) {
      y = maxOffsetY;
    }
    if (y < -maxOffsetY) {
      y = -maxOffsetY;
    }

    this.x += x * zoomGrowth;
    this.y += y * zoomGrowth;
  }

  /**
   * Center the panZoom element within the wrapper.
   * @param {boolean} [instant=false] Skip the transition.
   * @param {boolean} [ignorePosition=false] Internal: update `x` and `y`
   *   without applying the position.
   * @returns {this}
   */
  center(instant, ignorePosition) {
    return this.panTo(50, 50, instant, ignorePosition);
  }

  /**
   * Get the point of the content at the center of the wrapper.
   * @param {boolean} [pixelValues=false] Return pixels in the zoomed content
   *   instead of percent.
   * @returns {{ x: number, y: number }}
   */
  getPan(pixelValues) {
    return {
      x: this.getPanX(pixelValues),
      y: this.getPanY(pixelValues)
    };
  }

  /**
   * Get the horizontal component of {@link domPanZoom#getPan}.
   * @param {boolean} [pixelValues=false] Return pixels instead of percent.
   * @returns {number}
   */
  getPanX(pixelValues) {
    const wrapper = this.getWrapper();
    const container = this.getContainer();
    let panX = wrapper.clientWidth * 0.5 + this.x * -1;
    panX += (this.zoom - 1) * (container.clientWidth * 0.5);
    const percentX = (panX / (container.clientWidth * this.zoom)) * 100;
    return pixelValues ? panX : percentX;
  }

  /**
   * Get the vertical component of {@link domPanZoom#getPan}.
   * @param {boolean} [pixelValues=false] Return pixels instead of percent.
   * @returns {number}
   */
  getPanY(pixelValues) {
    const wrapper = this.getWrapper();
    const container = this.getContainer();
    let panY = wrapper.clientHeight * 0.5 + this.y * -1;
    panY += (this.zoom - 1) * (container.clientHeight * 0.5);
    const percentY = (panY / (container.clientHeight * this.zoom)) * 100;
    return pixelValues ? panY : percentY;
  }

  /**
   * Pan so the given point of the content is at the center of the wrapper.
   * @param {number} x Horizontal position in percent (50 is the center).
   * @param {number} y Vertical position in percent (50 is the center).
   * @param {boolean} [instant=false] Skip the transition.
   * @param {boolean} [ignorePosition=false] Internal: update `x` and `y`
   *   without applying the position.
   * @returns {this}
   */
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

  /**
   * Pan left by a percentage of the panZoom element's width.
   * @param {number | boolean} [step=options.panStep] Step in percent. Pass a
   *   boolean here instead to use the default step and set `instant`.
   * @param {boolean} [instant=false] Skip the transition.
   * @returns {this}
   */
  panLeft(step, instant) {
    return this.pan(step, instant, 'left');
  }

  /**
   * Pan right by a percentage of the panZoom element's width.
   * @param {number | boolean} [step=options.panStep] Step in percent. Pass a
   *   boolean here instead to use the default step and set `instant`.
   * @param {boolean} [instant=false] Skip the transition.
   * @returns {this}
   */
  panRight(step, instant) {
    return this.pan(step, instant, 'right');
  }

  /**
   * Pan up by a percentage of the panZoom element's height.
   * @param {number | boolean} [step=options.panStep] Step in percent. Pass a
   *   boolean here instead to use the default step and set `instant`.
   * @param {boolean} [instant=false] Skip the transition.
   * @returns {this}
   */
  panUp(step, instant) {
    return this.pan(step, instant, 'up');
  }

  /**
   * Pan down by a percentage of the panZoom element's height.
   * @param {number | boolean} [step=options.panStep] Step in percent. Pass a
   *   boolean here instead to use the default step and set `instant`.
   * @param {boolean} [instant=false] Skip the transition.
   * @returns {this}
   */
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

    if (direction === 'left') {
      this.x -= panWidth;
    } else if (direction === 'right') {
      this.x += panWidth;
    } else if (direction === 'up') {
      this.y -= panHeight;
    } else if (direction === 'down') {
      this.y += panHeight;
    }

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
