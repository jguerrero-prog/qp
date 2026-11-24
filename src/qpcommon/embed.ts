// Chat can sit inside another page, such as Neurosift's side panel, as an iframe opened with ?embed=1.
// The flag is read once at load, because the router drops the query when it redirects to /chat.
const params =
  typeof window === "undefined"
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search);

export const isEmbedded =
  params.get("embed") === "1" &&
  typeof window !== "undefined" &&
  window.parent !== window;

const SOURCE = "neurosift-chat";
const HOST = "neurosift-host";

export type ToHost =
  /** A link to Neurosift in an answer; the host shows it in place. */
  | { type: "open-link"; href: string }
  /** Where this conversation lives as a full page, for "Open in full page". */
  | { type: "chat"; href: string; empty: boolean };

export type FromHost = { type: "new-chat" };

export const postToHost = (message: ToHost) =>
  window.parent.postMessage({ source: SOURCE, ...message }, "*");

/** Calls `handler` for messages from the page that embeds the chat. */
export const onHostMessage = (handler: (message: FromHost) => void) => {
  const listener = (event: MessageEvent) => {
    if (event.source !== window.parent || event.data?.source !== HOST) return;
    handler(event.data as FromHost);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
};

/** Links to Neurosift go to the host when embedded; others open in a new tab. */
export const isNeurosiftLink = (href: string | undefined) => {
  if (!href) return false;
  try {
    return /(^|\.)neurosift\.app$/.test(new URL(href).hostname);
  } catch {
    return false;
  }
};

/** This chat as a full page: the same address without embed=1. */
export const fullPageHref = (path: string) => {
  const search = new URLSearchParams(params);
  search.delete("embed");
  const query = search.toString();
  return `${window.location.origin}${path}${query ? `?${query}` : ""}`;
};
