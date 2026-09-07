import {act, render, screen} from "@testing-library/react";
import {EDR} from "../../index";
import * as api from "../../../api/api";

let mockRoute = {serverCode: "de1", post: "LG"};
jest.mock("react-router-dom", () => ({useParams: () => mockRoute, redirect: jest.fn()}), {virtual: true});
jest.mock("../../../api/api");
jest.mock("use-query-params", () => ({StringParam: {}, useQueryParam: () => [undefined]}));
jest.mock("usehooks-ts", () => ({useLocalStorage: (_key: string, value: unknown) => [value, jest.fn()]}));
jest.mock("react-i18next", () => ({useTranslation: () => ({t: (key: string) => key})}));
jest.mock("../../components/Table", () => ({EDRTable: ({post, serverTime}: any) => <div data-testid="table">{post}:{serverTime}</div>}));
jest.mock("../../components/LoadingScreen", () => ({LoadingScreen: () => <div>loading</div>}));

const flush = async () => { await act(async () => { await Promise.resolve(); }); };
describe("live station refresh", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        mockRoute = {serverCode: "de1", post: "LG"};
        jest.mocked(api.getTzOffset).mockResolvedValue(2);
        jest.mocked(api.getServerTime).mockResolvedValue(100000);
        jest.mocked(api.getStations).mockResolvedValue([]);
        jest.mocked(api.getTimetable).mockResolvedValue([]);
        jest.mocked(api.getTrainsForPost).mockResolvedValue([{TrainNoLocal: "1", TrainData: {ControlledBySteamID: null, VDDelayedTimetableIndex: 1}}] as any);
    });
    afterEach(() => { jest.useRealTimers(); });

    it("polls every five seconds and advances the table clock every second", async () => {
        const {unmount} = render(<EDR isWebpSupported={false} playSoundNotification={jest.fn()} />);
        await flush();
        expect(api.getTrainsForPost).toHaveBeenCalledTimes(1);
        await act(async () => { jest.advanceTimersByTime(1000); });
        expect(screen.getByTestId("table")).toHaveTextContent("LG:101000");
        await act(async () => { jest.advanceTimersByTime(4000); });
        expect(api.getTrainsForPost).toHaveBeenCalledTimes(2);
        expect(screen.getByRole("status")).toHaveTextContent("Live-Abruf vor 0 s");
        unmount();
        await act(async () => { jest.advanceTimersByTime(10000); });
        expect(api.getTrainsForPost).toHaveBeenCalledTimes(2);
    });

    it("does not overlap slow requests and ignores an old station response", async () => {
        let resolveOld: (value: any) => void = () => {};
        jest.mocked(api.getTrainsForPost).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
        const {rerender, unmount} = render(<EDR isWebpSupported={false} playSoundNotification={jest.fn()} />);
        await act(async () => { jest.advanceTimersByTime(15000); });
        expect(api.getTrainsForPost).toHaveBeenCalledTimes(1);
        mockRoute = {serverCode: "de1", post: "SK"};
        rerender(<EDR isWebpSupported={false} playSoundNotification={jest.fn()} />);
        await flush();
        expect(api.getTrainsForPost).toHaveBeenLastCalledWith("de1", "SK");
        await act(async () => { resolveOld([]); });
        expect(screen.getByTestId("table")).toHaveTextContent("SK:");
        await act(async () => { jest.advanceTimersByTime(5000); });
        expect(api.getTrainsForPost).toHaveBeenLastCalledWith("de1", "SK");
        unmount();
    });
});
