import { Moment } from 'moment';

export interface ITimeObject {
    startTime: number; // msec
    endTime: number; // msec
    label?: string;
    quickSelect?: number;
    readonly startTimeInSecs: number;
    readonly endTimeInSecs: number;
}

export interface IQuickTime {
    label: string;
    start(): Moment;
    end(): Moment;
}

/**
 * Time related stuffs need to come here
 * i.e time filter, timezones
 */
export interface ITimeService {
    readonly TIMEGROUP_GLOBAL: string;
    timezoneFormat: string;
    dateTimeFormat: string;
    dateTimeFormatMeridian: string;
    dateTimeFormatMeridianSecs: string;
    timeFormat: string;
    quickSelect: string;
    customSelect: string;
    quickTimeSelectionList: IQuickTime[];
    getTimeFilter(timeGroup: string): ITimeObject;
    setTimeFilter(timeGroup: string, startTime: number, endTime: number, label: string, quickSelect: number): void;
    setTimeObject(timeGroup: string, timeObject: ITimeObject): void;
    getTimeFilterUsingConfig(timeFilter: ITimeObject): ITimeObject;
}

export class TimeObject implements ITimeObject {
    constructor(private _startTime: number, private _endTime: number, public label: string, public quickSelect: number) {
        this._startTime = Math.round(_startTime / 1000) * 1000;
        this._endTime = Math.round(_endTime / 1000) * 1000;
    }

    set startTime(_startTime: number) {
        this._startTime = Math.round(_startTime / 1000) * 1000;
    }

    set endTime(_endTime: number) {
        this._endTime = Math.round(_endTime / 1000) * 1000;
    }

    get startTime(): number {
        return this._startTime;
    }

    get endTime(): number {
        return this._endTime;
    }

    get startTimeInSecs(): number {
        return Math.round(this._startTime / 1000);
    }

    get endTimeInSecs(): number {
        return Math.round(this._endTime / 1000);
    }
}
