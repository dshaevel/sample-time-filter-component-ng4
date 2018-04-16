import { TestBed } from '@angular/core/testing';
import * as moment from 'moment';

import { TimeFilterComponent } from './time-filter.component';
import { TimeService } from '../../services/time.service';

describe('Component: TimeFilter', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ TimeFilterComponent ],
      providers: [ TimeService ]
    });
  });

  it('should specify the correct time range', () => {
    let timeRange: any;
    let mockToday = moment('1999-12-31').toDate();
    jasmine.clock().mockDate(mockToday);

    let fixture = TestBed.overrideComponent(TimeFilterComponent, {
      set: {
        template: '<div></div>'
      }
    }).createComponent(TimeFilterComponent);
    let component = fixture.debugElement.componentInstance;
    fixture.detectChanges();

    // index 0 = 15min
    component.quickSelectClickHandler(0);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('15min timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(15, 'minutes'));

    // index 1 = 30min
    component.quickSelectClickHandler(1);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('30min timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(30, 'minutes'));

    // index 2 = 1hr
    component.quickSelectClickHandler(2);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('1hr timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(1, 'hours'));

    // index 3 = 6hr
    component.quickSelectClickHandler(3);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('6hr timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(6, 'hours'));

    // index 4 = 12hr
    component.quickSelectClickHandler(4);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('12hr timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(12, 'hours'));

    // index 5 = 1d
    component.quickSelectClickHandler(5);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('1d timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(1, 'days'));

    // index 6 = 1w
    component.quickSelectClickHandler(6);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('1w timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(1, 'weeks'));

    // index 7 = 2w
    component.quickSelectClickHandler(7);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('2w timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(2, 'weeks'));

    // index 8 = 1m
    component.quickSelectClickHandler(8);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('1m timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(1, 'months'));

    // index 9 = 3m
    component.quickSelectClickHandler(9);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('3m timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(3, 'months'));

    // index 10 = 6m
    component.quickSelectClickHandler(10);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('6m timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(6, 'months'));

    // index 11 = 1y
    component.quickSelectClickHandler(11);
    timeRange = component.setTimeRangeFromQuickSelection();
    // console.log('1y timeRange ==>' + JSON.stringify(timeRange, null, 2) + '<==');
    expect(moment(timeRange.start)).toEqual(moment(timeRange.end).subtract(1, 'years'));
  });
});
