import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(duration);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const TIME = 20;
const formatDateTime = (date, format) => dayjs(date).format(format).toUpperCase();

const getTimeDuration = (startTime, endTime) => {
  const timeDifference = dayjs.duration(dayjs(endTime).second(TIME).diff(dayjs(startTime).second(TIME)));
  return timeDifference.format(`${timeDifference.days() === 0 ? '' : 'DD[D] '}${timeDifference.days() === 0 && timeDifference.hours() === 0 ? '' : 'HH[H] '}mm[M]`);
};

const isPastEvent = (startTime, endTime) => (startTime && endTime) && (dayjs().isAfter(dayjs(endTime), 'minute'));

const isPresentEvent = (startTime, endTime) => (startTime && endTime) && (dayjs().isSameOrAfter(dayjs(startTime), 'minute')) && (dayjs().isSameOrBefore(dayjs(endTime), 'minute'));

const isFutureEvent = (startTime, endTime) => (startTime && endTime) && (dayjs().isBefore(dayjs(startTime), 'minute'));

const sortByDay = (pointA, pointB) => dayjs(pointA.dateFrom).diff(dayjs(pointB.dateFrom), 'minute');

const sortByPrice = (pointA, pointB) => pointB.basePrice - pointA.basePrice;

const sortByTime = (pointA, pointB) => {
  const durationPointA = dayjs.duration(dayjs(pointA.dateTo).second(TIME).diff(dayjs(pointA.dateFrom).second(TIME))).asMinutes();
  const durationPointB = dayjs.duration(dayjs(pointB.dateTo).second(TIME).diff(dayjs(pointB.dateFrom).second(TIME))).asMinutes();

  return durationPointB - durationPointA;
};

const areDatesEqual = (dateA, dateB) => (dateA === null && dateB === null) || dayjs(dateA).isSame(dateB, 'm');

export { formatDateTime, getTimeDuration, isPastEvent, isPresentEvent, isFutureEvent, sortByDay, sortByPrice, sortByTime, areDatesEqual };
