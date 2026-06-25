const mockRenderToBuffer = jest.fn();
const mockListCommits = jest.fn();
const mockSlugify = jest.fn((value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s:/.-]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
);

jest.mock("chartjs-node-canvas", () => ({
  ChartJSNodeCanvas: jest.fn().mockImplementation(() => ({
    renderToBuffer: mockRenderToBuffer,
  })),
}));

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: {
      listCommits: mockListCommits,
    },
  })),
}));

jest.mock("@sindresorhus/slugify", () => mockSlugify);

jest.mock("fs-extra", () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  ensureFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(""),
  readJson: jest.fn(),
  writeFile: jest.fn().mockResolvedValue(undefined),
  writeJson: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("js-yaml", () => ({
  load: jest.fn(),
}));

import { ensureDir, readJson, writeJson } from "fs-extra";
import { load } from "js-yaml";
import { generateGraphs } from "./index";

describe("generateGraphs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (load as jest.Mock).mockReturnValue({
      owner: "upptime",
      repo: "status",
      sites: [{ name: "Example Site" }],
    });
    (readJson as jest.Mock).mockResolvedValue([
      {
        name: "Example Site",
        slug: "example-site",
        status: "up",
        uptime: "100",
        uptimeDay: "100",
        uptimeWeek: "100",
        uptimeMonth: "100",
        uptimeYear: "100",
        time: 123,
        timeDay: 123,
        timeWeek: 123,
        timeMonth: 123,
        timeYear: 123,
      },
    ]);
    mockListCommits.mockResolvedValue({
      data: [
        {
          commit: {
            author: { date: "2026-06-24T00:00:00Z" },
            message: "🟩 Example Site is up (200 in 123 ms) [skip ci] [upptime]",
          },
        },
      ],
    });
    mockRenderToBuffer.mockResolvedValue(Buffer.from("png"));
  });

  it("renders response-time graphs without point markers", async () => {
    await generateGraphs();

    expect(mockRenderToBuffer).toHaveBeenCalledTimes(5);
    for (const [chartConfig] of mockRenderToBuffer.mock.calls) {
      expect(chartConfig.options.elements.point).toEqual({
        radius: 0,
        hoverRadius: 0,
        hitRadius: 0,
      });
    }
  });

  it("uses Unicode site names when slugify cannot produce an ASCII slug", async () => {
    (load as jest.Mock).mockReturnValue({
      owner: "upptime",
      repo: "status",
      sites: [{ name: "鸭鸭梨", url: "https://example.com" }],
    });
    (readJson as jest.Mock).mockResolvedValue([
      {
        name: "鸭鸭梨",
        slug: "鸭鸭梨",
        status: "up",
        uptime: "99.9",
        uptimeDay: "100",
        uptimeWeek: "99.9",
        uptimeMonth: "99.9",
        uptimeYear: "99.9",
        time: 234,
        timeDay: 234,
        timeWeek: 234,
        timeMonth: 234,
        timeYear: 234,
      },
    ]);
    mockListCommits.mockResolvedValue({
      data: [
        {
          commit: {
            author: { date: "2026-06-24T00:00:00Z" },
            message: "🟩 鸭鸭梨 is up (200 in 234 ms) [skip ci] [upptime]",
          },
        },
      ],
    });

    await generateGraphs();

    expect(mockSlugify).toHaveBeenCalledWith("鸭鸭梨");
    expect(ensureDir).toHaveBeenCalledWith("api/鸭鸭梨");
    expect(writeJson).toHaveBeenCalledWith(
      "api/鸭鸭梨/uptime.json",
      expect.objectContaining({ message: "99.9%" })
    );
    expect(mockListCommits).toHaveBeenCalledWith(
      expect.objectContaining({ path: "history/鸭鸭梨.yml" })
    );
  });
});
