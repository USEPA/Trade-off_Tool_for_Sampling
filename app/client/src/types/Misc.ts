export type ErrorType = {
  error: any;
  message: string;
};

export type LookupFile = {
  status: 'fetching' | 'success' | 'failure';
  data: any;
};
