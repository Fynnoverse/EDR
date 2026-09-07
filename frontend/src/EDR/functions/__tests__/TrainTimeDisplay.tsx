import {render, screen} from "@testing-library/react";
import {TrainTimeDisplay} from "../../components/Cells/TrainTimeDisplay";

jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (_key: string, options?: {defaultValue?: string}) => options?.defaultValue ?? _key,
    }),
}));

describe("TrainTimeDisplay", () => {
    const serverNow = new Date("2026-09-07T13:00:00Z");

    it("places a positive deviation next to the scheduled time", () => {
        render(<TrainTimeDisplay
            scheduledTime={new Date("2026-09-07T13:51:00Z")}
            deviationMinutes={3}
            serverNow={serverNow}
        />);
        const predicted = screen.getByTestId("predicted-train-time");
        const scheduled = screen.getByTestId("scheduled-train-time");

        expect(predicted).toHaveTextContent("13:54");
        expect(predicted).not.toHaveTextContent("+3");
        expect(scheduled).toHaveTextContent("Plan 13:51+3");
    });

    it("places a negative deviation next to the scheduled time", () => {
        render(<TrainTimeDisplay
            scheduledTime={new Date("2026-09-07T13:42:00Z")}
            deviationMinutes={-1}
            serverNow={serverNow}
        />);
        const predicted = screen.getByTestId("predicted-train-time");
        const scheduled = screen.getByTestId("scheduled-train-time");

        expect(predicted).toHaveTextContent("13:41");
        expect(predicted).not.toHaveTextContent("-1");
        expect(scheduled).toHaveTextContent("Plan 13:42-1");
    });

    it("shows an unknown deviation rather than claiming punctuality without live data", () => {
        render(<TrainTimeDisplay
            scheduledTime={new Date("2026-09-07T13:51:00Z")}
            serverNow={serverNow}
        />);

        expect(screen.getByTestId("predicted-train-time")).toHaveTextContent("13:51");
        expect(screen.getByTestId("scheduled-train-time")).toHaveTextContent("Plan 13:51—");
    });
});
