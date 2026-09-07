import React from "react";
import {useTranslation} from "react-i18next";
import {cleanVehicleName, getTrainCategory, getTrainImageConfig, isTractionVehicle} from "../../functions/trainPresentation";

type Props = {
    vehicles?: string[];
    trainType: string;
    isWebpSupported: boolean;
    streamMode: boolean;
}

const MAX_VISIBLE_VEHICLES = 10;

export const TrainConsistDisplay: React.FC<Props> = ({vehicles = [], trainType, isWebpSupported, streamMode}) => {
    const {t, i18n} = useTranslation();
    if (vehicles.length === 0) return null;

    const trainConfig = getTrainImageConfig(vehicles[0]);
    const trainImage = isWebpSupported ? trainConfig?.iconWebp : trainConfig?.icon;
    const visibleVehicles = vehicles.slice(0, MAX_VISIBLE_VEHICLES);
    const hiddenVehicleCount = vehicles.length - visibleVehicles.length;
    const allVehiclesAreUnits = vehicles.every(isTractionVehicle);
    const leadingVehicle = cleanVehicleName(vehicles[0]);
    const isGerman = i18n.resolvedLanguage?.startsWith("de") ?? i18n.language?.startsWith("de");
    const trailingVehicleCount = vehicles.length - 1;
    const consistLabel = allVehiclesAreUnits && vehicles.length > 1
        ? t("EDR_TRAIN_CONSIST_units", {
            count: vehicles.length,
            defaultValue: isGerman ? `${vehicles.length} Triebwagen` : `${vehicles.length} train units`
        })
        : vehicles.length > 1
            ? t("EDR_TRAIN_CONSIST_cars", {
                loco: leadingVehicle,
                count: trailingVehicleCount,
                defaultValue: isGerman
                    ? `${leadingVehicle} + ${trailingVehicleCount} Wagen`
                    : `${leadingVehicle} + ${trailingVehicleCount} ${trailingVehicleCount === 1 ? "car" : "cars"}`
            })
            : leadingVehicle;
    const fullConsist = vehicles.map(cleanVehicleName).join(" → ");
    const consistDescription = t("EDR_TRAIN_CONSIST_label", {defaultValue: isGerman ? "Zugreihung" : "Train consist"});
    const vehicleImageDescription = t("EDR_TRAIN_CONSIST_vehicle_image", {defaultValue: isGerman ? "Fahrzeugbild" : "Vehicle image"});

    return <div
        className={`${streamMode ? "h-[46px] w-[150px]" : "h-[54px] w-[180px]"} hidden shrink-0 flex-col items-end overflow-hidden lg:flex`}
        title={fullConsist}
        aria-label={`${consistDescription}: ${fullConsist}`}
    >
        <div className={`${streamMode ? "h-[22px]" : "h-[30px]"} flex w-full shrink-0 items-center justify-end overflow-hidden`}>
            {trainImage && <img
                src={trainImage}
                className="max-h-full max-w-[120px] object-contain"
                alt={`${vehicleImageDescription}: ${leadingVehicle}`}
            />}
        </div>
        <span className="block h-3 w-full shrink-0 truncate text-right text-[10px] leading-3 text-gray-600 dark:text-gray-300">{consistLabel}</span>
        <div className="flex h-3 w-full shrink-0 items-end justify-end gap-px overflow-hidden" aria-hidden="true">
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
                    className={`${isTraction ? "h-3 w-6 rounded-l-md" : "h-2.5 w-2.5"} inline-block shrink-0 border ${color}`}
                    title={`${index + 1}. ${cleanVehicleName(vehicle)}`}
                />;
            })}
            {hiddenVehicleCount > 0 && <span className="ml-1 text-[10px] font-semibold">+{hiddenVehicleCount}</span>}
        </div>
    </div>;
};
