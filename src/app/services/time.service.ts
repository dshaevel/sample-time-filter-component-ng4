import { Injectable } from '@angular/core';
import { Moment } from 'moment';
import * as moment from 'moment';
import * as _ from 'lodash';

import { BaseService } from './base.service';
import { ITimeService, IQuickTime, ITimeObject, TimeObject } from '../model/time.model';

@Injectable()
export class TimeService extends BaseService implements ITimeService {
    // Constant variables
    public readonly TIMEGROUP_GLOBAL: string = 'GLOBAL';
    readonly TIME_FILTER_KEY: string = 'GEN_TIME_FILTER_V3';
    readonly QUICK: string = 'quick';
    readonly CUSTOM: string = 'custom';
    readonly DEFAULT_TIME_INDEX: number = 5; // 24 hours/1d index

    // instance variables
    timezoneFormat = 'MM/DD/YYYY h:mm:ss [GMT]Z';
    dateTimeFormat = 'MMM DD, YYYY HH:mm';
    dateTimeFormatMeridian = 'MMM DD, YYYY h:mm A';
    dateTimeFormatMeridianSecs = 'MMM DD, YYYY h:mm:ss A';
    timeFormat = 'h:mm a';
    quickSelect = this.QUICK;
    customSelect = this.CUSTOM;
    timeFilterMap: any = {};
    quickTimeSelectionList: IQuickTime[] = [
        {
            label: '15min',
            start(): Moment {
                return moment().subtract(15, 'm');
            },
            end(): Moment {
                return moment();
            }
        }, {
            label: '30min',
            start(): Moment {
                return moment().subtract(30, 'm');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '1hr',
            start(): Moment {
                return moment().subtract(1, 'h');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '6hr',
            start(): Moment {
                return moment().subtract(6, 'h');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '12hr',
            start(): Moment {
                return moment().subtract(12, 'h');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '1d',
            start(): Moment {
                return moment().subtract(1, 'd');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '1w',
            start(): Moment {
                return moment().subtract(1, 'w');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '2w',
            start(): Moment {
                return moment().subtract(2, 'w');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '1m',
            start(): Moment {
                return moment().subtract(1, 'M');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '3m',
            start(): Moment {
                return moment().subtract(3, 'M');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '6m',
            start(): Moment {
                return moment().subtract(6, 'M');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: '1y',
            start(): Moment {
                return moment().subtract(1, 'y');
            },
            end(): Moment {
                return moment();
            }
        },
        {
            label: 'YTD',
            start(): Moment {
                return moment().startOf('year');
            },
            end(): Moment {
                return moment();
            }
        }
    ];

    constructor() {
        super();
    }

    getDefaultTimeFilter(): ITimeObject {
        let t = this.quickTimeSelectionList[this.DEFAULT_TIME_INDEX];
        let timeFilter = new TimeObject(t.start().valueOf(), t.end().valueOf(), t.label, this.DEFAULT_TIME_INDEX);
        return timeFilter;
    }

    /**
     * Need comments here
     * @param timeGroup
     * @returns {ITimeObject}
     */
    getTimeFilter(timeGroup: string): ITimeObject {
        let timeFilter: ITimeObject = this.timeFilterMap[timeGroup];
        if (!timeFilter) {
            let _timeFilter = sessionStorage.getItem(timeGroup + '_' + this.TIME_FILTER_KEY);
            // if its exist in the session
            if (_timeFilter) {
                let _timeFilterJson = JSON.parse(_timeFilter);
                timeFilter = new TimeObject(
                    _timeFilterJson._startTime, _timeFilterJson._endTime, _timeFilterJson.label, _timeFilterJson.quickSelect
                );

                // if the type of the time is quick select, we need to give the latest
                if (timeFilter.quickSelect > 0) {
                    let t = this.quickTimeSelectionList[timeFilter.quickSelect];
                    timeFilter = new TimeObject(t.start().valueOf(), t.end().valueOf(), t.label, timeFilter.quickSelect);
                }
                this.timeFilterMap[timeGroup] = timeFilter;

            } else {
                // otherwise return the default 24 hours
                let t = this.quickTimeSelectionList[this.DEFAULT_TIME_INDEX];
                timeFilter = new TimeObject(t.start().valueOf(), t.end().valueOf(), t.label, this.DEFAULT_TIME_INDEX);
                // set the time filter
                this.setTimeFilter(timeGroup, timeFilter.startTime, timeFilter.endTime, timeFilter.label, timeFilter.quickSelect);
            }
        }
        return timeFilter;
    }

    /**
     * Need comments here
     * @param timeGroup
     * @param startTime
     * @param endTime
     * @param label
     * @param quickSelect
     */
    setTimeFilter(timeGroup: string, startTime: number, endTime: number, label: string, quickSelect: number): void {
        if (startTime && endTime) {
            let timeFilter: ITimeObject = new TimeObject(startTime, endTime, label, quickSelect);
            sessionStorage.setItem(timeGroup + '_' + this.TIME_FILTER_KEY, JSON.stringify(timeFilter));
            this.timeFilterMap[timeGroup] = timeFilter;
        } else {
            console.log('You need to specify start and end times');
        }
    }

    /**
     * Need comments here
     * @param timeGroup
     * @param timeObject
     */
    setTimeObject(timeGroup: string, timeObject: ITimeObject): void {
        if (timeObject) {
            let timeFilter: ITimeObject = _.cloneDeep(timeObject);
            sessionStorage.setItem(timeGroup + '_' + this.TIME_FILTER_KEY, JSON.stringify(timeFilter));
            this.timeFilterMap[timeGroup] = timeFilter;
        } else {
            console.log('You need to specify start and end times');
        }
    }

    /**
     * Need comments here
     * @param timeFilter
     * @returns {any}
     */
    getTimeFilterUsingConfig(timeFilter: ITimeObject): ITimeObject {
        // if the type of the time is quick select, we need to give the latest
        if (timeFilter.label === this.QUICK) {
            let t = this.quickTimeSelectionList[timeFilter.quickSelect];
            return new TimeObject(t.start().valueOf(), t.end().valueOf(), timeFilter.label, timeFilter.quickSelect);
        }
        return timeFilter;
    }
}
