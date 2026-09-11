const controls = [
  'button',
  'input',
  'select',
  'textarea',
  'a[href]',
  'summary',
  '[role="button"]',
  '[contenteditable]:not([contenteditable="false" i])',
].join(',');

const activationEvents = [
  'click',
  'auxclick',
  'dblclick',
  'contextmenu',
  'submit',
  'reset',
  'beforeinput',
  'input',
  'change',
  'dragstart',
  'drop',
];

const nativeNavigationEvents = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'mousedown',
  'mousemove',
  'mouseup',
  'touchstart',
  'touchmove',
  'touchend',
  'wheel',
  'keydown',
  'keyup',
  'keypress',
];

/** Keep native scrolling available while preventing changes in the isolated manual. */
export function installReadOnlyHelpPreview(root: HTMLElement): () => void {
  const document = root.ownerDocument;
  const marked = new Set<Element>();
  const previousMarker = root.getAttribute('data-help-preview-readonly');
  root.setAttribute('data-help-preview-readonly', 'true');

  function markControl(element: Element) {
    if (element.matches(controls) && !element.hasAttribute('inert')) {
      element.setAttribute('inert', '');
      marked.add(element);
    }
  }

  function markTree(node: Node) {
    if (!(node instanceof Element)) return;
    markControl(node);
    node.querySelectorAll(controls).forEach(markControl);
  }

  markTree(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') markTree(record.target);
      else record.addedNodes.forEach(markTree);
    }
  });
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['href', 'role', 'contenteditable'],
  });

  function isPreviewEvent(event: Event) {
    return event.composedPath().includes(root);
  }

  function preventChanges(event: Event) {
    if (!isPreviewEvent(event)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function preserveNativeNavigation(event: Event) {
    if (!isPreviewEvent(event)) return;
    // Do not cancel wheel, touch, scrollbar dragging, keyboard scrolling or Tab.
    // Capture still prevents React handlers on cards from changing preview state.
    event.stopImmediatePropagation();
  }

  activationEvents.forEach((type) => document.addEventListener(type, preventChanges, true));
  nativeNavigationEvents.forEach((type) =>
    document.addEventListener(type, preserveNativeNavigation, { capture: true, passive: true }),
  );

  return () => {
    observer.disconnect();
    activationEvents.forEach((type) => document.removeEventListener(type, preventChanges, true));
    nativeNavigationEvents.forEach((type) =>
      document.removeEventListener(type, preserveNativeNavigation, true),
    );
    marked.forEach((element) => element.removeAttribute('inert'));
    if (previousMarker === null) root.removeAttribute('data-help-preview-readonly');
    else root.setAttribute('data-help-preview-readonly', previousMarker);
  };
}
