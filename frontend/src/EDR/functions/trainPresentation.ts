import {configByLoco} from "../../config/trains";

export type TrainCategory = "passenger" | "freight" | "service";
export type PassengerService = "regional" | "longDistance";

const passengerTypePrefixes = ["A", "E", "M", "R"];
const freightTypePrefixes = ["T"];
const serviceTypePrefixes = ["L", "P", "Z"];

const representativeLocoByFamily: Record<string, string> = {
    "Pendolino": "Pendolino/ED250-018 Variant",
    "4E": "4E/EU07-005",
    "201E": "201E/ET22-243",
    "Traxx": "Traxx/E186-134",
    "Elf": "Elf/EN76-006",
    "Dragon2": "Dragon2/ET25-002",
    "EN57": "EN57/EN57-1000"
};

const tractionFamilies = new Set([
    "Pendolino", "4E", "201E", "Traxx", "Elf", "Dragon2", "EN57", "Impuls", "CD163"
]);

export const cleanVehicleName = (vehicle: string): string => {
    const model = vehicle.split(":")[0].split("/").pop() ?? vehicle;
    return model.replace(/ Variant$/i, "").replace(/_/g, " ");
};

export const isTractionVehicle = (vehicle: string): boolean =>
    tractionFamilies.has(vehicle.split("/")[0]);

export const getTrainCategory = (trainType: string, vehicles: string[] = []): TrainCategory => {
    if (passengerTypePrefixes.some(prefix => trainType.startsWith(prefix))) return "passenger";
    if (freightTypePrefixes.some(prefix => trainType.startsWith(prefix))) return "freight";
    if (serviceTypePrefixes.some(prefix => trainType.startsWith(prefix))) return "service";

    const hasFreightVehicles = vehicles.some(vehicle => /:[GP](?::|$)|@/.test(vehicle));
    if (hasFreightVehicles) return "freight";
    if (vehicles.some(vehicle => /^(11xa|Z2)\//.test(vehicle)) || vehicles.every(isTractionVehicle)) return "passenger";
    return "service";
};

export const getPassengerService = (trainType: string): PassengerService | undefined => {
    if (trainType.startsWith("R") || trainType.startsWith("A")) return "regional";
    if (trainType.startsWith("E") || trainType.startsWith("M")) return "longDistance";
    return undefined;
};

export const getTrainImageConfig = (vehicle?: string) => {
    if (!vehicle) return undefined;

    const model = vehicle.split(":")[0];
    const exactConfig = configByLoco[model];
    if (exactConfig) return exactConfig;

    const representativeModel = representativeLocoByFamily[model.split("/")[0]];
    return representativeModel ? configByLoco[representativeModel] : undefined;
};
