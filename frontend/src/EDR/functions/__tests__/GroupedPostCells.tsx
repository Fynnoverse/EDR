import {render, screen} from "@testing-library/react";
import {CellLineData} from "../../components/Cells/CellLineData";
import {TrainFromCell} from "../../components/Cells/TrainFromCell";
import {TrainToCell} from "../../components/Cells/TrainToCell";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {StationId} from "../../../enums/stationId";

jest.mock("react-i18next", () => ({useTranslation: () => ({t: (key: string) => key})}));
jest.mock("../../components/TrainRow", () => ({tableCellCommonClassnames: () => ""}));

const lowicz = {
    pointId: String(StationId.lowicz_przedmiescie),
    toPostId: String(StationId.lowicz_glowny),
    toPost: "Łowicz Główny", line: 532
} as TimeTableRow;

it("shows the departing line and branch without requiring a live train", () => {
    render(<CellLineData ttRow={lowicz} />);
    expect(screen.getByRole("img", {name: /^Ausfahrt nach oben/})).toBeVisible();
    expect(screen.getByText("532")).toBeVisible();
    expect(screen.getByText("Łowicz Główny")).toBeVisible();
});

it("keeps different outgoing lines to the same destination and removes exact duplicates", () => {
    render(<table><tbody><tr><TrainToCell ttRow={lowicz}
        secondaryPostData={[{...lowicz}, {...lowicz, line: 531}]}
        headerSeventhColRef={null} streamMode={false} /></tr></tbody></table>);
    expect(screen.getAllByText("Łowicz Główny")).toHaveLength(2);
    expect(screen.getByRole("img", {name: /^Ausfahrt nach oben/})).toBeVisible();
    expect(screen.getByRole("img", {name: /^Ausfahrt nach rechts/})).toBeVisible();
});

it("uses the incoming line instead of the line after a junction", () => {
    const row = {...lowicz, line: 15, fromLine: 532, fromPostId: lowicz.toPostId, fromPost: lowicz.toPost};
    render(<table><tbody><tr><TrainFromCell ttRow={row}
        secondaryPostData={[{...row}, {...row, fromLine: 531}]}
        headerFourthColRef={null} streamMode={false} /></tr></tbody></table>);
    expect(screen.getAllByText("Łowicz Główny")).toHaveLength(2);
    expect(screen.getByRole("img", {name: /^Einfahrt von oben/})).toBeVisible();
    expect(screen.getByRole("img", {name: /^Einfahrt von rechts/})).toBeVisible();
});

it("renders the real external destination for a Koluszki bypass subpost", () => {
    render(<CellLineData ttRow={{
        pointId: String(StationId.koluszki_pzs_r145),
        toPostId: String(StationId.galkowek), toPost: "Gałkówek", line: 17, toLine: 17
    } as TimeTableRow} />);
    expect(screen.getByText("Gałkówek")).toBeVisible();
    expect(screen.getByRole("img", {name: /^Ausfahrt nach unten/})).toBeVisible();
});
