import React from "react";
import {Badge} from "flowbite-react";
import {useTranslation} from "react-i18next";
import {getTrainCategory, TrainCategory} from "../../functions/trainPresentation";

type Props = {
    trainType: string;
    vehicles?: string[];
    badgeColor: string;
}

const CategoryIcon: React.FC<{category: TrainCategory}> = ({category}) => {
    if (category === "freight") {
        return <svg aria-hidden="true" viewBox="0 0 28 20" className="h-4 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 4h9v10H2zM13 4h9v10h-9zM22 12h3v2h-3M1 14h23" />
            <circle cx="6" cy="17" r="1.5" /><circle cx="18" cy="17" r="1.5" />
        </svg>;
    }

    if (category === "service") {
        return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m14 6 4-4 4 4-4 4M13 7 4 16l4 4 9-9M3 21l3-3" />
        </svg>;
    }

    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 15V6c0-3 3-4 7-4s7 1 7 4v9M5 9h14M8 5h8M7 15h10M8 19l-2 3M16 19l2 3" />
        <circle cx="8" cy="16" r="1.5" /><circle cx="16" cy="16" r="1.5" />
    </svg>;
};

export const TrainCategoryBadge: React.FC<Props> = ({trainType, vehicles, badgeColor}) => {
    const {t, i18n} = useTranslation();
    const category = getTrainCategory(trainType, vehicles);
    const isGerman = i18n.resolvedLanguage?.startsWith("de") ?? i18n.language?.startsWith("de");
    const fallbackLabels: Record<TrainCategory, string> = isGerman ? {
        passenger: "Personenzug",
        freight: "Güterzug",
        service: "Dienst-/Wartungszug"
    } : {
        passenger: "Passenger train",
        freight: "Freight train",
        service: "Service/maintenance train"
    };
    const labels: Record<TrainCategory, string> = {
        passenger: t("EDR_TRAIN_CATEGORY_passenger", {defaultValue: fallbackLabels.passenger}),
        freight: t("EDR_TRAIN_CATEGORY_freight", {defaultValue: fallbackLabels.freight}),
        service: t("EDR_TRAIN_CATEGORY_service", {defaultValue: fallbackLabels.service})
    };

    return <div className="flex flex-col items-center gap-1">
        <Badge color={badgeColor}>{trainType}</Badge>
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold" title={labels[category]}>
            <CategoryIcon category={category} />
            <span>{labels[category]}</span>
        </span>
    </div>;
};
