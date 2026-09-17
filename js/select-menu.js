import { escapeHtml } from "./html-utils.js?v=shared-ui-2";
import { createPopupController } from "./popup-controller.js?v=shared-ui-2";

export function enhanceSelectMenu(select) {
  if (!select || select.dataset.selectMenuReady === "true") return null;

  select.dataset.selectMenuReady = "true";
  select.hidden = true;

  const root = document.createElement("div");
  root.className = "select-menu";
  root.innerHTML = `
    <button
      id="${escapeHtml(select.id)}Trigger"
      class="select-menu-trigger"
      type="button"
      aria-haspopup="listbox"
      aria-expanded="false"
    >
      <span class="select-menu-value"></span>
      <span class="select-menu-chevron" aria-hidden="true"></span>
    </button>
    <div class="select-menu-popup" role="listbox" hidden></div>
  `;
  select.insertAdjacentElement("afterend", root);

  const trigger = root.querySelector(".select-menu-trigger");
  const value = root.querySelector(".select-menu-value");
  const popup = root.querySelector(".select-menu-popup");
  const labelId = select.dataset.selectLabel;
  if (labelId) trigger.setAttribute("aria-labelledby", `${labelId} ${trigger.id}`);

  function render() {
    const selectedOption = select.options[select.selectedIndex] || select.options[0];
    value.textContent = selectedOption?.textContent || "";
    popup.innerHTML = Array.from(select.options)
      .map((option) => {
        const selected = option.value === select.value;
        return `
          <button
            class="select-menu-option${selected ? " is-selected" : ""}"
            type="button"
            role="option"
            aria-selected="${selected}"
            data-select-value="${escapeHtml(option.value)}"
          >
            <span>${escapeHtml(option.textContent)}</span>
            <span class="select-menu-check" aria-hidden="true">✓</span>
          </button>
        `;
      })
      .join("");
  }

  render();
  const controller = createPopupController({ root, trigger, popup, onOpen: render });
  const observer = new MutationObserver(render);
  const handleNativeChange = () => render();
  observer.observe(select, { childList: true, subtree: true, characterData: true });
  select.addEventListener("change", handleNativeChange);

  popup.addEventListener("click", (event) => {
    const option = event.target.closest("[data-select-value]");
    if (!option) return;

    select.value = option.dataset.selectValue;
    render();
    controller.close();
    select.dispatchEvent(new Event("change", { bubbles: true }));
    trigger.focus();
  });

  return {
    render,
    close: controller.close,
    destroy() {
      observer.disconnect();
      select.removeEventListener("change", handleNativeChange);
      controller.destroy();
      root.remove();
      select.hidden = false;
      delete select.dataset.selectMenuReady;
    }
  };
}
