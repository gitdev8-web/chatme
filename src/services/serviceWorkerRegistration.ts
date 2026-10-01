/**
 * Service Worker Registration and Lifecycle Manager
 * Handles registration, update detection, and controlled activation.
 */

let registrationInstance: ServiceWorkerRegistration | null = null;

export interface SWUpdateEventDetail {
  registration: ServiceWorkerRegistration;
  update: () => void;
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Prevent multiple registrations in the same session
  if (registrationInstance) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registrationInstance = reg;
        console.log('[SW] Registered successfully with scope:', reg.scope);

        // Check if an updated worker is already waiting to activate
        if (reg.waiting) {
          notifyUpdateAvailable(reg);
        }

        // Listen for new service worker installations
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // At this point, new content is available
                notifyUpdateAvailable(reg);
              } else {
                console.log('[SW] Content is precached for offline use.');
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });

    // Handle controller change (when new worker skips waiting)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}

function notifyUpdateAvailable(reg: ServiceWorkerRegistration) {
  const event = new CustomEvent<SWUpdateEventDetail>('devchat-sw-update', {
    detail: {
      registration: reg,
      update: () => triggerUpdate(reg),
    },
  });
  window.dispatchEvent(event);
}

export function triggerUpdate(reg: ServiceWorkerRegistration) {
  // Guard: do not refresh if user is currently typing in an input or textarea
  const activeEl = document.activeElement;
  const isTyping =
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.getAttribute('contenteditable') === 'true');

  if (isTyping) {
    console.log('[SW] User is currently typing, delaying update.');
  }

  if (reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else if (reg.installing) {
    reg.installing.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}
