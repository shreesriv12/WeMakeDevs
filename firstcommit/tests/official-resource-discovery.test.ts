import { describe, expect, it, vi } from "vitest";
vi.mock("../lib/serpapi", () => ({ searchWeb: vi.fn().mockResolvedValue([]) }));
import { searchWeb } from "../lib/serpapi";
import { discoverOfficialResources } from "../lib/official-resource-discovery";
describe("official resource discovery", () => { it("uses the governed search adapter with a purpose-specific query", async () => { await discoverOfficialResources("binary lifting", "prerequisites"); expect(searchWeb).toHaveBeenCalledWith(expect.stringContaining("official foundational prerequisites")); }); });
