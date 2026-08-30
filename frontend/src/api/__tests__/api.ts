import {BASE_API_URL, normalizeBaseApiUrl} from "../api";

describe("Invalid configuration will not ship to production", () => {
    it("Base API URL is not localhost", () => {
        expect(BASE_API_URL).not.toBe("http://localhost:8080/")
    })
});

describe("API URL normalization", () => {
    it("adds a missing trailing slash", () => {
        expect(normalizeBaseApiUrl("https://example.com/api")).toBe("https://example.com/api/");
    });

    it("keeps exactly one trailing slash", () => {
        expect(normalizeBaseApiUrl("https://example.com/api///")).toBe("https://example.com/api/");
        expect(normalizeBaseApiUrl("/")).toBe("/");
    });
});
