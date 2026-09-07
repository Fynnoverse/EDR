import {cleanVehicleName, getTrainCategory, getTrainImageConfig} from "../trainPresentation";

describe("train presentation", () => {
    it("classifies passenger, freight and service train types", () => {
        expect(getTrainCategory("MPE")).toBe("passenger");
        expect(getTrainCategory("TCE")).toBe("freight");
        expect(getTrainCategory("ZNE")).toBe("service");
    });

    it("falls back to vehicle data for an unknown train type", () => {
        expect(getTrainCategory("???", ["412W/412W:P:50@Coal"])).toBe("freight");
        expect(getTrainCategory("???", ["EN57/EN57-1000"])).toBe("passenger");
    });

    it("turns API vehicle identifiers into compact names", () => {
        expect(cleanVehicleName("11xa/111A_50 51 20-00 608-3 Variant")).toBe("111A 50 51 20-00 608-3");
    });

    it("uses a representative image for an unknown livery of a known family", () => {
        expect(getTrainImageConfig("Traxx/E186-999:G")).toBeDefined();
    });
});
