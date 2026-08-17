export function getBillingStartDate(restaurantCreatedAt: Date, adminCreatedAt?: Date | null) {
  if (!adminCreatedAt) return new Date(restaurantCreatedAt);
  return new Date(Math.max(restaurantCreatedAt.getTime(), adminCreatedAt.getTime()));
}

export function getCompletedSubscriptionMonths(startedAt: Date, referenceDate = new Date()) {
  if (referenceDate <= startedAt) return 0;

  let months =
    (referenceDate.getFullYear() - startedAt.getFullYear()) * 12 +
    referenceDate.getMonth() -
    startedAt.getMonth();

  if (referenceDate.getDate() < startedAt.getDate()) months -= 1;
  return Math.max(0, months);
}
