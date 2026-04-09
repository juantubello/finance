type EntryType = "gasto" | "ingreso" | "ahorro";

let switchContainer: HTMLDivElement | null = null;
let switchInput: HTMLInputElement | null = null;
let switchLabel: HTMLLabelElement | null = null;

function ensureIOSSwitchHapticElements() {
  if (typeof document === "undefined") return false;
  if (switchInput && switchLabel) return true;

  switchContainer = document.createElement("div");
  switchContainer.setAttribute("aria-hidden", "true");
  Object.assign(switchContainer.style, {
    position: "fixed",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    opacity: "0",
    pointerEvents: "none",
    bottom: "0",
    left: "0",
    zIndex: "-1",
  });

  switchInput = document.createElement("input");
  switchInput.type = "checkbox";
  switchInput.id = "__ios-haptic-switch";
  switchInput.tabIndex = -1;
  switchInput.setAttribute("switch", "");
  switchInput.setAttribute("aria-hidden", "true");

  switchLabel = document.createElement("label");
  switchLabel.htmlFor = switchInput.id;
  switchLabel.setAttribute("aria-hidden", "true");

  switchContainer.append(switchInput, switchLabel);
  document.body.appendChild(switchContainer);
  return true;
}

function triggerIOSSwitchHaptic() {
  if (!ensureIOSSwitchHapticElements() || !switchInput || !switchLabel) return false;

  try {
    switchInput.checked = !switchInput.checked;
    switchLabel.click();
    return true;
  } catch {
    return false;
  }
}

function triggerNavigatorVibration() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;

  try {
    return navigator.vibrate(24);
  } catch {
    return false;
  }
}

export function triggerSelectionHaptic() {
  // iOS first: rely on the checkbox+switch workaround when available.
  if (triggerIOSSwitchHaptic()) return;

  // Other platforms: use the standard vibration API when available.
  triggerNavigatorVibration();
}

export function triggerEntryTypeSwitchHaptic(current: EntryType, next: EntryType) {
  const isIngresoOrEgreso = next === "gasto" || next === "ingreso";
  if (!isIngresoOrEgreso || current === next) return;
  triggerSelectionHaptic();
}
