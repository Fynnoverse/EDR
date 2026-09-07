import React from "react";
import {useTranslation} from "react-i18next";
import {cleanVehicleName, getTrainCategory, getTrainImageConfig, isTractionVehicle} from "../../functions/trainPresentation";

type Props = {
    vehicles?: string[];
    trainType: string;
    isWebpSupported: boolean;
    streamMode: boolean;
}

const MAX_VISIBLE_VEHICLES = 14;

export const TrainConsistDisplay: React.FC<Props> = ({vehicles = [], trainType, isWebpSupported, streamMode}) => {
    const {t} = useTranslation();
    if (vehicles.length === 0) return null;

    const trainConfig = getTrainImageConfig(vehicles[0]);
    const trainImage = isWebpSupported ? trainConfig?.iconWebp : trainConfig?.icon;
    const visibleVehicles = vehicles.slice(0, MAX_VISIBLE_VEHICLES);
    const hiddenVehicleCount = vehicles.length - visibleVehicles.length;
    const allVehiclesAreUnits = vehicles.every(isTractionVehicle);
    const leadingVehicle = cleanVehicleName(vehicles[0]);
    const consistLabel = allVehiclesAreUnits && vehicles.length > 1
        ? t("EDR_TRAIN_CONSIST_units", {count: vehicles.length})
        : vehicles.length > 1
            ? t("EDR_TRAIN_CONSIST_cars", {loco: leadingVehicle, count: vehicles.length - 1})
            : leadingVehicle;
    const fullConsist = vehicles.map(cleanVehicleName).join(" → ");

    return <div className="hidden max-w-[190px] flex-col items-end lg:flex" title={fullConsist} aria-label={`${t("EDR_TRAIN_CONSIST_label")}: ${fullConsist}`}>
        {trainImage && <img
            src={trainImage}
            className="object-contain"
            height={streamMode ? 30 : 40}
            width={streamMode ? 72 : 120}
            alt={`${t("EDR_TRAIN_CONSIST_vehicle_image")}: ${leadingVehicle}`}
        />}
        <div className="mt-1 flex max-w-full items-end gap-px" aria-hidden="true">
            {visibleVehicles.map((vehicle, index) => {
                const category = getTrainCategory(trainType, [vehicle]);
                const isTraction = isTractionVehicle(vehicle);
                const color = isTraction
                    ? "border-cyan-300 bg-cyan-500"
                    : category === "freight"
                        ? "border-amber-300 bg-amber-600"
                        : "border-slate-300 bg-slate-500";

                return <span
                    key={`${vehicle}-${index}`}
                    className={`${isTraction ? "h-3 w-6 rounded-l-md" : "h-2.5 w-3"} inline-block border ${color}`}
                    title={`${index + 1}. ${cleanVehicleName(vehicle)}`}
                />;
            })}
            {hiddenVehicleCount > 0 && <span className="ml-1 text-[10px] font-semibold">+{hiddenVehicleCount}</span>}
        </div>
        <span className="mt-0.5 max-w-full truncate text-[10px] leading-tight text-gray-600 dark:text-gray-300">{consistLabel}</span>
    </div>;
};
