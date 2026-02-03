# Debug Report: FolderWatcherService errors and start/stop loop

**Date:** 2026-02-02  
**Fix applied:** 2026-02-02 — polling for Windows (UNC + mapped drive), debounced restart, await stop before start.  
**Log source:** `FolderWatcherService` — `UNKNOWN: unknown error, watch` + repeated "File watcher started" / "File watcher stopped"

---

## 1. Observed behavior

- **Phase 1:** Many errors in quick succession:  
  `File watcher error: UNKNOWN: unknown error, watch`
- **Phase 2:** ~10s later, repeated pattern at same timestamp:  
  "Starting file watcher for: Z:\Public\IT-Information Technology Dept\devTest" → "File watcher started successfully" → "File watcher stopped", over and over.

---

## 2. Root causes

### 2.1 Why "UNKNOWN: unknown error, watch"

- Watched path in log: **`Z:\Public\IT-Information Technology Dept\devTest`** → mapped drive (e.g. SMB mount), not UNC.
- In `folder-watcher.service.ts`, polling is enabled only when path **starts with `\\`** (UNC):

```ts
const isUncPath =
  process.platform === "win32" && this.basePath.startsWith("\\\\");
if (isUncPath) {
  watchOptions.usePolling = true;
  // ...
}
```

- So for **Z:** the code uses **native `fs.watch`** (via chokidar). On Windows, native watch on **network/mapped drives** is unreliable and often emits exactly this error (`ENOENT`/UNKNOWN when the underlying handle or path is not fully supported).
- **Conclusion:** The watch target is effectively a network path (mapped drive), but the service treats it as a local path → native watch → repeated "UNKNOWN: unknown error, watch".

### 2.2 Why start/stop repeats in a loop

- On **every** `error` from the watcher, the handler schedules a **restart in 5s**:

```ts
this.watcher.on("error", (error: unknown) => {
  // ...
  setTimeout(() => {
    this.stopWatching();
    this.startWatching();
  }, 5000);
});
```

- There is **no debouncing**: N errors → N `setTimeout` callbacks → N restarts.
- Many errors at 10:22:09 → many restarts fire at 10:22:19. Each restart: `stopWatching()` then `startWatching()`. New watcher is created; it can emit errors again and schedule more restarts.
- `stopWatching()` is **async** but called without `await` in the callback, so multiple restarts can overlap (multiple watchers, multiple timers).
- **Conclusion:** One burst of errors leads to many scheduled restarts; restarts are not throttled and can stack, causing the start/stop storm.

---

## 3. Summary

| Issue                           | Cause                                                                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `UNKNOWN: unknown error, watch` | Native `fs.watch` used on mapped drive `Z:\`; only UNC paths get polling. Network/mapped paths need polling on Windows. |
| Start/stop loop                 | Every error schedules a 5s restart; no debounce/throttle; multiple overlapping restarts.                                |

---

## 4. Suggested fixes (for implementer)

1. **Treat mapped/network drives like UNC:**  
   On Windows, enable polling not only for `path.startsWith("\\\\")` but also when the path is a **mapped drive** (e.g. `Z:\` when Z is a network drive). Simplest approach: on `win32`, **always use polling** for the configured SMB base path, or detect mapped drive (e.g. WMI or try/watch and fallback to polling on first error).

2. **Debounce/throttle restart:**  
   On error, schedule at most one restart (e.g. clear a single “restart” timeout when scheduling; or use a “restart pending” flag and only call `startWatching()` once after a short delay). Avoid N restarts for N errors.

3. **Await stop before start:**  
   In the error handler, use `this.stopWatching().then(() => this.startWatching())` (or async/await) so the new watcher is only created after the old one is fully closed. Reduces overlapping watchers and duplicate events.

4. **Optional:** After K consecutive errors in a short window, back off (e.g. exponential delay) or log once and stop restarting until manual/config change, to avoid log spam and CPU churn.

---

## 5. References

- `apps/api/src/modules/storage/services/folder-watcher.service.ts` (path check ~L91–131, error handler ~L195–204, stop ~L215–220).
- Node/Windows: `fs.watch` on network drives is known to be unreliable; chokidar docs recommend polling for network paths.
