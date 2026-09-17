export function createPopupController({ root, trigger, popup, onOpen = () => {}, blurOnEscape = false }) {
  if (!root || !trigger || !popup) {
    return { open() {}, close() {}, toggle() {}, destroy() {} };
  }

  function open() {
    onOpen();
    popup.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
  }

  function close() {
    popup.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
  }

  function toggle() {
    if (popup.hidden) open();
    else close();
  }

  function handleDocumentClick(event) {
    if (!root.contains(event.target)) close();
  }

  function handleKeydown(event) {
    if (event.key !== "Escape" || popup.hidden) return;
    close();
    if (blurOnEscape) trigger.blur();
    else trigger.focus();
  }

  function destroy() {
    trigger.removeEventListener("click", toggle);
    document.removeEventListener("click", handleDocumentClick);
    document.removeEventListener("keydown", handleKeydown);
  }

  trigger.addEventListener("click", toggle);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeydown);

  return { open, close, toggle, destroy };
}
