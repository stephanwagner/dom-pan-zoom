# Upcoming fixes & improvements

Notes from a JavaScript best-practices review of dom-pan-zoom (post Phase 1 / svgMap compatibility work). Ordered by priority.

---

## High priority — bugs & lifecycle

### 1. Fix math typos in touch/pan helpers — DONE

| Location | Was | Fixed to |
|----------|-----|----------|
| `getTouchEventsDistance` | `ev1.pageX - ev1.pageX` | `ev1.pageX - ev2.pageX` |
| `getTouchEventsCenter` | `ev1.pageY + ev2.pageX` | `ev1.pageY + ev2.pageY` |
| `pan()` vertical step | `container.clientWidth` for height | `container.clientHeight` |

### 2. Fail fast in the constructor — DONE

`getWrapper()` / `getContainer()` now throw a clear `Error` when the option is missing, invalid, or a selector that matches nothing, before `init()` applies styles or attaches listeners.

### 3. Scope document-level listeners to active interaction

Each instance permanently attaches `mouseup` and `touchend` on `document`. With multiple instances on one page, every instance’s handler runs on any document mouseup.

**Better:** attach document listeners only during an active drag/pinch; remove on release. (Partially done for `mousemove` / `touchmove`; `mouseup` / `touchend` still global and permanent.)

### 4. Separate user config from computed state

`adjustMinZoomForBounds()` mutates `this.options.minZoom` / `maxZoom`. That blurs “what the user passed” vs “what bounds math computed”.

**Better:** keep `baseMinZoom` / `baseMaxZoom` (already stored) and use `effectiveMinZoom` / `effectiveMaxZoom` (or recompute in `sanitizeZoom`) without overwriting `this.options`.

---

## Medium priority — API & consistency

### 5. Use `AbortController` in `destroy()`

`destroy()` manually removes eight handler references. **Alternative:** pass `{ signal: this._abort.signal }` to all `addEventListener` calls; `destroy()` calls `this._abort.abort()`. Simpler and harder to leak a listener.

### 6. Guard against double `init()`

Calling `init()` twice (or constructing twice without `destroy()`) stacks listeners again. Add `if (this._initialized) return` or make re-init explicit via a documented `update()` path.

### 7. Standardize overloaded method signatures

Patterns like `zoomIn(true)`, `reset({ zoom: 2 })`, `panLeft(50, true)` are flexible but easy to misuse. Consider options objects consistently before a 1.0 API freeze:

```javascript
zoomIn({ step: 50, instant: true })
```

### 8. Use strict equality

Replace `==` with `===` for `bounds`, `zoom` string checks (`'cover'`, `'contain'`), etc., unless loose equality is intentional.

### 9. Replace side-effect expressions with `if` blocks

Examples in `setPosition` and `pan`:

```javascript
this.x < upperOffsetX && (this.x = upperOffsetX);
direction === 'left' && (this.x += panWidth * -1);
```

Clearer as normal `if` statements for readability and debugging.

### 10. Extract shared bounds / fit math

Fit/contain min-zoom logic appears in `adjustMinZoomForBounds()`, `sanitizeZoom()`, and related clamping in `setPosition()`. A single pure helper (e.g. `computeFitZoom(wrapper, container, mode)`) would reduce drift and is easy to unit test.

### 11. Remove or implement `preferPageScroll`

Option exists in defaults but is not wired up. Either implement (page scroll vs zoom/pan) or remove from defaults and README to avoid confusing library users.

---

## Lower priority — polish & DX

### 12. JSDoc or TypeScript definitions

Public options and methods would benefit from `/** @param ... */` comments or a shipped `.d.ts`. High value for svgMap and other consumers; low implementation cost.

### 13. Class naming

Class is `domPanZoom` (camelCase) rather than conventional `DomPanZoom`. May be intentional for UMD global name — document if so.

### 14. Transform string building

`matrix(...)` via string concat works. Could use `translate() scale()` or template literals; optional `will-change: transform` if jank appears on large content.

### 15. Cache event callback bindings

`fireEvent` calls `.bind(this)` on every invocation. Negligible at current scale; could bind once in constructor if callbacks become hot paths.

---

## Already addressed in Phase 1 (keep)

| Change | Why it matters |
|--------|----------------|
| `destroy()` + stored `_handlers` | Required lifecycle for re-init on same DOM (tester, SPAs) |
| Test for re-init / `zoomEnabled` | Regression coverage for stacked listeners |
| `let` in `zoomInOut` | Fixed `zoomOut()` crash |
| `mouseWheelRequiresKey` as `boolean \| function` | Extensible without forking (svgMap key UI) |
| Vitest + happy-dom | Catches API regressions before publish |

---

## Suggested order of work

1. Fix math typos (#1)
2. Constructor validation (#2)
3. Document listener scoping (#3)
4. Split computed vs user zoom limits (#4)
5. JSDoc on public API (#12)
6. `AbortController` refactor (#5)
7. Remaining consistency items as time allows

---

## Out of scope (for now)

- Full TypeScript rewrite
- Rewriting event model (pointer vs mouse/touch split)
- Breaking API rename (`DomPanZoom`, options object only)
- Playwright / browser E2E (Vitest covers programmatic API sufficiently for now)
