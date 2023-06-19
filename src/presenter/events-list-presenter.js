import { remove, render, RenderPosition } from '../framework/render.js';
import { SortType, PointActionType, UpdateLevel, FilterType } from '../constants.js';
import { sortByDay, sortByPrice, sortByTime } from '../utils/point-event-utils.js';
import { filter } from '../utils/filter.js';
import UiBlocker from '../framework/ui-blocker/ui-blocker.js';
import SortView from '../view/sort-view.js';
import EventsListView from '../view/events-list-view.js';
import EmptyListView from '../view/empty-list-view.js';
import EventPointPresenter from './event-point-presenter.js';
import NewPointPresenter from './new-point-presenter.js';
import LoadingView from '../view/loading-view.js';

const TimeLimit = {
  LOWER_LIMIT: 350,
  UPPER_LIMIT: 1000,
};

export default class EventsListPresenter {
  #eventsListBoardContainer = null;

  #pointsModel = null;
  #filtersModel = null;

  #currentSortType = SortType.DAY;

  #destinations = [];
  #offers = [];

  #sortComponent = null;
  #emptyListComponent = null;

  #eventsListComponent = new EventsListView();
  #loadingComponent = new LoadingView();

  #newPointPresenter = null;
  #eventPointPresenters = new Map();

  #isLoading = true;

  #uiBlocker = new UiBlocker(
    {
      lowerLimit: TimeLimit.LOWER_LIMIT,
      upperLimit: TimeLimit.UPPER_LIMIT
    }
  );

  constructor(
    {
      eventsListBoardContainer,
      pointsModel,
      filtersModel,
      onNewPointEditorCancel
    }
  ) {
    this.#eventsListBoardContainer = eventsListBoardContainer;
    this.#pointsModel = pointsModel;
    this.#filtersModel = filtersModel;

    this.#newPointPresenter = new NewPointPresenter(
      {
        onDataChange: this.#handleViewAction,
        restoreEmptyBoard: this.#restoreEmptyBoard,
        onNewPointEditorCancel,
        pointsModel: this.#pointsModel
      }
    );

    this.#pointsModel.addObserver(this.#handleModelUpdate);
    this.#filtersModel.addObserver(this.#handleModelUpdate);
  }

  get filteredPoints() {
    const filterType = this.#filtersModel.filterType;
    const filteredPoints = filter[filterType](this.#pointsModel.eventPoints);

    switch (this.#currentSortType) {
      case SortType.DAY:
        return filteredPoints.sort(sortByDay);
      case SortType.PRICE:
        return filteredPoints.sort(sortByPrice);
      case SortType.TIME:
        return filteredPoints.sort(sortByTime);
    }
    return filteredPoints;
  }

  init() {
    this.#renderBoard();
  }

  createNewPoint() {
    this.#currentSortType = SortType.DAY;
    this.#filtersModel.setFilter(UpdateLevel.MAJOR, FilterType.EVERYTHING);

    if (this.#pointsModel.eventPoints.length === 0) {
      remove(this.#emptyListComponent);
      render(this.#eventsListComponent, this.#eventsListBoardContainer);
    }

    this.#newPointPresenter.init(
      this.#eventsListComponent.element,
      this.#destinations,
      this.#offers
    );
  }

  #renderBoard() {
    if (this.#isLoading) {
      this.#renderLoading();
      return;
    }

    if (this.filteredPoints.length === 0) {
      this.#renderEmptyList(this.#filtersModel.filterType);
      return;
    }

    this.#renderSortComponent();
    this.#renderEventsList();
  }

  #renderLoading() {
    render(this.#loadingComponent, this.#eventsListBoardContainer, RenderPosition.AFTERBEGIN);
  }

  #renderEmptyList(filterType) {
    this.#emptyListComponent = new EmptyListView(filterType);
    render(this.#emptyListComponent, this.#eventsListBoardContainer);
  }

  #renderSortComponent() {
    this.#sortComponent = new SortView(this.#currentSortType, this.#handleSortTypeChange);
    render(this.#sortComponent, this.#eventsListBoardContainer);
  }

  #renderEventsList() {
    render(this.#eventsListComponent, this.#eventsListBoardContainer);
    this.filteredPoints.forEach((eventPoint) => this.#renderEventPoint(eventPoint));
  }

  #renderEventPoint(eventPoint) {
    const eventPointPresenter = new EventPointPresenter(
      this.#eventsListComponent.element,
      this.#handleViewAction,
      this.#handleViewModeChange
    );
    this.#eventPointPresenters.set(eventPoint.id, eventPointPresenter);

    eventPointPresenter.init(eventPoint, this.#destinations, this.#offers);
  }

  #clearBoard(resetSortType = false) {
    this.#newPointPresenter.destroyComponent(false);

    if (this.#eventPointPresenters.size > 0) {
      this.#eventPointPresenters.forEach((presenter) => presenter.destroyPointComponents());
      this.#eventPointPresenters.clear();
    }

    remove(this.#sortComponent);
    remove(this.#loadingComponent);
    remove(this.#emptyListComponent);

    if (resetSortType) {
      this.#currentSortType = SortType.DAY;
    }
  }

  #handleViewModeChange = () => {
    this.#newPointPresenter.destroyComponent(false);
    this.#eventPointPresenters.forEach((presenter) => presenter.resetView());
  };

  #handleViewAction = async (actionType, updateLevel, updatedPoint) => {
    this.#uiBlocker.block();

    switch (actionType) {
      case PointActionType.UPDATE:
        this.#eventPointPresenters.get(updatedPoint.id).setSaving();
        try {
          await this.#pointsModel.updatePoint(updateLevel, updatedPoint);
        } catch (err) {
          this.#eventPointPresenters.get(updatedPoint.id).setAborting();
        }
        break;
      case PointActionType.ADD:
        this.#newPointPresenter.setSaving();
        try {
          await this.#pointsModel.addNewPoint(updateLevel, updatedPoint);
        } catch (err) {
          this.#newPointPresenter.setAborting();
        }
        break;
      case PointActionType.DELETE:
        this.#eventPointPresenters.get(updatedPoint.id).setDeleting();
        try {
          await this.#pointsModel.deletePoint(updateLevel, updatedPoint);
        } catch (err) {
          this.#eventPointPresenters.get(updatedPoint.id).setAborting();
        }
        break;
    }

    this.#uiBlocker.unblock();
  };

  #handleModelUpdate = (updateLevel, updatedPoint) => {
    switch (updateLevel) {
      case UpdateLevel.PATCH:
        this.#eventPointPresenters.get(updatedPoint.id).init(
          updatedPoint,
          this.#destinations,
          this.#offers
        );
        break;
      case UpdateLevel.MINOR:
        this.#clearBoard();
        this.#renderBoard();
        break;
      case UpdateLevel.MAJOR:
        this.#clearBoard(true);
        this.#renderBoard();
        break;
      case UpdateLevel.INIT:
        this.#destinations = [...this.#pointsModel.destinations];
        this.#offers = [...this.#pointsModel.offers];

        this.#isLoading = false;
        remove(this.#loadingComponent);
        this.#renderBoard();
        break;
    }
  };

  #handleSortTypeChange = (sortType) => {
    this.#currentSortType = sortType;
    this.#clearBoard();
    this.#renderBoard();
  };

  #restoreEmptyBoard = () => {
    remove(this.#eventsListComponent);
    this.#renderEmptyList(FilterType.EVERYTHING);
  };
}
