import AbstractView from '../framework/view/abstract-view.js';
import { formatDateTime } from '../utils/point-event-utils.js';
import { collapseAdjacentDuplicates } from '../utils/common.js';
import dayjs from 'dayjs';

const ONLY_DAY_FORMAT = 'D';
const MONTH_DAY_FORMAT = 'MMM D';

function createTripDurationTemplate(startTripDate, endTripDate) {
  const startDate = formatDateTime(startTripDate, 'MMM D');
  let endDate = '';

  if (dayjs(endTripDate).isSame(startTripDate, 'month') && !(dayjs(endTripDate).isSame(startTripDate, 'day'))) {
    endDate = formatDateTime(endTripDate, ONLY_DAY_FORMAT);
  } else if (!dayjs(endTripDate).isSame(startTripDate, 'month')) {
    endDate = formatDateTime(endTripDate, MONTH_DAY_FORMAT);
  }

  return endDate ? `${startDate}&nbsp;&mdash;&nbsp;${endDate}` : startDate;
}


function createTripInfoTemplate(tripInfo) {
  const { startTripDate, endTripDate, citiesList, totalPrice } = tripInfo;
  const MAX_TRIP_LENGTH = 3;

  const filteredCities = collapseAdjacentDuplicates(citiesList);
  return (
    `<section class="trip-main__trip-info  trip-info">
      <div class="trip-info__main">
        <h1 class="trip-info__title">${filteredCities.length > MAX_TRIP_LENGTH ? `${filteredCities[0]} &mdash; ... &mdash; ${filteredCities[filteredCities.length - 1]}` : filteredCities.join(' &mdash; ')}</h1>

        <p class="trip-info__dates">${createTripDurationTemplate(startTripDate, endTripDate)}</p>
      </div>

      <p class="trip-info__cost">
        Total: &euro;&nbsp;<span class="trip-info__cost-value">${totalPrice}</span>
      </p>
    </section>`
  );
}

export default class TripInfoView extends AbstractView {
  #tripInfo = null;

  constructor(tripInfo) {
    super();
    this.#tripInfo = tripInfo;
  }

  get template() {
    return createTripInfoTemplate(this.#tripInfo);
  }
}
