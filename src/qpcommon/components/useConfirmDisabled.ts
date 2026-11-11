import { useLayoutEffect, type RefObject } from "react";

/**
 * Disables the confirm button of the @ui Dialog that holds `anchor`, which the Dialog has no prop for yet.
 * Remove once @ui Dialog takes a disabled confirm.
 */
export function useConfirmDisabled(
  anchor: RefObject<HTMLElement | null>,
  disabled: boolean,
) {
  useLayoutEffect(() => {
    const confirm = anchor.current
      ?.closest("dialog")
      ?.querySelector<HTMLButtonElement>(
        ":scope > .ns-dialog-footer > button:last-child",
      );
    if (confirm) confirm.disabled = disabled;
  });
}
