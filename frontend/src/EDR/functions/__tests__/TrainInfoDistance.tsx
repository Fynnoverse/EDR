import {render, screen} from "@testing-library/react";
import {ReactNode} from "react";
import {TrainInfoCell} from "../../components/Cells/TrainInfoCell";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";
import {DetailedTrain} from "../trainDetails";
import {postConfig} from "../../../config/stations";
import {getDisplayDistance} from "../displayDistance";

jest.mock("react-i18next", () => ({useTranslation: () => ({t: (key: string) => key === "EDR_TRAINROW_position_next" ? "Nächste" : key})}));
jest.mock("notistack", () => ({useSnackbar: () => ({enqueueSnackbar: jest.fn()})}));
jest.mock("react-router-dom", () => ({Link: ({children}: {children: ReactNode}) => <>{children}</>}), {virtual: true});
jest.mock("../../components/TrainRow", () => ({tableCellCommonClassnames: () => ""}));
jest.mock("../../components/Cells/TrainConsistDisplay", () => ({TrainConsistDisplay: () => null}));

describe("distance to the selected station", () => {
    it.each([false, true])("renders the next station and 1.15 km in stream mode %s", streamMode => {
        const details = {
            distanceFromStation: 1.15,
            TrainData: {VDDelayedTimetableIndex: 0},
            timetable: [{indexOfPoint: 0, nameForPerson: "Skierniewice"}]
        } as DetailedTrain;
        render(<table><tbody><tr><TrainInfoCell
            ttRow={{trainNoLocal: "91882", trainType: "ROJ"} as TimeTableRow}
            trainDetails={details} trainBadgeColor="success"
            setModalTrainId={jest.fn()} setTimetableTrainId={jest.fn()}
            firstColRef={null} trainHasPassedStation={false} isWebpSupported={false}
            streamMode={streamMode} serverCode="de1" players={undefined} postCfg={postConfig.SK}
        /></tr></tbody></table>);
        expect(screen.getByText("Nächste:")).toBeVisible();
        expect(screen.getByText("Skierniewice")).toBeVisible();
        expect(screen.getByText("= 1.15 km")).toBeVisible();
        expect(screen.getByText("= 1.15 km")).toHaveAttribute("title", "Entfernung zum Referenzpunkt von Skierniewice, nicht zur Bahnsteigkante");
    });
    it("labels a stationary train without replacing its measured distance with zero", () => {
        const details = {distanceFromStation: 0.17,
            TrainData: {Velocity: 0, VDDelayedTimetableIndex: 2}, timetable: []} as unknown as DetailedTrain;
        render(<table><tbody><tr><TrainInfoCell
            ttRow={{trainNoLocal: "11507", stationIndex: 2, plannedStop: 2} as TimeTableRow}
            trainDetails={details} trainBadgeColor="success"
            setModalTrainId={jest.fn()} setTimetableTrainId={jest.fn()}
            firstColRef={null} trainHasPassedStation={false} isWebpSupported={false}
            streamMode={false} serverCode="de1" players={undefined} postCfg={postConfig.SK}
        /></tr></tbody></table>);
        expect(screen.getByText("Hält im Bahnhof")).toBeVisible();
        expect(screen.getByText("= 0.17 km")).toBeVisible();
    });
});

describe("missing live routed distance", () => {
    it("renders a labelled fallback for the live Łowicz case", () => {
        const details = {
            distanceFromStation: null,
            TrainData: {VDDelayedTimetableIndex: 0, Longitute: 19.9749813079834, Latititute: 52.09132385253906},
            timetable: [{indexOfPoint: 0, nameForPerson: "Łowicz Główny"}]
        } as DetailedTrain;
        render(<table><tbody><tr><TrainInfoCell
            ttRow={{trainNoLocal: "91884", trainType: "ROJ"} as TimeTableRow}
            trainDetails={details} trainBadgeColor="success"
            setModalTrainId={jest.fn()} setTimetableTrainId={jest.fn()}
            firstColRef={null} trainHasPassedStation={false} isWebpSupported={false}
            streamMode={false} serverCode="de1" players={undefined} postCfg={postConfig.LG}
        /></tr></tbody></table>);
        const distance = screen.getByTitle(/Luftlinie zu Łowicz Główny/);
        expect(distance).toBeVisible();
        expect(distance).toHaveTextContent(/≈ 1\.93\s*km/);
        expect(distance).not.toHaveTextContent("(Luftlinie)");
    });

    it("prefers the route and preserves zero", () => {
        expect(getDisplayDistance(1.15, 19, 52, [20, 52])).toEqual({km: 1.15, approximate: false});
        expect(getDisplayDistance(0, 19, 52, [20, 52])).toEqual({km: 0, approximate: false});
    });
    it("uses kilometres with longitude/latitude in the correct order", () => {
        expect(getDisplayDistance(null, 19, 52, [19, 53])?.km).toBeCloseTo(111.195, 2);
        expect(getDisplayDistance(null, 19, 52, [20, 52])?.km).toBeCloseTo(68.458, 2);
    });
    it("does not invent a distance without valid positions", () => {
        expect(getDisplayDistance(null, undefined, undefined, [19, 52])).toBeUndefined();
        expect(getDisplayDistance(null, 0, 0, [19, 52])).toBeUndefined();
        expect(getDisplayDistance(null, 19, NaN, [19, 52])).toBeUndefined();
        expect(getDisplayDistance(null, 19, 52)).toBeUndefined();
    });
});
