const mockRenderToBuffer = jest.fn();
const mockListCommits = jest.fn();

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

jest.mock("@sindresorhus/slugify", () => jest.fn((value: string) => value.toLowerCase().replace(/\s+/g, "-")));

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

import { readJson } from "fs-extra";
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
});
