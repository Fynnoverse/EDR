import {render, screen} from "@testing-library/react";
import {TrainArrivalCell} from "../../components/Cells/TrainArrivalCell";
import {TimeTableRow} from "../../../customTypes/TimeTableRow";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: {defaultValue?: string}) => {
            if (key === "EDR_TRAINROW_train_delayed") return "verspätet";
            if (key === "EDR_TRAINROW_train_early") return "verfrüht";
            return options?.defaultValue ?? key;
        },
    }),
}));
jest.mock("../../components/TrainRow", () => ({tableCellCommonClassnames: () => ""}));

describe("TrainArrivalCell Badges", () => {
    const serverNow = new Date("2026-09-07T13:00:00Z");
    const ttRow = {
        scheduledArrivalObject: new Date("2026-09-07T13:10:00Z"),
    } as TimeTableRow;

    it("renders red badge for delayed train", () => {
        const {container} = render(
            <table><tbody><tr>
                <TrainArrivalCell
                    ttRow={ttRow}
                    trainDetails={undefined}
                    trainHasPassedStation={false}
                    thirdColRef={null}
                    streamMode={false}
                    arrivalTimeDelay={5}
                    serverNow={serverNow}
                    deviationMinutes={5}
                />
            </tr></tbody></table>
        );
        const badge = screen.getByText("verspätet");
        expect(badge).toBeInTheDocument();
        expect(badge.closest('[class*="bg-red"]')).toBeTruthy();
    });

    it("renders early badge for early train", () => {
        const {container} = render(
            <table><tbody><tr>
                <TrainArrivalCell
                    ttRow={ttRow}
                    trainDetails={undefined}
                    trainHasPassedStation={false}
                    thirdColRef={null}
                    streamMode={false}
                    arrivalTimeDelay={-3}
                    serverNow={serverNow}
                    deviationMinutes={-3}
                />
            </tr></tbody></table>
        );
        const badge = screen.getByText("verfrüht");
        expect(badge).toBeInTheDocument();
        expect(badge.closest('[class*="bg-cyan"]')).toBeTruthy();
    });
});
