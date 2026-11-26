export const REIMBURSEMENT_TYPE_LABELS = {
  TRAVEL: 'Travel',
  MEAL: 'Meal',
  MEDICAL: 'Medical',
  OTHER: 'Other',
};

export const formatReimbursementExpenseType = (value) => {
  if (!value) return '-';
  const key = String(value).toUpperCase();
  return REIMBURSEMENT_TYPE_LABELS[key] || value;
};
