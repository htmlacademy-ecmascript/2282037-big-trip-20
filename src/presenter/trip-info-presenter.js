import { remove, render, RenderPosition } from '../framework/render.js';
import { sortByDay } from '../utils/point-event-utils.js';
import { UpdateLevel } from '../constants.js';
import TripInfoView from '../view/trip-info-view.js';

export default class TripInfoPresenter {
  #tripInfoBoardContainer = null;

  #pointsModel = null;
  #tripInfoComponent = null;

  constructor(tripInfoBoardContainer, pointsModel) {
    this.#tripInfoBoardContainer = tripInfoBoardContainer;
    this.#pointsModel = pointsModel;

    this.#pointsModel.addObserver(this.#handleModelUpdate);
  }

  init() {
    this.#renderTripInfo();
  }

  #handleModelUpdate = (updateLevel) => {
    if (updateLevel === UpdateLevel.INIT) {
      return;
    }
    this.#clearTripInfo();
    this.#renderTripInfo();
  };

  #renderTripInfo() {
    if (this.#pointsModel.eventPoints.length === 0) {
      return;
    }

    const tripInfo = this.#getTripInfo(this.#pointsModel.eventPoints);
    this.#tripInfoComponent = new TripInfoView(tripInfo);
    render(this.#tripInfoComponent, this.#tripInfoBoardContainer, RenderPosition.AFTERBEGIN);
  }

  #clearTripInfo() {
    remove(this.#tripInfoComponent);
    this.#tripInfoComponent = null;
  }

  #getTripInfo(eventPoints) {
    const sortedPoints = [...eventPoints].sort(sortByDay);

    const startTripDate = sortedPoints[0].dateFrom;
    const endTripDate = sortedPoints[sortedPoints.length - 1].dateTo;

    const citiesList = sortedPoints.map(({ destination }) => destination.name);

    const totalPrice = sortedPoints.reduce((totalBasePrice, { basePrice, offers }) => {
      totalBasePrice += (+basePrice) + offers.reduce((totalOffersPrice, { price, checked }) => {
        if (checked) {
          totalOffersPrice += (+price);
        }
        return totalOffersPrice;
      }, 0);
      return totalBasePrice;
    }, 0);

    return {
      startTripDate,
      endTripDate,
      citiesList,
      totalPrice
    };
  }
}
