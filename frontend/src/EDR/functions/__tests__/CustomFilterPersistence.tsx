import {fireEvent, render, screen} from "@testing-library/react";
import {ColumnFilterModal} from "../../components/CustomFilterModal";

// Use the actual CommonJS build with CRA's Jest runner.
jest.mock("usehooks-ts", () => jest.requireActual("usehooks-ts/dist/index.cjs"));

jest.mock("../../index", () => ({
    presetFilterConfig: {default: {onlyApproaching: false, onlyOnTrack: false, departedDistance: 5}},
}));
jest.mock("react-i18next", () => ({useTranslation: () => ({t: (key: string) => key})}));

const defaults = {onlyApproaching: false, onlyOnTrack: false, departedDistance: 5};

describe("custom filter persistence", () => {
    beforeEach(() => localStorage.clear());

    it("restores saved custom values after selecting a preset and remounting", () => {
        const apply = jest.fn();
        const first = render(<ColumnFilterModal isOpen onClose={() => {}} filterConfig={defaults} setFilterConfig={apply} />);
        fireEvent.click(screen.getAllByRole("checkbox")[0]);
        fireEvent.click(screen.getAllByRole("checkbox")[1]);
        fireEvent.change(screen.getByRole("slider"), {target: {value: "0.7"}});
        fireEvent.click(screen.getByText("25"));
        fireEvent.click(screen.getByText("1h"));
        fireEvent.click(screen.getByText("EDR_UI_save_and_close_button"));
        const custom = {...defaults, onlyOnTrack: true, onlyApproaching: true, departedDistance: 0.7, maxRange: 25, maxTime: 60};
        expect(apply).toHaveBeenLastCalledWith(custom);
        expect(JSON.parse(localStorage.getItem("edr-custom-filter-config")!)).toEqual(custom);
        first.unmount();

        // A reload with "All trains" active must not replace the custom profile.
        render(<ColumnFilterModal isOpen onClose={() => {}} filterConfig={defaults} setFilterConfig={apply} />);
        expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
        expect(screen.getAllByRole("checkbox")[1]).toBeChecked();
        expect(screen.getByRole("slider")).toHaveValue("0.7");
        fireEvent.click(screen.getByText("EDR_UI_save_button"));
        expect(apply).toHaveBeenLastCalledWith(custom);
        fireEvent.click(screen.getByText("EDR_UI_reset_button"));
        expect(JSON.parse(localStorage.getItem("edr-custom-filter-config")!)).toEqual(defaults);
    });

    it("preserves the saved profile when closing without saving", () => {
        const custom = {...defaults, maxRange: 50};
        localStorage.setItem("edr-custom-filter-config", JSON.stringify(custom));
        const first = render(<ColumnFilterModal isOpen onClose={() => {}} filterConfig={defaults} setFilterConfig={() => {}} />);
        fireEvent.click(screen.getByText("10"));
        first.unmount();
        const apply = jest.fn();
        render(<ColumnFilterModal isOpen onClose={() => {}} filterConfig={defaults} setFilterConfig={apply} />);
        fireEvent.click(screen.getByText("EDR_UI_save_button"));
        expect(apply).toHaveBeenLastCalledWith(custom);
    });
});
