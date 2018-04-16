/* tslint:disable:no-input-rename */
import {
  Component, EventEmitter, Input, OnInit, Output,
  QueryList, ViewChildren, OnDestroy
} from '@angular/core';
import { BsDropdownDirective, DatePickerComponent } from 'ngx-bootstrap';
import { Moment } from 'moment';
import { Subscription } from 'rxjs/Subscription';
import * as moment from 'moment';
import * as _ from 'lodash';

import { AlertService } from '../../alert/alert.service';
import { Broadcaster } from '../../shared/broadcaster';
import { TimeService } from '../../services/time.service';
import { IQuickTime, ITimeObject } from '../../model/time.model';
import { TsToolbarAction } from '../ts-toolbar/ts-toolbar.component';

@Component({
  selector: 'time-filter-2',
  templateUrl: './time-filter.component.html',
  styleUrls: [
    './time-filter.component.css',
    './time-filter.css'
  ]
})
export class TimeFilterComponent implements OnInit, OnDestroy {
  @Input('time-group') timeGroup: string; // 'global' by default
  @Input('layout') layout: string; // 'responsive' by default
  @Input('show-undo') showUndo: string; // true by default
  @Input('show-zoom-in') showZoomIn: string; // true by default
  @Input('show-zoom-out') showZoomOut: string; // true by default
  @Input('show-zoom-reset') showZoomReset: string; // true by default
  @Input('initial-time-window') initialTimeWindow: any;
  @Input('end-date-disabled') endDateDisabled: boolean; // false by default

  @Output() onApply: EventEmitter<ITimeObject> = new EventEmitter();
  @Output() onInit: EventEmitter<ITimeObject> = new EventEmitter();
  @Output() onCancel: EventEmitter<any> = new EventEmitter();

  @ViewChildren(BsDropdownDirective) dropdowns: QueryList<BsDropdownDirective>;
  @ViewChildren(DatePickerComponent) datePickerComponents: QueryList<DatePickerComponent>;

  isUndo: boolean;
  isZoomIn: boolean;
  isZoomOut: boolean;
  isZoomReset: boolean;

  quickTimeSelectionList: IQuickTime[];
  selectedIndex: number;
  selectedTab: string;
  rightNow: Date;
  endDateMax: Date;

  public startDateTimeString: string;
  public endDateTimeString: string;
  public timeFilterStart: Date; // used by time picker
  public timeFilterEnd: Date; // used by time picker
  public startYear: number; // used by year picker
  public endYear: number; // used by year picker
  public startMonth: string; // used by month picker
  public endMonth: string; // used by month picker
  public startDate: Date; // used by date picker
  public endDate: Date; // used by date picker

  public toggleTimeFilter = false; // false means show; true means hide

  public startDatepicker: DatePickerComponent;
  public endDatepicker: DatePickerComponent;

  public readonly RESPONSIVE: string = 'responsive';
  public readonly EXPANDED: string = 'expanded';
  public readonly COLLAPSED: string = 'collapsed';
  public readonly FORM: string = 'form';

  timeWindowStack: Array<ITimeObject>[] = [];
  toolbarActions: TsToolbarAction[] = [];

  eventClusterTimeChangedSubscription: Subscription;
  headerRefreshSubscription: Subscription;
  stackBarRedirectionSubscription: Subscription;
  toggleTimeFilterSubscription: Subscription;
  userTimeZoomChangedSubscription: Subscription;
  resetTimeFilterSubscription: Subscription;

  constructor(
    private alertService: AlertService,
    private broadcaster: Broadcaster,
    private timeService: TimeService
  ) { }

  ngOnInit() {
    this.timeGroup = this.timeGroup ? this.timeGroup : 'GLOBAL';
    this.layout = this.layout ? this.layout : this.RESPONSIVE;
    this.isUndo = this.showUndo ? this.showUndo === 'true' : true;
    this.isZoomIn = this.showZoomIn ? this.showZoomIn === 'true' : true;
    this.isZoomOut = this.showZoomOut ? this.showZoomOut === 'true' : true;
    this.isZoomReset = this.showZoomReset ? this.showZoomReset === 'true' : true;
    this.initialTimeWindow = this.initialTimeWindow ? this.initialTimeWindow : null;
    this.endDateDisabled = this.endDateDisabled || false;

    this.quickTimeSelectionList = this.timeService.quickTimeSelectionList;

    this.rightNow = new Date();
    this.endDateMax = this.endDateDisabled ? new Date('1900-12-17T00:00:00') : new Date();

    let timeObject: ITimeObject = this.timeGroup === 'GLOBAL' ?
      this.initialTimeWindow ? this.initialTimeWindow : this.timeService.getTimeFilter(this.timeGroup) :
      this.initialTimeWindow ? this.initialTimeWindow : this.timeService.getDefaultTimeFilter();

    this.setTimeRangeFromITimeObject(timeObject, true);
    this.onInit.emit(timeObject);

    if (this.isUndo) {
      let label = 'timefilter.undo';
      this.toolbarActions.push(new TsToolbarAction(label, this.undo.bind(this), 'reply', this.isUndoDisabled.bind(this)));
    }

    if (this.isZoomIn) {
      let label = 'timefilter.zoom_in';
      this.toolbarActions.push(new TsToolbarAction(label, this.zoomIn.bind(this), 'search_plus', function () {
        return false;
      }));
    }

    if (this.isZoomOut) {
      let label = 'timefilter.zoom_out';
      this.toolbarActions.push(new TsToolbarAction(label, this.zoomOut.bind(this), 'search_minus', function () {
        return false;
      }));
    }

    if (this.isZoomReset) {
      let label = 'timefilter.zoom_reset';
      this.toolbarActions.push(new TsToolbarAction(label, this.zoomReset.bind(this), 'restart', this.isZoomResetDisabled.bind(this)));
    }

    /* /////////////LISTENERS START/////////////////////// */

    // when coming from event cluster, this method will be called
    this.eventClusterTimeChangedSubscription = this.broadcaster.on('EVENT_CLUSTER_TIME_CHANGED')
      .subscribe((time: ITimeObject) => {
        let start = moment.unix(time.startTime / 1000);
        let end = moment.unix(time.endTime / 1000);
        this.setCustomTimeRange(start, end, true);
      });

    // See header ctrl for refresh event
    this.headerRefreshSubscription = this.broadcaster.on('HEADER_REFRESH')
      .subscribe((data) => {
        this.refreshRequested(data);
      });

    // this is coming from zoom events of stack bar
    this.userTimeZoomChangedSubscription = this.broadcaster.on(this.timeGroup + '_USER_TIME_ZOOM_CHANGED')
      .subscribe((time: ITimeObject) => {
        this.setTimeRangeFromITimeObject(time);
      });

    this.stackBarRedirectionSubscription = this.broadcaster.on('STACK_BAR_REDIRECTION')
      .subscribe((time: ITimeObject) => {
        this.setTimeRangeFromITimeObject(time);
        this.broadcaster.broadcast('GO_TO_INSIGHTS_WITH_FILTERS_FROM_APP');
      });

    this.toggleTimeFilterSubscription = this.broadcaster.on('toggleTimeFilter')
      .subscribe((hide: boolean) => {
        this.toggleTimeFilter = hide;
      });

    this.resetTimeFilterSubscription = this.broadcaster.on(this.timeGroup + '_RESET')
      .subscribe((time: ITimeObject) => {
        let timeObject1: ITimeObject = this.timeGroup === 'GLOBAL' ?
          this.initialTimeWindow ? this.initialTimeWindow : this.timeService.getTimeFilter(this.timeGroup) :
          this.initialTimeWindow ? this.initialTimeWindow : this.timeService.getDefaultTimeFilter();

        this.setTimeRangeFromITimeObject(timeObject1, true);
      });
    /* /////////////LISTENERS END///////////////////////// */
  }

  ngOnDestroy(): void {
    this.eventClusterTimeChangedSubscription.unsubscribe();
    this.headerRefreshSubscription.unsubscribe();
    this.stackBarRedirectionSubscription.unsubscribe();
    this.toggleTimeFilterSubscription.unsubscribe();
    this.userTimeZoomChangedSubscription.unsubscribe();
    this.resetTimeFilterSubscription.unsubscribe();
  }

  public activeStartDateChange(activeStartDate: Date) {
    this.startYear = moment(activeStartDate).year();
    this.startMonth = moment(activeStartDate).format('MMMM')
  }

  public activeEndDateChange(activeEndDate: Date) {
    this.endYear = moment(activeEndDate).year();
    this.endMonth = moment(activeEndDate).format('MMMM');
  }

  public applyCustomTimeRangeSelection() {
    this.hideDropdowns();

    let startDateTime: Moment = moment(this.startDate).set({
      hours: this.timeFilterStart.getHours(),
      minutes: this.timeFilterStart.getMinutes()
    });

    let endDateTime: Moment = moment(this.endDate).set({
      hours: this.timeFilterEnd.getHours(),
      minutes: this.timeFilterEnd.getMinutes()
    });

    if (!this.validateDates(startDateTime, endDateTime)) {
      return;
    }

    // set selected index to -1 so we know that the user selected a custom range
    this.selectedIndex = -1;
    this.selectedTab = this.timeService.customSelect;
    this.setStartDateTimeString(startDateTime); // set start date time label
    this.setEndDateTimeString(endDateTime); // set end date time label
    this.broadcastFilter(startDateTime.valueOf(), endDateTime.valueOf(), this.timeService.customSelect);

    // reset start and end date variables
    this.timeFilterStart = this.startDate = startDateTime.toDate();
    this.timeFilterEnd = this.endDate = endDateTime.toDate();
  }

  public cancel() {
    this.resetTimeFilter();
    this.hideDropdowns();
    this.onCancel.emit(null);
  }

  public isUndoDisabled(): boolean {
    let stack: Array<ITimeObject> = this.timeWindowStack[this.timeGroup];
    return stack.length < 2;
  }

  public isZoomResetDisabled(): boolean {
    let stack: Array<ITimeObject> = this.timeWindowStack[this.timeGroup];
    if (stack.length < 2) {
      return true;
    }
    let t1: ITimeObject = stack[0];
    let t2: ITimeObject = stack[stack.length - 1];
    return (t1.startTime === t2.startTime && t1.endTime === t2.endTime && t1.quickSelect === t2.quickSelect);
  }

  public moveStartYear(direction: number) {
    this.startDatepicker._datePicker.stepDay = { years: 1 };
    this.startDatepicker._datePicker.move(direction);
  }

  public moveStartMonth(direction: number) {
    this.startDatepicker._datePicker.stepDay = { months: 1 };
    this.startDatepicker._datePicker.move(direction);
  }

  public moveEndYear(direction: number) {
    this.endDatepicker._datePicker.stepDay = { years: 1 };
    this.endDatepicker._datePicker.move(direction);
  }

  public moveEndMonth(direction: number) {
    this.endDatepicker._datePicker.stepDay = { months: 1 };
    this.endDatepicker._datePicker.move(direction);
  }

  public next() {
    let start: Moment = moment(new Date(this.startDateTimeString));
    let end: Moment = moment(new Date(this.endDateTimeString));
    let hours: number = moment.duration(end.diff(start)).asHours();

    start = _.cloneDeep(end);
    end.add(hours, 'h');

    if (!this.validateDates(start, end)) {
      return;
    }

    this.setCustomTimeRange(start, end);
  }

  public previous() {
    let start: Moment = moment(new Date(this.startDateTimeString));
    let end: Moment = moment(new Date(this.endDateTimeString));
    let hours: number = moment.duration(end.diff(start)).asHours();

    end = _.cloneDeep(start);
    start.subtract(hours, 'h');

    this.setCustomTimeRange(start, end);
  }

  public quickSelectClickHandler(index: number) {
    // if user clicks the already selected time filter do nothing
    if (this.selectedIndex === index) {
      return;
    }
    this.selectedIndex = index;
    let selectedVals = this.setTimeRangeFromQuickSelection();
    let label = this.quickTimeSelectionList[index].label;

    // broadcast the selection
    let start = Math.round(selectedVals.start.valueOf() / 1000) * 1000;
    let end = Math.round(selectedVals.end.valueOf() / 1000) * 1000;
    this.broadcastFilter(start, end, label || this.timeService.quickSelect);

    return selectedVals;
  }

  public resetTimeFilter() {
    this.timeFilterStart = this.startDate = new Date(this.startDateTimeString);
    this.startYear = moment(this.startDate).year();
    this.startMonth = moment(this.startDate).format('MMMM');

    this.timeFilterEnd = this.endDate = new Date(this.endDateTimeString);
    this.endYear = moment(this.endDate).year();
    this.endMonth = moment(this.endDate).format('MMMM');

    // initialize the start and end datepicker components
    if (!this.startDatepicker || !this.endDatepicker) {
      this.initializeDatepickerComponents(this.datePickerComponents);
    } else {
      this.startDatepicker._datePicker.select(this.startDate, false);
      this.endDatepicker._datePicker.select(this.endDate, false);
    }
  }

  public setTimeRangeFromQuickSelection() {
    let qts = this.quickTimeSelectionList[this.selectedIndex];
    this.selectedTab = qts.label;

    let start: Moment = qts.start();
    start.milliseconds(0);

    this.setStartDateTimeString(start); // set start date time label
    this.startDate = new Date(start.format(this.timeService.timezoneFormat)); // set date picker
    this.timeFilterStart = new Date(start.format(this.timeService.dateTimeFormat)); // set time picker
    this.startYear = moment(this.startDate).year();
    this.startMonth = moment(this.startDate).format('MMMM');

    let end: Moment = qts.end();
    end.milliseconds(0);

    this.setEndDateTimeString(end); // set end time label
    this.endDate = new Date(end.format(this.timeService.timezoneFormat));
    this.timeFilterEnd = new Date(end.format(this.timeService.dateTimeFormat)); // set end time picker
    this.endYear = moment(this.endDate).year();
    this.endMonth = moment(this.endDate).format('MMMM');

    return { start: start, end: end };
  }

  /**
   * Goes back to the previous time range. This is a nop if the time filter
   * is currently on the initial time range. (UI will disable the button in this case.)
   */
  public undo() {
    let stack: Array<ITimeObject> = this.timeWindowStack[this.timeGroup];

    if (stack.length < 2) {
      return;
    }

    // Pop current time window and discard
    stack.pop();

    // Pop previous time window and set it as the current time window
    // Push it back on the stack.
    // let timeObject: ITimeObject = stack[stack.length - 1];
    let timeObject: ITimeObject = stack.pop();
    this.timeService.setTimeObject(this.timeGroup, timeObject);
    this.setTimeRangeFromITimeObject(timeObject, true);
  }

  /**
   * Zooms in the current time range by 50%. If the current time range was relative, it will
   * be converted to custom first before zooming.
   */
  public zoomIn() {
    let stack: Array<ITimeObject> = this.timeWindowStack[this.timeGroup];
    let timeObject: ITimeObject = stack[stack.length - 1];

    // Convert to custom if it was relative
    if (timeObject.quickSelect !== -1) {
      let end: Moment = moment(new Date(this.endDateTimeString));
      let start: Moment = moment(new Date(this.startDateTimeString));
      this.setCustomTimeRange(start, end, false);
    }

    // Zoom In by 50%
    let end: Moment = moment(new Date(this.endDateTimeString));
    let start: Moment = moment(new Date(this.startDateTimeString));
    let minutes: number = moment.duration(end.diff(start)).asMinutes();

    start.add(Math.round(minutes / 4), 'minutes');
    end.subtract(Math.round(minutes / 4), 'minutes');

    this.setCustomTimeRange(start, end, true);
  }

  /**
   * Zooms out from the current time range by 50%. If the current time range was relative, it will
   * be converted to custom first before zooming.
   */
  public zoomOut() {
    let stack: Array<ITimeObject> = this.timeWindowStack[this.timeGroup];
    let timeObject: ITimeObject = stack[stack.length - 1];

    // Convert to custom if it was relative
    if (timeObject.quickSelect !== -1) {
      let end: Moment = moment(new Date(this.endDateTimeString));
      let start: Moment = moment(new Date(this.startDateTimeString));
      this.setCustomTimeRange(start, end, false);
    }

    // Zoom Out by 50%
    let end: Moment = moment(new Date(this.endDateTimeString));
    let start: Moment = moment(new Date(this.startDateTimeString));
    let minutes: number = moment.duration(end.diff(start)).asMinutes();

    start.subtract(Math.round(minutes / 4), 'minutes');
    end.add(Math.round(minutes / 4), 'minutes');

    // Check if end is in the future. If so, shift the range backwards so that end is now.
    let diffVsNowInMinutes: number = moment.duration(end.diff(Date.now())).asMinutes();

    if (diffVsNowInMinutes > 0) {
      start.subtract(diffVsNowInMinutes, 'minutes');
      end.subtract(diffVsNowInMinutes, 'minutes');
    }

    this.setCustomTimeRange(start, end, true);
  }

  /**
   * Resets the time frame to the original timeframe.
   * Note that undo stack will still be maintained, so you can undo this operation.
   */
  public zoomReset() {
    // Reset back to original timeframe
    let stack: Array<ITimeObject> = this.timeWindowStack[this.timeGroup];
    let timeObject: ITimeObject = stack[0];

    this.setTimeRangeFromITimeObject(timeObject, true);
  }

  // --------------------------------------------------------------------------
  // PRIVATE FUNCTIONS
  // --------------------------------------------------------------------------

  private broadcastFilter(start: number, end: number, label: string) {
    this.timeService.setTimeFilter(this.timeGroup, start, end, label, this.selectedIndex);
    let timeObject: ITimeObject = {
      startTime: start,
      endTime: end,
      label: label,
      quickSelect: this.selectedIndex,
      startTimeInSecs: Math.round(start / 1000),
      endTimeInSecs: Math.round(end / 1000)
    };
    let stack: Array<ITimeObject> = this.timeWindowStack[this.timeGroup];
    if (!stack) {
      stack = [];
      this.timeWindowStack[this.timeGroup] = stack;
    }
    stack.push(_.cloneDeep(timeObject));

    this.onApply.emit(timeObject);

    // broadcast the time filter change
    this.broadcaster.broadcast(this.timeGroup + '_TIME_FILTER_CHANGED', timeObject);
  }

  private hideDropdowns() {
    this.dropdowns.forEach((dropdown) => {
      dropdown.hide();
    });
  }

  private initializeDatepickerComponents(components: QueryList<DatePickerComponent>) {
    if (components.length === 0) {
      setTimeout(() => { this.initializeDatepickerComponents(components); }, 100);
    } else {
      let datepickers = new Array<DatePickerComponent>();
      components.forEach((datePickerComponent) => {
        datepickers.push(datePickerComponent);
      });
      this.startDatepicker = datepickers[0];
      this.endDatepicker = datepickers[1];
    }
  }

  private refreshRequested(data: any) {
    // It is not custom selected
    if (this.selectedIndex !== -1) {
      let selectedValues = this.setTimeRangeFromQuickSelection();

      // update the time before broadcasting
      this.timeService.setTimeFilter(this.timeGroup, selectedValues.start.valueOf(),
        selectedValues.end.valueOf(), this.timeService.quickSelect, this.selectedIndex);
    }
    this.broadcaster.broadcast('REFRESH', data);
  }

  private setCustomTimeRange(start: Moment, end: Moment, broadcast = true) {
    // change the selected tab to custom
    this.selectedIndex = -1;
    this.selectedTab = this.timeService.customSelect;

    // 1-set date labels
    this.setStartDateTimeString(start);
    this.setEndDateTimeString(end);

    // 2-set date picker values
    this.startDate = new Date(start.format(this.timeService.timezoneFormat));
    this.startYear = moment(this.startDate).year();
    this.startMonth = moment(this.startDate).format('MMMM');
    this.endDate = new Date(end.format(this.timeService.timezoneFormat));
    this.endYear = moment(this.endDate).year();
    this.endMonth = moment(this.endDate).format('MMMM');

    // 3-set time picker values
    this.timeFilterStart = new Date(start.valueOf());
    this.timeFilterEnd = new Date(end.valueOf());

    // 4-broadcast the new time selections
    if (broadcast) {
      this.broadcastFilter(start.valueOf(), end.valueOf(), this.timeService.customSelect);
    }
  }

  /**
   * Set the end date time string
   *
   * @param {moment.Moment} date
   */
  private setEndDateTimeString(date: Moment) {
    this.endDateTimeString = date.format(this.timeService.dateTimeFormatMeridian);
  }

  /**
   * Set the start date time string
   *
   * @param {moment.Moment} date
   */
  private setStartDateTimeString(date: Moment) {
    this.startDateTimeString = date.format(this.timeService.dateTimeFormatMeridian);
  }

  /**
   * Sets the time filter to custom time range contained in ITimeObject's start and end fields.
   * Note that other fields in ITimeObject such as label and quickselect are ignored by
   * this function.
   */
  private setTimeRangeFromITimeObject(time: ITimeObject, broadcast = true) {
    if (time.label) {
      if (_.isUndefined(time.quickSelect)) {
        time.quickSelect = -1;
        for (let i = 0; i < this.quickTimeSelectionList.length; i++) {
          let label: string = this.quickTimeSelectionList[i].label;
          if (time.label === label) {
            time.quickSelect = i;
            break;
          }
        }
      }
    } else {
      time.label = null;
      time.quickSelect = -1;
    }

    if (time.quickSelect !== -1) {
      this.setQuickSelectTimeRange(time, broadcast);
    } else {
      let start = moment(time.startTime);
      let end = moment(time.endTime);
      this.setCustomTimeRange(start, end, broadcast);
    }
  }

  private setQuickSelectTimeRange(time: ITimeObject, broadcast = true) {
    if (time.label) {
      this.selectedTab = time.label;
    }
    if (time.quickSelect) {
      this.selectedIndex = time.quickSelect;
    }

    let startDate = moment(time.startTime);
    let endDate = moment(time.endTime);

    this.timeFilterStart = this.startDate = startDate.toDate();
    this.startYear = moment(this.startDate).year();
    this.startMonth = moment(this.startDate).format('MMMM');
    this.timeFilterEnd = this.endDate = endDate.toDate();
    this.endYear = moment(this.endDate).year();
    this.endMonth = moment(this.endDate).format('MMMM');

    this.setStartDateTimeString(startDate);
    this.setEndDateTimeString(endDate);

    if (broadcast) {
      let start = moment(time.startTime);
      let end = moment(time.endTime);
      this.broadcastFilter(start.valueOf(), end.valueOf(), time.label || this.timeService.quickSelect)
    }
  }

  /**
   * Checks if the given start and end dates are valid or not.
   *
   * 1. Start and end date cannot be after today's date
   * 2. End date cannot be before start date
   *
   * @param start
   * @param end
   */
  private validateDates(start: Moment, end: Moment): boolean {
    if (moment().isBefore(end) || moment().isBefore(start)) {
      this.alertService.warning('Start/End date cannot be after today\'s date');
      this.resetTimeFilter();
      return false;
    }

    if (start.isAfter(end)) {
      this.alertService.warning('Start date cannot be after end date');
      this.resetTimeFilter();
      return false;
    }

    if (start.isSame(end, 'minute')) {
      this.alertService.warning('Start date cannot be the same as end date');
      this.resetTimeFilter();
      return false;
    }

    return true;
  }
}
