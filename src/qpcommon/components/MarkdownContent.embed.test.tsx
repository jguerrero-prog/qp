import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const postToHost = vi.fn();
vi.mock("../embed", async (actual) => ({
  ...(await actual<typeof import("../embed")>()),
  isEmbedded: true,
  postToHost: (message: unknown) => postToHost(message),
}));

const { default: MarkdownContent } = await import("./MarkdownContent");
const { fullPageHref, isNeurosiftLink } = await import("../embed");

const NWB =
  "https://neurosift.app/nwb?dandisetId=000673&dandisetVersion=draft&path=sub-1/sub-1_ses-1_ecephys+image.nwb";

describe("MarkdownContent in Neurosift's panel", () => {
  it("sends links to Neurosift to the host instead of opening a tab", () => {
    render(
      <MarkdownContent
        content={`[sub-1_ses-1](${NWB}) and [DANDI](https://dandiarchive.org)`}
      />,
    );
    const nwb = screen.getByRole("link", { name: "sub-1_ses-1" });
    expect(fireEvent.click(nwb)).toBe(false);
    expect(postToHost).toHaveBeenCalledWith({ type: "open-link", href: NWB });
    postToHost.mockClear();
    expect(fireEvent.click(screen.getByRole("link", { name: "DANDI" }))).toBe(
      true,
    );
    expect(postToHost).not.toHaveBeenCalled();
  });

  it("leaves a Cmd- or Ctrl-click to the browser", () => {
    render(<MarkdownContent content={`[file](${NWB})`} />);
    fireEvent.click(screen.getByRole("link", { name: "file" }), {
      metaKey: true,
    });
    expect(postToHost).not.toHaveBeenCalled();
  });
});

describe("embed helpers", () => {
  it("knows Neurosift's addresses", () => {
    expect(isNeurosiftLink(NWB)).toBe(true);
    expect(isNeurosiftLink("https://v3.neurosift.app/dandiset/000673")).toBe(
      true,
    );
    expect(isNeurosiftLink("https://notneurosift.app/x")).toBe(false);
    expect(isNeurosiftLink("not a url")).toBe(false);
  });

  it("gives the full-page address without embed=1", () => {
    expect(fullPageHref("/qp/chat/abc")).toBe(
      `${window.location.origin}/qp/chat/abc`,
    );
  });
});
