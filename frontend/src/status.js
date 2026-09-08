export const STATUSES = [
  'APPLIED', 'ONLINE_ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN',
];

export const COLOR = {
  APPLIED: 'var(--s-applied)',
  ONLINE_ASSESSMENT: 'var(--s-assessment)',
  INTERVIEW: 'var(--s-interview)',
  OFFER: 'var(--s-offer)',
  REJECTED: 'var(--s-rejected)',
  WITHDRAWN: 'var(--s-withdrawn)',
};

export const label = (s) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
