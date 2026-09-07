import {render, screen} from "@testing-library/react";
import {DirectionIndicator, DirectionTextContext} from "../../components/Cells/DirectionIndicator";
import {StationId} from "../../../enums/stationId";

describe("DirectionIndicator", () => {
    const pointId = String(StationId.belchow);

    it("distinguishes arrival from the right and departure to the left despite identical movement arrows", () => {
        render(<DirectionTextContext.Provider value={true}>
            <DirectionIndicator pointId={pointId} adjacentPostId={String(StationId.skierniewice_s_pzs)} relation="from" />
            <DirectionIndicator pointId={pointId} adjacentPostId={String(StationId.lowicz_glowny_pzs_r12)} relation="to" />
        </DirectionTextContext.Provider>);
        const arrival = screen.getByRole("img", {name: /^Einfahrt von rechts/});
        const departure = screen.getByRole("img", {name: /^Ausfahrt nach links/});
        expect(arrival).toHaveTextContent("von rechts");
        expect(departure).toHaveTextContent("nach links");
        expect(arrival).toHaveClass("text-teal-400");
        expect(departure).toHaveClass("text-orange-400");
        expect(arrival.querySelector("path")?.getAttribute("d")).toBe(departure.querySelector("path")?.getAttribute("d"));
    });

    it("labels arrival and departure on the same side explicitly with opposite movement arrows", () => {
        render(<DirectionTextContext.Provider value={true}>
            <DirectionIndicator pointId={pointId} adjacentPostId={String(StationId.bobrowniki)} relation="from" />
            <DirectionIndicator pointId={pointId} adjacentPostId={String(StationId.lowicz_glowny)} relation="to" />
        </DirectionTextContext.Provider>);
        const arrival = screen.getByRole("img", {name: /^Einfahrt von links/});
        const departure = screen.getByRole("img", {name: /^Ausfahrt nach links/});
        expect(arrival).toHaveTextContent("von links");
        expect(departure).toHaveTextContent("nach links");
        expect(arrival.querySelector("path")?.getAttribute("d")).not.toBe(departure.querySelector("path")?.getAttribute("d"));
        expect(departure).toHaveAttribute("title", expect.stringContaining("unterschiedliche Gleise oder Strecken"));
    });

    it("does not invent a direction for unknown neighbors", () => {
        const {container} = render(<DirectionIndicator pointId={pointId} adjacentPostId="-1" relation="from" />);
        expect(container).toBeEmptyDOMElement();
    });

    it("defaults to arrows only and toggles text without changing the color or movement", () => {
        const indicator = <DirectionIndicator pointId={pointId} adjacentPostId={String(StationId.bobrowniki)} relation="from" />;
        const {rerender} = render(indicator);
        const arrow = screen.getByRole("img", {name: /^Einfahrt von links/});
        const path = arrow.querySelector("path")?.getAttribute("d");
        expect(arrow).not.toHaveTextContent("von links");
        expect(arrow).toHaveClass("text-orange-400");
        rerender(<DirectionTextContext.Provider value={true}>{indicator}</DirectionTextContext.Provider>);
        expect(screen.getByRole("img")).toHaveTextContent("von links");
        expect(screen.getByRole("img")).toHaveClass("text-orange-400");
        expect(screen.getByRole("img").querySelector("path")?.getAttribute("d")).toBe(path);
        rerender(<DirectionTextContext.Provider value={false}>{indicator}</DirectionTextContext.Provider>);
        expect(screen.getByRole("img")).not.toHaveTextContent("von links");
    });
});
