export const fieldMessageId = (id: string) => `${id}-message`;

/** The aria props that tie a control to its field's message. */
export const fieldAria = (id: string, helper?: string, error?: string) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": (error ?? helper) ? fieldMessageId(id) : undefined,
});
