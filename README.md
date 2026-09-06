# domPanZoom

A lightweight library providing mobile friendly panning and zooming to any HTML DOM element.

---

## Demo

[https://stephanwagner.github.io/dom-pan-zoom](https://stephanwagner.github.io/dom-pan-zoom)

---

## Install

### npm

```bash
npm install dom-pan-zoom --save
```

```javascript
import domPanZoom from 'dom-pan-zoom';
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/dom-pan-zoom@latest/dist/dom-pan-zoom.umd.min.js"></script>
```

---

## Usage

You need two HTML DOM elements.\
The panZoom element within a wrapper element:

```html
<div id="my-wrapper">
  <div id="my-container">
    <p>You can add any HTML here<p>
  </div>
</div>
```

Then create a new instance of domPanZoom:

```javascript
new domPanZoom({
  wrapperElement: '#my-wrapper',
  panZoomElement: '#my-container'
});
```

The options `wrapperElement` and `panZoomElement` are required.\
You can use any query selector or the actual DOM element instance.\
If either option is missing, invalid, or a selector that matches no element, the constructor throws an `Error`.

> It is highly recommended to give the `panZoomElement` an actual width and height via CSS to avoid size calculation errors due to DOM drawing issues.

---

## Options

You can pass the following options into domPanZoom:

| Option | Default |  |
| --- | --- | --- |
| `center` | `true` | Start with a centered position. This option overrides `initalPanX` and `initialPanY` |
| `bounds` | `'contain'` | Set this option to `'contain'` or `'cover'` to limit the boundries of the panZoomElement to the wrapperElement. This works similar to the CSS property background-size: contain / cover. Setting this option might effect the option minZoom |
| `minZoom` | `0.1` | Minimum zoom, `0.5` would be half the original size |
| `maxZoom` | `10` | Maximum zoom, `2` would be double the original size |
| `panEnabled` | `true` | Allow user drag/touch panning |
| `zoomEnabled` | `true` | Allow user wheel/pinch/double-click zooming |
| `panStep` | `10` | How many percent to pan by default with the panning methods panLeft, panRight, panUp and panDown |
| `zoomStep` | `50` | How many percent to zoom by default with the methods zoomIn and zoomOut |
| `zoomSpeedWheel` | `1` | The speed in which to zoom when using the mouse wheel |
| `mouseWheelRequiresKey` | `false` | When `true`, wheel zoom requires alt, control, meta, or shift. Pass a function for custom checks |
| `dblClickZoomEnabled` | `false` | Zoom in at the cursor position on double-click |
| `initialZoom` | `'contain'` | Initial zoom level, or `'contain'` / `'cover'` to fit bounds |
| `initialPanX` | `0` | Initial horizontal pan in percent |
| `initialPanY` | `0` | Initial vertical pan in percent |
| `transitionSpeed` | `400` | Transition speed in milliseconds, higher values are slower |

### E.g.

```javascript
new domPanZoom({
  wrapperElement: '#my-wrapper',
  panZoomElement: '#my-container',
  bounds: false,
  minZoom: 1
});
```

---

## Methods

You can use the following methods:

| Getters |  |
| --- | --- |
| `.getPan()` | Returns an object with X and Y values of current pan position. You can pass `true` to get the actual pixel values, e.g. `.getPan(true)` |
| `.getPanX()` | Returns the current horizontal position. You can pass `true` to get the actual pixel values, e.g. `.getPanX(true)` |
| `.getPanY()` | Returns the current vertical position. You can pass `true` to get the actual pixel values, e.g. `.getPanY(true)` |
| `.getZoom()` | Returns the current zoom level |

| Setters |  |
| --- | --- |
| `.panLeft()`<br>`.panRight()`<br>`.panUp()`<br>`.panDown()` | Pan a specific direction. You can pass a number to pan a specific amount (in percent). Pass `true` as first or second argument to pan instantly, e.g. `.panLeft(50)`, `.panRight(true)`, `.panUp(30, true)` |
| `.panTo(x, y)` | Pan to a specific position. The `x` and `y` values are in percent, so `.panTo(50, 50)` will pan to the center. Pass `true` as third argument to pan instantly, e.g. `.panTo(50, 50, true)`
| `.center()` | Pan to centered position. Pass `true` to center instantly, e.g. `.center(true)` |
| `.zoomIn()`<br>`.zoomOut()` | Zoom in and out. You can pass a number to zoom a specific amount (in percent). Pass `true` as first or second argument to zoom instantly, e.g. `.zoomIn(20)`, `.zoomIn(true)`, `.zoomIn(50, true)` |
| `.zoomTo(2)` | Zoom to a specific zoom level. Pass `true` as a second argument to zoom instantly, e.g. `.zoomTo(2, true)` |
| `.zoomToAt(2, { x: 100, y: 50 })` | Zoom to a level while keeping a content point fixed. Pass `{ x, y, percent: true }` for percent coordinates. Pass `true` as third argument to zoom instantly |
| `.reset()` | Reset to the initial zoom and pan. Pass `true` for instant reset, or an options object with `zoom`, `panX`, `panY`, `center`, and `instant` |
| `.resize()` | Recalculate bounds after the wrapper or panZoom element changes size |
| `.destroy()` | Remove all event listeners. Call before creating a new instance on the same wrapper and panZoom element |

### E.g.

```javascript
var myDomPanZoom = new domPanZoom({
  wrapperElement: '#my-wrapper',
  panZoomElement: '#my-container'
});

myDomPanZoom.panTo(20, 80);
```

### Replacing an instance

If you create a new domPanZoom on the same DOM elements, call `destroy()` on the old instance first. Otherwise event listeners stack up and options on the new instance (such as `zoomEnabled`) may appear to be ignored.

```javascript
myDomPanZoom.destroy();

myDomPanZoom = new domPanZoom({
  wrapperElement: '#my-wrapper',
  panZoomElement: '#my-container',
  zoomEnabled: false
});
```

---

## Events

| Event |  |
| --- | --- |
| `onInit` | Triggered once domPanZoom is initialized |
| `onChange` | Triggered when panning or zooming |
| `onZoom` | Triggered when zooming |
| `onPan` | Triggered when panning |

### E.g.

```javascript
new domPanZoom({
  wrapperElement: '#my-wrapper',
  panZoomElement: '#my-container'
  onZoom: function (position) {
    console.log(this.zoom, position);
  }
});
```

---

## Attribution

This library is heavily inspired by https://github.com/anvaka/panzoom.
