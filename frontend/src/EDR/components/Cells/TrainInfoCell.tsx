import React from "react";
import {Badge, Button} from "flowbite-react";
import { useSnackbar } from "notistack";
import World from "../../../sounds/world.svg";
import {tableCellCommonClassnames} from "../TrainRow";
import {useTranslation} from "react-i18next";
import { DetailedTrain } from "../../functions/trainDetails";
import {TrainConsistDisplay} from "./TrainConsistDisplay";
import Tooltip from "rc-tooltip";
import classNames from "classnames";
import TimetableIcon from "../../../images/icons/png/timetable.png";
import ScheduleIcon from "../../../images/icons/png/schedule.png";
import { Link } from "react-router-dom";
import { ISteamUser } from "../../../config/ISteamUser";
import { postConfig, StationConfig } from "../../../config/stations";
import { edrImagesMap, edrWebpImagesMap } from "../../../config";
import { TimeTableRow } from "../../../customTypes/TimeTableRow";

type Props = {
    ttRow: TimeTableRow;
    trainDetails: DetailedTrain | undefined;
    trainBadgeColor: string;
    setModalTrainId: (trainId: string | undefined) => void;
    setTimetableTrainId: (trainId: string | undefined) => void;
    firstColRef: any;
    trainHasPassedStation: boolean;
    isWebpSupported: boolean;
    streamMode: boolean;
    serverCode: string;
    players: ISteamUser[] | undefined;
    postCfg: StationConfig;
}
export const TrainInfoCell: React.FC<Props> = ({
       ttRow, trainDetails, trainBadgeColor,
       trainHasPassedStation,
       setModalTrainId, firstColRef, isWebpSupported,
       streamMode, setTimetableTrainId, serverCode, players, postCfg
}) => {
    const {t} = useTranslation();
    const { enqueueSnackbar } = useSnackbar();
    const nextStation = trainDetails?.timetable?.find(entry => entry.indexOfPoint >= trainDetails?.TrainData?.VDDelayedTimetableIndex);
    const nextStationName = nextStation?.nameForPerson;
    const controllingPlayer = players?.find(player => player.steamid === trainDetails?.TrainData?.ControlledBySteamID);
    const icons = isWebpSupported ? edrWebpImagesMap : edrImagesMap;
    const distanceFromStation = trainDetails?.distanceFromStation;
    const isTrainApproaching = !trainHasPassedStation && distanceFromStation != null && ((nextStationName === postCfg?.srName || postCfg.secondaryPosts?.some(post => postConfig[post]?.srName === nextStationName)) && distanceFromStation < 3);

    const CopyToClipboard = (stringToCopy: string) => {
        navigator.clipboard.writeText(stringToCopy);
        enqueueSnackbar(t('EDR_TRAINROW_copied'), { preventDuplicate: true, variant: 'success' });
    }

    return (
        <td className={tableCellCommonClassnames(streamMode)} ref={firstColRef} width="550">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-y-2">
                    <Badge color={trainBadgeColor} size={streamMode ? "xs" : "sm"}>
                        <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_click_to_copy")}</span>}>
                            <span className={classNames("!font-bold cursor-pointer", streamMode ? "text-base" : "text-lg")} onClick={() => CopyToClipboard(ttRow.trainNoLocal)}>
                                {ttRow.trainNoLocal}
                            </span>
                        </Tooltip>
                    </Badge>
                    { trainDetails && <span className="ml-1 flex flex-wrap gap-y-2">
                        <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_show_on_map")}</span>}>
                            <Button size="xs" onClick={() => !!trainDetails && setModalTrainId(ttRow.trainNoLocal)}><img src={World} height={streamMode ? 8 : 16} width={streamMode ? 8 : 16} alt="Show on map"/></Button>
                        </Tooltip>
                        <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_show_timetable")}</span>}>
                            <Button size="xs" className="ml-1" onClick={() => setTimetableTrainId(ttRow.trainNoLocal)}><img src={TimetableIcon} height={streamMode ? 8 : 16} width={streamMode ? 8 : 16} alt="Show timetable"/></Button>
                        </Tooltip>
                        <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_switch_to_driver_view")}</span>}>
                            <Link to={`/${serverCode}/train/${ttRow.trainNoLocal}`}>
                                <Button size="xs" className="ml-1"><img src={ScheduleIcon} height={streamMode ? 8 : 16} width={streamMode ? 8 : 16} alt="Show timetable"/></Button>
                            </Link>
                        </Tooltip>
                        { (ttRow.isQualityTracked) &&
                            <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_quality_tracked")}</span>}>
                                <span><img src={icons.QUALITY_TRACK} height={streamMode ? 16 : 32} width={streamMode ? 16 : 32} alt="train-icon"/></span>
                            </Tooltip>
                        }
                        { (ttRow.isOverGauge) &&
                            <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_over_gauge")}</span>}>
                                <span><img src={icons.OVER_GAUGE} height={streamMode ? 16 : 32} width={streamMode ? 16 : 32} alt="train-icon"/></span>
                            </Tooltip>
                        }
                        { (ttRow.isOverWeight) &&
                            <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_over_weight")}</span>}>
                                <span><img src={icons.OVER_WEIGHT} height={streamMode ? 16 : 32} width={streamMode ? 16 : 32} alt="train-icon"/></span>
                            </Tooltip>
                        }
                        { (ttRow.isHighRiskCargo) &&
                            <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_high_risk")}</span>}>
                                <span><img src={icons.HIGH_RISK} height={streamMode ? 16 : 32} width={streamMode ? 16 : 32} alt="train-icon"/></span>
                            </Tooltip>
                        }
                        { (ttRow.isDangerousCargo) &&
                            <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_dangerous")}</span>}>
                                <span><img src={icons.DANGEROUS} height={streamMode ? 16 : 32} width={streamMode ? 16 : 32} alt="train-icon"/></span>
                            </Tooltip>
                        }
                        { (ttRow.isOtherExceptional) &&
                            <Tooltip placement="top" overlay={<span>{t("EDR_TRAINROW_special_cargo")}</span>}>
                                <span><img src={icons.SPECIAL_CARGO} height={streamMode ? 16 : 32} width={streamMode ? 16 : 32} alt="train-icon"/></span>
                            </Tooltip>
                        }
                    </span> }
                </div>
                <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 overflow-hidden">
                    {controllingPlayer?.personaname && <Tooltip placement="top" overlay={<span>{controllingPlayer.personaname}</span>}>
                        <span className="flex h-6 max-w-[112px] shrink-0 items-center justify-end gap-1 overflow-hidden whitespace-nowrap">
                            <span className="max-w-[84px] truncate text-xs">{controllingPlayer.personaname}</span>
                            <img className="h-5 w-5 shrink-0 rounded-full object-cover" src={controllingPlayer.avatar} alt={controllingPlayer.personaname} />
                        </span>
                    </Tooltip>}
                    <div className="flex min-w-0 shrink-0 justify-end overflow-hidden">
                        <TrainConsistDisplay
                            vehicles={trainDetails?.Vehicles}
                            trainType={ttRow.trainType}
                            isWebpSupported={isWebpSupported}
                            streamMode={streamMode}
                        />
                    </div>
                </div>
            </div>
            <div className="mt-1 flex w-full flex-wrap items-baseline gap-x-1">
                {  trainDetails
                    ? <div className="min-w-0 break-words">
                        <span>{t("EDR_TRAINROW_position_next")}:&nbsp;</span>
                        <span className={isTrainApproaching ? 'px-1 rounded bg-green-200 dark:bg-green-600 animate-pulse' : ''}>{nextStationName}</span>
                        {distanceFromStation != null && Number.isFinite(distanceFromStation) && <>
                            {', '}
                            <span className="inline-block whitespace-nowrap" title={postCfg.srName}>
                                {distanceFromStation.toFixed(2)}&nbsp;km
                            </span>
                        </>}
                    </div>
                    : <>{t('EDR_TRAINROW_train_offline')}</>
                }
                {
                    trainHasPassedStation
                    ? <>({t("EDR_TRAINROW_train_away")})</>
                    : ''
                }
            </div>
        </td>
    )
}
