import {render, screen} from "@testing-library/react";
import {DirectionIndicator, DirectionTextContext} from "../../components/Cells/DirectionIndicator";
import {StationId} from "../../../enums/stationId";

describe("DirectionIndicator", () => {
    const pointId = String(StationId.belchow);

    it("distinguishes arrival from the right and departure to the left despite identical movement arrows", () => {
        render(<DirectionTextContext.Provider value={true}>
            <DirectionIndicator pointId={pointId} adjacentPostId={String(StationId.lowicz_glowny_pzs_r12)} relation="from" />
            <DirectionIndicator pointId={pointId} adjacentPostId={String(StationId.skierniewice_s_pzs)} relation="to" />
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
        const arrival = screen.getByRole("img", {name: /^Einfahrt von rechts/});
        const departure = screen.getByRole("img", {name: /^Ausfahrt nach rechts/});
        expect(arrival).toHaveTextContent("von rechts");
        expect(departure).toHaveTextContent("nach rechts");
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
        const arrow = screen.getByRole("img", {name: /^Einfahrt von rechts/});
        const path = arrow.querySelector("path")?.getAttribute("d");
        expect(arrow).not.toHaveTextContent("von rechts");
        expect(arrow).toHaveClass("text-teal-400");
        rerender(<DirectionTextContext.Provider value={true}>{indicator}</DirectionTextContext.Provider>);
        expect(screen.getByRole("img")).toHaveTextContent("von rechts");
        expect(screen.getByRole("img")).toHaveClass("text-teal-400");
        expect(screen.getByRole("img").querySelector("path")?.getAttribute("d")).toBe(path);
        rerender(<DirectionTextContext.Provider value={false}>{indicator}</DirectionTextContext.Provider>);
        expect(screen.getByRole("img")).not.toHaveTextContent("von rechts");
    });
});

// Regression examples checked against the in-game dispatch-panel images.
describe("dispatch-panel branches", () => {
    it.each([
        [StationId.lowicz_glowny, StationId.jackowice, "rechts"],
        [StationId.lowicz_glowny, StationId.bednary, "links"],
        [StationId.lowicz_glowny, StationId.lowicz_przedmiescie, "oben"],
        [StationId.lowicz_glowny_pzs_r24_r31, StationId.bednary, "links"],
        [StationId.skierniewice, StationId.lowicz_przedmiescie, "oben"],
        [StationId.skierniewice_s_pzs, StationId.lowicz_przedmiescie, "oben"],
        [StationId.skierniewice_p_pzs, StationId.lowicz_przedmiescie, "oben"],
        [StationId.skierniewice_m_pzs, StationId.puszcza_marianska, "unten"],
        [StationId.glinnik, StationId.strykow, "links"],
        [StationId.glinnik, StationId.zgierz, "rechts"],
        [StationId.baby, StationId.wolborka, "links"],
        [StationId.rokiciny, StationId.chrusty_nowe, "links"],
        [StationId.gajewniki, StationId.zdunska_wola_karsznice, "oben"],
        [StationId.zdunska_wola, StationId.dionizow, "unten"],
        [StationId.zgierz, StationId.lodz_marysin, "unten"],
        [StationId.zgierz, StationId.zgierz_kontrewers, "oben"],
        [StationId.koluszki, StationId.slotwiny, "oben"],
        [StationId.koluszki, StationId.galkowek, "unten"],
        [StationId.galkowek, StationId.lodz_olechow_loc, "oben"],
        [StationId.zakowice_poludniowe, StationId.koluszki, "unten"],
        [StationId.lodz_chojny, StationId.lodz_dabrowa, "unten"],
        [StationId.lodz_kaliska, StationId.lodz_chojny, "oben"]
    ])("post %s toward %s is %s", (post, neighbor, side) => {
        render(<DirectionIndicator pointId={String(post)} adjacentPostId={String(neighbor)} relation="to" />);
        expect(screen.getByRole("img")).toHaveAccessibleName(expect.stringContaining(`Ausfahrt nach ${side}`));
    });

    it.each([[532, "oben"], [531, "rechts"], [15, "unten"]] as const)(
        "distinguishes Łowicz Przedmieście–Łowicz Główny on line %s", (line, side) => {
            render(<DirectionIndicator pointId={String(StationId.lowicz_przedmiescie)} adjacentPostId={String(StationId.lowicz_glowny)} relation="to" line={line} />);
            expect(screen.getByRole("img")).toHaveAccessibleName(expect.stringContaining(`Ausfahrt nach ${side}`));
        }
    );
    it.each([undefined, 999])("does not guess an ambiguous route when line is %s", line => {
        const {container} = render(<DirectionIndicator pointId={String(StationId.lowicz_przedmiescie)} adjacentPostId={String(StationId.lowicz_glowny)} relation="to" line={line} />);
        expect(container).toBeEmptyDOMElement();
    });
});
